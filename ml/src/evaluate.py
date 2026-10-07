"""Evaluation on untouched test set + figure generation."""
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from sklearn.metrics import (confusion_matrix, classification_report, precision_recall_fscore_support,
                             roc_auc_score, average_precision_score, roc_curve, precision_recall_curve)


def evaluate(pipe, X_test, y_test, threshold, fig_dir):
    proba = pipe.predict_proba(X_test)[:, 1]
    pred = (proba >= threshold).astype(int)
    prec, rec, f1, _ = precision_recall_fscore_support(y_test, pred, average="binary", zero_division=0)
    roc = float(roc_auc_score(y_test, proba))
    pr = float(average_precision_score(y_test, proba))
    cm = confusion_matrix(y_test, pred).tolist()
    report = classification_report(y_test, pred, output_dict=True, zero_division=0)

    # confusion matrix fig
    plt.figure()
    plt.imshow(np.array(cm), aspect="auto")
    plt.colorbar()
    plt.xticks([0, 1], ["Legit", "Fraud"])
    plt.yticks([0, 1], ["Legit", "Fraud"])
    plt.title("Confusion matrix")
    for (i, j), v in np.ndenumerate(np.array(cm)):
        plt.text(j, i, str(v), ha="center", va="center")
    plt.tight_layout()
    plt.savefig(fig_dir / "confusion_matrix.png")
    plt.close()

    # ROC
    fpr, tpr, _ = roc_curve(y_test, proba)
    plt.figure()
    plt.plot(fpr, tpr)
    plt.xlabel("FPR")
    plt.ylabel("TPR")
    plt.title("ROC curve")
    plt.tight_layout()
    plt.savefig(fig_dir / "roc_curve.png")
    plt.close()

    # PR
    p, r, _ = precision_recall_curve(y_test, proba)
    plt.figure()
    plt.plot(r, p)
    plt.xlabel("Recall")
    plt.ylabel("Precision")
    plt.title("Precision-Recall curve")
    plt.tight_layout()
    plt.savefig(fig_dir / "pr_curve.png")
    plt.close()

    metrics = {"precision": prec, "recall": rec, "f1": f1, "roc_auc": roc, "pr_auc": pr,
               "confusion_matrix": cm, "report": report,
               "roc_curve": {"fpr": fpr.tolist(), "tpr": tpr.tolist()},
               "pr_curve": {"precision": p.tolist(), "recall": r.tolist()}}
    return metrics
