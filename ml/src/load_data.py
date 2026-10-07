"""Dataset loading + schema validation."""
import pandas as pd
from .config import EXPECTED_COLUMNS, FEATURE_ORDER, TARGET_COL


def load_dataset(path):
    try:
        df = pd.read_csv(path)
    except FileNotFoundError:
        raise FileNotFoundError(
            f"Dataset not found at {path}. Place creditcard.csv in ml/data/ "
            " (see ml/data/README.md for download instructions)."
        )
    return df


def validate_schema(df: pd.DataFrame) -> None:
    missing = [c for c in EXPECTED_COLUMNS if c not in df.columns]
    if missing:
        raise ValueError(f"Missing expected columns: {missing}. Found: {list(df.columns)}")
    # type checks
    for col in EXPECTED_COLUMNS:
        if not pd.api.types.is_numeric_dtype(df[col]):
            raise ValueError(f"Column {col} must be numeric, got {df[col].dtype}")
    if df[TARGET_COL].dropna().isin([0, 1]).all() is False:
        raise ValueError("Target Class must contain only 0/1 values.")
