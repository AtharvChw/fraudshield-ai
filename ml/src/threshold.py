"""Threshold tuning on validation set."""
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from sklearn.metrics import precision_recall_fscore_support
from .config import THRESHOLD_GRID


def tune_threshold(y_val, proba, fig_dir):
    rows = []
    for t in THRESHOLD_GRID:
        pred = (proba >= t).astype(int)
        prec, rec, f1, _ = precision_recall_fscore_support(y_val, pred, average="binary", zero_division=0)
        rows.append({"threshold": t, "precision": prec, "recall": rec, "f1": f1})
    best = max(rows, key=lambda r: r["f1"])

    plt.figure()
    xs = [r["threshold"] for r in rows]
    plt.plot(xs, [r["precision"] for r in rows], label="precision")
    plt.plot(xs, [r["recall"] for r in rows], label="recall")
    plt.plot(xs, [r["f1"] for r in rows], label="f1")
    plt.axvline(best["threshold"], linestyle="--")
    plt.legend()
    plt.title("Threshold analysis")
    plt.tight_layout()
    plt.savefig(fig_dir / "threshold_analysis.png")
    plt.close()
    return best, rows
