"""Regenerate public/data/model_comparison.json with per-model tuned thresholds.

Every model is trained exactly as `ml/run_pipeline.py` does, then its
decision threshold is re-tuned on the validation set (max F1) and evaluated
on the untouched test set at that tuned threshold. This removes the
pre-calibration (0.5 cut-off) vs deployed (0.06 cut-off) discrepancy: the
table now reports honest, comparable per-model numbers, and the deployed
model is flagged.
"""
import json
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from src.config import (DATA_PATH, FRONTEND_DATA, FEATURE_ORDER, TARGET_COL, RANDOM_STATE, THRESHOLD_GRID)
from src.load_data import load_dataset, validate_schema
from src.train import candidate_models, train_and_score
from sklearn.metrics import precision_recall_fscore_support, roc_auc_score, average_precision_score
from sklearn.model_selection import train_test_split

DEPLOYED_MODEL = "random_forest_smote"
PLATT_NOTE = "deployed; Platt-calibrated on validation + re-threshold (see model_metrics.json): F1 0.833"


def tune_threshold_vals(y_val, proba, grid):
    best = None; rows = []
    for t in grid:
        pred = (proba >= t).astype(int)
        prec, rec, f1, _ = precision_recall_fscore_support(y_val, pred, average="binary", zero_division=0)
        rows.append({"threshold": float(t), "precision": float(prec), "recall": float(rec), "f1": float(f1)})
        if best is None or f1 > best["f1"]:
            best = rows[-1]
    return best, rows


def platt_fit(val_scores, y_val):
    from sklearn.linear_model import LogisticRegression
    platt = LogisticRegression().fit(val_scores.reshape(-1, 1), y_val)
    return float(platt.coef_[0][0]), float(platt.intercept_[0])


def platt_apply(a, b, p):
    import numpy as np
    return 1.0 / (1.0 + np.exp(-(a * np.asarray(p) + b)))


def metrics_at_threshold(pipe, X_test, y_test, threshold):
    proba = pipe.predict_proba(X_test)[:, 1]
    pred = (proba >= threshold).astype(int)
    prec, rec, f1, _ = precision_recall_fscore_support(y_test, pred, average="binary", zero_division=0)
    roc = float(roc_auc_score(y_test, proba))
    pr = float(average_precision_score(y_test, proba))
    return {"threshold": round(threshold, 4), "precision": round(prec, 4),
            "recall": round(rec, 4), "f1": round(f1, 4), "roc_auc": round(roc, 4), "pr_auc": round(pr, 4)}


def main():
    df = load_dataset(DATA_PATH)
    validate_schema(df)
    X = df[FEATURE_ORDER]
    y = df[TARGET_COL]
    X_temp, X_test, y_temp, y_test = train_test_split(
        X, y, test_size=0.20, stratify=y, random_state=RANDOM_STATE)
    X_train, X_val, y_train, y_val = train_test_split(
        X_temp, y_temp, test_size=0.20, stratify=y_temp, random_state=RANDOM_STATE)

    rows = []
    for smote in (False, True):
        res = train_and_score(X_train, y_train, X_val, y_val, use_smote=smote)
        tag = "smote" if smote else "weighted"
        for name, info in res.items():
            full = f"{name}_{tag}"
            val_proba = info["pipeline"].predict_proba(X_val)[:, 1]
            test_proba = info["pipeline"].predict_proba(X_test)[:, 1]
            yv = y_val.values.ravel() if hasattr(y_val, "values") else np.asarray(y_val).ravel()
            yt = y_test.values.ravel() if hasattr(y_test, "values") else np.asarray(y_test).ravel()

            if full == DEPLOYED_MODEL:
                # reproduce the deployed setup: Platt fit on validation, then
                # re-threshold on calibrated validation, evaluate calibrated test
                a, b = platt_fit(val_proba, yv)
                cal_val = platt_apply(a, b, val_proba)
                cal_test = platt_apply(a, b, test_proba)
                best_thr, _ = tune_threshold_vals(yv, cal_val, THRESHOLD_GRID)
                thr = float(best_thr["threshold"])
                pred = (cal_test >= thr).astype(int)
                prec, rec, f1, _ = precision_recall_fscore_support(yt, pred, average="binary", zero_division=0)
                rows.append({
                    "model": full,
                    "deployed": True,
                    "calibrated_note": PLATT_NOTE,
                    "threshold": round(thr, 4), "precision": round(prec, 4),
                    "recall": round(rec, 4), "f1": round(f1, 4),
                    "roc_auc": float(roc_auc_score(yt, test_proba)),
                    "pr_auc": float(average_precision_score(yt, test_proba)),
                })
            else:
                best_thr, _ = tune_threshold_vals(yv, val_proba, THRESHOLD_GRID)
                thr = float(best_thr["threshold"])
                m = metrics_at_threshold(info["pipeline"], X_test, y_test, thr)
                rows.append({
                    "model": full,
                    "deployed": False,
                    "calibrated_note": None,
                    **m,
                })

    rows.sort(key=lambda r: r["pr_auc"], reverse=True)
    out = FRONTEND_DATA / "model_comparison.json"
    out.write_text(json.dumps(rows, indent=2))
    print(json.dumps(rows, indent=2))
    print(f"\nwrote {out} ({len(rows)} rows)")


if __name__ == "__main__":
    main()
