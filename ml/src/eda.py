"""EDA: statistics + figures for FraudShield AI."""
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import pandas as pd
from pathlib import Path


def run_eda(df: pd.DataFrame, fig_dir: Path) -> dict:
    fig_dir.mkdir(parents=True, exist_ok=True)
    stats = {}
    stats["shape"] = list(df.shape)
    stats["class_counts"] = df["Class"].value_counts().to_dict()
    total = len(df)
    fraud = int((df["Class"] == 1).sum())
    stats["fraud_rate"] = fraud / total if total else 0
    stats["missing"] = int(df.isnull().sum().sum())
    stats["duplicates"] = int(df.duplicated().sum())
    stats["amount_describe"] = df["Amount"].describe().to_dict()
    stats["time_describe"] = df["Time"].describe().to_dict()

    # 1. class distribution
    plt.figure()
    df["Class"].value_counts().plot(kind="bar")
    plt.title("Class distribution (0=legit, 1=fraud)")
    plt.tight_layout()
    plt.savefig(fig_dir / "class_distribution.png")
    plt.close()

    # 2. amount distribution
    plt.figure()
    df["Amount"].hist(bins=50)
    plt.title("Transaction Amount distribution")
    plt.xlabel("Amount")
    plt.tight_layout()
    plt.savefig(fig_dir / "amount_distribution.png")
    plt.close()

    # 3. amount by class (log-friendly)
    plt.figure()
    for cls in [0, 1]:
        subset = df.loc[df["Class"] == cls, "Amount"]
        plt.hist(subset, bins=50, alpha=0.6, label=f"Class {cls}")
    plt.legend()
    plt.title("Amount by class")
    plt.tight_layout()
    plt.savefig(fig_dir / "amount_by_class.png")
    plt.close()

    # 4. time distribution
    plt.figure()
    df["Time"].hist(bins=50)
    plt.title("Transaction Time distribution")
    plt.tight_layout()
    plt.savefig(fig_dir / "time_distribution.png")
    plt.close()

    # 5. correlation heatmap (compact: top corr with Class)
    corr = df.corr(numeric_only=True)["Class"].sort_values(ascending=False)
    stats["top_corr_with_class"] = corr.head(10).to_dict()
    plt.figure(figsize=(10, 8))
    plt.imshow(df[["Time"] + [f"V{i}" for i in range(1, 29)] + ["Amount", "Class"]].corr(numeric_only=True), aspect="auto")
    plt.colorbar()
    plt.title("Correlation heatmap")
    plt.tight_layout()
    plt.savefig(fig_dir / "correlation_heatmap.png")
    plt.close()

    return stats
