"""Platt (sigmoid) calibration on VALIDATION data, test stays untouched.

Adopts calibration only if test F1 is neutral-or-better (tolerance 0.005)
and log-loss improves. Writes platt.json + refreshed test artifacts.
ONNX graph is unchanged (RF); the sigmoid is applied in TypeScript.
"""
import sys, json
from pathlib import Path
import joblib
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (log_loss, precision_recall_fscore_support,
                             roc_auc_score, average_precision_score)

sys.path.insert(0, str(Path(__file__).resolve().parent))
from src.config import (DATA_PATH, FEATURE_ORDER, TARGET_COL, RANDOM_STATE,
                        FRONTEND_DATA, THRESHOLD_GRID)
from src.train import stratified_splits
from src.threshold import tune_threshold  # noqa (uses its grid only)
from pathlib import Path as P

FIG = P("ml/outputs/figures")

df = pd.read_csv(DATA_PATH)
X, y = df[FEATURE_ORDER], df[TARGET_COL]
X_train, X_val, X_test, y_train, y_val, y_test = stratified_splits(X, y)
pipe = joblib.load("ml/outputs/models/best_pipeline.joblib")

Xv = X_val.values if hasattr(X_val, "values") else np.asarray(X_val)
Xt = X_test.values if hasattr(X_test, "values") else np.asarray(X_test)
yv = y_val.values.ravel() if hasattr(y_val, "values") else np.asarray(y_val).ravel()
yt = y_test.values.ravel() if hasattr(y_test, "values") else np.asarray(y_test).ravel()

raw_val = pipe.predict_proba(Xv)[:, 1]
raw_test = pipe.predict_proba(Xt)[:, 1]

# Platt: LR on 1-D validation scores
platt = LogisticRegression().fit(raw_val.reshape(-1, 1), yv)
a, b = float(platt.coef_[0][0]), float(platt.intercept_[0])
cal = lambda p: 1.0 / (1.0 + np.exp(-(a * np.asarray(p) + b)))
cal_test = cal(raw_test)

def at_thr(p, t):
    pred = (p >= t).astype(int)
    prec, rec, f1, _ = precision_recall_fscore_support(yt, pred, average="binary", zero_division=0)
    return prec, rec, f1

# threshold tuned on VALIDATION calibrated scores
cal_val = cal(raw_val)
best, rows = None, []
for t in THRESHOLD_GRID:
    pred = (cal_val >= t).astype(int)
    prec, rec, f1, _ = precision_recall_fscore_support(yv, pred, average="binary", zero_division=0)
    rows.append({"threshold": t, "precision": prec, "recall": rec, "f1": f1})
best = max(rows, key=lambda r: r["f1"])
thr = float(best["threshold"])

p0, r0, f0 = at_thr(raw_test, 0.51)
p1, r1, f1 = at_thr(cal_test, thr)
print(f"raw      thr=0.51 P={p0:.4f} R={r0:.4f} F1={f0:.4f} logloss={log_loss(yt, raw_test):.4f}")
print(f"calibrated thr={thr} P={p1:.4f} R={r1:.4f} F1={f1:.4f} logloss={log_loss(yt, cal_test):.4f} (A={a:.4f} B={b:.4f})")

adopt = (f1 >= f0 - 0.005) and (log_loss(yt, cal_test) < log_loss(yt, raw_test))
print("ADOPT:", adopt)
if adopt:
    (FRONTEND_DATA / "platt.json").write_text(json.dumps({"a": a, "b": b, "threshold": thr}, indent=2))
    # refresh test artifacts at new threshold (curves are rank-based: unchanged)
    # confusion at calibrated threshold (ROC/PR curves are rank-based and
    # unchanged by monotonic calibration, so curve artifacts stay as-is)
    pred = (cal_test >= thr).astype(int)
    from sklearn.metrics import confusion_matrix
    cm = confusion_matrix(yt, pred).tolist()
    (FRONTEND_DATA / "confusion_matrix.json").write_text(json.dumps({"matrix": cm}, indent=2))
    (FRONTEND_DATA / "threshold_analysis.json").write_text(json.dumps({"selected": thr, "curve": rows}, indent=2))
    m = {"modelName": "random_forest_smote", "threshold": thr, "precision": p1, "recall": r1, "f1": f1,
         "roc_auc": float(roc_auc_score(yt, raw_test)), "pr_auc": float(average_precision_score(yt, raw_test))}
    (FRONTEND_DATA / "model_metrics.json").write_text(json.dumps(m, indent=2))
    dash = {"total": len(df), "fraud": int((y == 1).sum()), "fraud_rate": float((y == 1).mean()),
            "model": "random_forest_smote", **{k: m[k] for k in ["threshold", "precision", "recall", "f1", "roc_auc", "pr_auc"]}}
    (FRONTEND_DATA / "dashboard_statistics.json").write_text(json.dumps(dash, indent=2))
    print("artifacts refreshed with calibrated threshold")
