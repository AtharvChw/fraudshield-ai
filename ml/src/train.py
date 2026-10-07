"""Model training + comparison. Stratified split, leakage-safe.

SMOTE (Strategy B) is applied to the TRAINING array only, BEFORE the
pipeline fit — never inside the exported pipeline, so the ONNX graph stays
a clean (preprocessing + classifier) and convertible.
"""
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import precision_recall_fscore_support, roc_auc_score, average_precision_score
from .preprocess import build_preprocessor
from .config import RANDOM_STATE


def _lazy_ensemble():
    from sklearn.ensemble import RandomForestClassifier, HistGradientBoostingClassifier
    return RandomForestClassifier, HistGradientBoostingClassifier


def stratified_splits(X, y):
    X_temp, X_test, y_temp, y_test = train_test_split(
        X, y, test_size=0.20, stratify=y, random_state=RANDOM_STATE)
    X_train, X_val, y_train, y_val = train_test_split(
        X_temp, y_temp, test_size=0.20, stratify=y_temp, random_state=RANDOM_STATE)
    return (X_train, X_val, X_test, y_train, y_val, y_test)


def candidate_models():
    RandomForestClassifier, HistGradientBoostingClassifier = _lazy_ensemble()
    models = {
        "logistic_regression": LogisticRegression(max_iter=2000, class_weight="balanced", random_state=RANDOM_STATE),
        "random_forest": RandomForestClassifier(n_estimators=200, class_weight="balanced_subsample", n_jobs=-1, random_state=RANDOM_STATE),
        "hist_gradient_boosting": HistGradientBoostingClassifier(max_iter=200, random_state=RANDOM_STATE),
    }
    try:
        import xgboost as xgb  # noqa
        from xgboost import XGBClassifier
        # scale_pos_weight set later dynamically
        models["xgboost"] = XGBClassifier(n_estimators=300, max_depth=6, learning_rate=0.05,
                                          subsample=0.9, colsample_bytree=0.9, eval_metric="logloss",
                                          n_jobs=-1, random_state=RANDOM_STATE)
    except Exception:
        pass
    return models


def _as_numpy(a):
    import pandas as pd
    if isinstance(a, (pd.DataFrame, pd.Series)):
        return a.values
    return np.asarray(a)


def train_and_score(X_train, y_train, X_val, y_val, use_smote=False):
    results = {}
    Xtr = _as_numpy(X_train)
    ytr = _as_numpy(y_train).ravel()
    Xv = _as_numpy(X_val)
    yv = _as_numpy(y_val).ravel()
    if use_smote:
        from imblearn.over_sampling import SMOTE
        Xtr, ytr = SMOTE(random_state=RANDOM_STATE).fit_resample(Xtr, ytr)
    for name, clf in candidate_models().items():
        pipe = Pipeline([("pre", build_preprocessor(scale_time=False)), ("clf", clf)])
        pipe.fit(Xtr, ytr)
        proba = pipe.predict_proba(Xv)[:, 1]
        pred = (proba >= 0.5).astype(int)
        prec, rec, f1, _ = precision_recall_fscore_support(yv, pred, average="binary", zero_division=0)
        try:
            roc = roc_auc_score(yv, proba)
        except Exception:
            roc = 0.0
        try:
            pr = average_precision_score(yv, proba)
        except Exception:
            pr = 0.0
        results[name] = {"pipeline": pipe, "precision": prec, "recall": rec, "f1": f1, "roc_auc": roc, "pr_auc": pr}
    return results
