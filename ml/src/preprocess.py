"""Leakage-safe preprocessing using column INDICES (ONNX-friendly).

Feature order: Time (0), V1..V28 (1..28), Amount (29).
Scaler is fit only on training data via the Pipeline. Integer indices keep
skl2onnx conversion working with a single FloatTensor input, and the scaler
is embedded inside the exported ONNX graph.
"""
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

TIME_IDX = 0
V_IDXS = list(range(1, 29))
AMOUNT_IDX = 29


def build_preprocessor(scale_time: bool = False):
    if scale_time:
        pre = ColumnTransformer([
            ("num", StandardScaler(), [TIME_IDX, AMOUNT_IDX]),
            ("pass", "passthrough", V_IDXS),
        ])
    else:
        pre = ColumnTransformer([
            ("amount", StandardScaler(), [AMOUNT_IDX]),
            ("pass", "passthrough", [TIME_IDX] + V_IDXS),
        ])
    return pre


def build_pipeline(classifier, scale_time: bool = False):
    return Pipeline([("pre", build_preprocessor(scale_time)), ("clf", classifier)])
