"""Central deterministic configuration for FraudShield AI pipeline."""
from pathlib import Path

RANDOM_STATE = 42
TARGET_COL = "Class"

FEATURE_ORDER = ["Time"] + [f"V{i}" for i in range(1, 29)] + ["Amount"]
EXPECTED_COLUMNS = FEATURE_ORDER + [TARGET_COL]

TEST_SIZE = 0.20
VAL_SIZE = 0.20  # fraction of remaining train split used as validation

THRESHOLD_OBJECTIVE = "f1"  # maximize F1 on validation
THRESHOLD_GRID = [round(x * 0.01, 2) for x in range(5, 96)]

PROJECT_ROOT = Path(__file__).resolve().parents[2]
ML_DIR = PROJECT_ROOT / "ml"
DATA_PATH = ML_DIR / "data" / "creditcard.csv"
OUTPUTS_DIR = ML_DIR / "outputs"
FIG_DIR = OUTPUTS_DIR / "figures"
METRICS_DIR = OUTPUTS_DIR / "metrics"
MODELS_DIR = OUTPUTS_DIR / "models"

FRONTEND_PUBLIC = PROJECT_ROOT / "public"
FRONTEND_DATA = FRONTEND_PUBLIC / "data"
FRONTEND_MODELS = FRONTEND_PUBLIC / "models"

ONNX_PATH = FRONTEND_MODELS / "fraud_model.onnx"
