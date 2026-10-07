"""ONNX export + parity validation."""
import numpy as np
from skl2onnx import convert_sklearn
from skl2onnx.common.data_types import FloatTensorType


def export_onnx(pipe, n_features: int, out_path):
    initial = [("input", FloatTensorType([None, n_features]))]
    onx = convert_sklearn(pipe, initial_types=initial, options={"zipmap": False})
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "wb") as f:
        f.write(onx.SerializeToString())
    return out_path


def parity_check(pipe, out_path, X_sample: np.ndarray, tol: float = 1e-4):
    import onnxruntime as ort
    sess = ort.InferenceSession(str(out_path))
    py_proba = pipe.predict_proba(X_sample)[:, 1]
    # zipmap=False yields outputs [label, probabilities]; scan all outputs
    # for the 2-column probability matrix instead of assuming order.
    onnx_proba = None
    for meta in sess.get_outputs():
        arr = np.array(sess.run([meta.name], {"input": X_sample.astype(np.float32)})[0])
        if arr.ndim == 2 and arr.shape[1] == 2:
            onnx_proba = arr[:, 1]
            break
    if onnx_proba is None:  # fallback: single probability/logit vector
        arr = np.array(sess.run(None, {"input": X_sample.astype(np.float32)})[0])
        onnx_proba = arr.ravel()
        if onnx_proba.max() > 1 or onnx_proba.min() < 0:
            onnx_proba = 1 / (1 + np.exp(-onnx_proba))
    diff = float(np.max(np.abs(py_proba - onnx_proba)))
    if diff > tol:
        raise RuntimeError(f"ONNX parity failed: max diff {diff} > tol {tol}")
    return diff
