"""FraudShield AI full pipeline: 10 steps, deterministic, leakage-safe."""
import json
import sys
import pandas as pd
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from src.config import (DATA_PATH, FIG_DIR, METRICS_DIR, MODELS_DIR, FRONTEND_DATA,
                         FRONTEND_MODELS, ONNX_PATH, FEATURE_ORDER, TARGET_COL, RANDOM_STATE)
from src.load_data import load_dataset, validate_schema
from src.eda import run_eda
from src.train import stratified_splits, train_and_score
from src.threshold import tune_threshold
from src.evaluate import evaluate
from src.export_onnx import export_onnx, parity_check
from src.generate_frontend_artifacts import generate_all
import joblib


def main():
    print("[1/10] Loading dataset")
    df = load_dataset(DATA_PATH)
    print("[2/10] Validating schema")
    validate_schema(df)
    X = df[FEATURE_ORDER]
    y = df[TARGET_COL]
    print("[3/10] Creating train/validation/test split")
    X_train, X_val, X_test, y_train, y_val, y_test = stratified_splits(X, y)
    print("[4/10] Training Logistic Regression")
    print("[5/10] Training Random Forest")
    print("[6/10] Training Gradient Boosting")
    # Strategy A: class-weighted; Strategy B: SMOTE on train only (logreg) — compare F1/PR-AUC
    res_a = train_and_score(X_train, y_train, X_val, y_val, use_smote=False)
    res_b = train_and_score(X_train, y_train, X_val, y_val, use_smote=True)
    print("[7/10] Comparing models")
    # pick best by PR-AUC then F1
    all_res = {**{k + "_weighted": v for k, v in res_a.items()}, **{k + "_smote": v for k, v in res_b.items()}}
    best_name = max(all_res, key=lambda k: (all_res[k]["pr_auc"], all_res[k]["f1"]))
    best_pipe = all_res[best_name]["pipeline"]
    comparison = [{"model": k, "precision": v["precision"], "recall": v["recall"], "f1": v["f1"],
                   "roc_auc": v["roc_auc"], "pr_auc": v["pr_auc"]} for k, v in all_res.items()]
    # EDA figures
    run_eda(df, FIG_DIR)
    print("[8/10] Optimizing threshold")
    val_proba = best_pipe.predict_proba(X_val)[:, 1]
    best_thr, rows = tune_threshold(y_val.values, val_proba, FIG_DIR)
    thr = float(best_thr["threshold"])
    print(f"Selected threshold={thr} F1={best_thr['f1']:.3f}")
    metrics = evaluate(best_pipe, X_test, y_test, thr, FIG_DIR)
    print("[9/10] Exporting ONNX")
    joblib.dump(best_pipe, MODELS_DIR / "best_pipeline.joblib")
    export_onnx(best_pipe, len(FEATURE_ORDER), ONNX_PATH)
    parity_check(best_pipe, ONNX_PATH, X_test.values[:20])
    print("[10/10] Generating frontend artifacts")
    dashboard = {"total": len(df), "fraud": int((y == 1).sum()),
                 "fraud_rate": float((y == 1).mean()), "model": best_name,
                 "threshold": thr, **{k: metrics[k] for k in ["precision", "recall", "f1", "roc_auc", "pr_auc"]}}
    paths = {"model_metrics": FRONTEND_DATA / "model_metrics.json",
             "model_comparison": FRONTEND_DATA / "model_comparison.json",
             "dashboard": FRONTEND_DATA / "dashboard_statistics.json",
             "roc_curve": FRONTEND_DATA / "roc_curve.json",
             "pr_curve": FRONTEND_DATA / "pr_curve.json",
             "threshold": FRONTEND_DATA / "threshold_analysis.json",
             "confusion": FRONTEND_DATA / "confusion_matrix.json",
             "features": FRONTEND_DATA / "feature_metadata.json",
             "demo": FRONTEND_DATA / "demo_transactions.json"}
    generate_all(paths, best_name, thr, metrics, comparison, dashboard, rows, FEATURE_ORDER, X_test.join(y_test).sample(50, random_state=RANDOM_STATE))
    (METRICS_DIR / "metrics.json").write_text(json.dumps(dashboard, indent=2))
    print("\nFraudShield AI pipeline completed successfully.")


if __name__ == "__main__":
    main()
