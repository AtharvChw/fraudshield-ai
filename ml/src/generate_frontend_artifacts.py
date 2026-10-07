"""Generate frontend-ready JSON artifacts."""
import json
import pandas as pd


def write_json(path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, indent=2))


def generate_all(paths: dict, model_name: str, threshold: float, metrics: dict,
                  comparison: list, dashboard: dict, threshold_rows: list,
                  feature_order: list, demo_df: pd.DataFrame):
    write_json(paths["model_metrics"], {"modelName": model_name, "threshold": threshold, **{k: metrics[k] for k in ["precision", "recall", "f1", "roc_auc", "pr_auc"]}})
    write_json(paths["model_comparison"], comparison)
    write_json(paths["dashboard"], dashboard)
    write_json(paths["roc_curve"], metrics["roc_curve"])
    write_json(paths["pr_curve"], metrics["pr_curve"])
    write_json(paths["threshold"], {"selected": threshold, "curve": threshold_rows})
    write_json(paths["confusion"], {"matrix": metrics["confusion_matrix"]})
    write_json(paths["features"], {"features": feature_order, "target": "Class"})
    # demo transactions: guarantee >=1 fraud + >=1 legit (head(8) of a
    # 0.17% fraud sample usually contains no fraud otherwise)
    fraud_rows = demo_df[demo_df["Class"] == 1].head(2)
    legit_rows = demo_df[demo_df["Class"] == 0].head(6)
    demo_pick = fraud_rows.iloc[:1]._append(legit_rows.iloc[:1])._append(
        fraud_rows.iloc[1:])._append(legit_rows.iloc[1:])
    demos = []
    for _, r in demo_pick.iterrows():
        demos.append({c: float(r[c]) for c in feature_order} | {"label": int(r["Class"])})
    write_json(paths["demo"], demos)
