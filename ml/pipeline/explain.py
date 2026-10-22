"""
Global feature importance (TreeSHAP via XGBoost) + fairness breakdown.

Reads:  ml/artifacts/model.joblib, ml/artifacts/feature_schema.json,
        data/synthetic/synthetic_train.csv
Writes: ml/artifacts/global_importance.json, ml/artifacts/fairness.json

The held-out split reproduces train.py exactly:
test_size=0.2, random_state=42, stratified on label + "_" + district_code.
"""
import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.model_selection import train_test_split

ROOT = Path(__file__).resolve().parents[2]
ART = ROOT / "ml" / "artifacts"
MODEL_PATH = ART / "model.joblib"
SCHEMA_PATH = ART / "feature_schema.json"
DATA_PATH = ROOT / "data" / "synthetic" / "synthetic_train.csv"

SPLIT_SEED = 42        # same as SEED in train.py
TEST_SIZE = 0.2        # same as train.py
THRESHOLD = 0.5
TOP_N = 15
GROUP_COLS = ["head_sex", "district_code", "province"]  # missing columns are skipped


def safe_div(a, b):
    return float(a / b) if b else None


def group_metrics(y, pred, mask):
    yt, yp = y[mask], pred[mask]
    tp = int(((yt == 1) & (yp == 1)).sum())
    fp = int(((yt == 0) & (yp == 1)).sum())
    fn = int(((yt == 1) & (yp == 0)).sum())
    tn = int(((yt == 0) & (yp == 0)).sum())
    return {
        "n": int(mask.sum()),
        "actual_poverty_rate": safe_div(yt.sum(), len(yt)),
        "predicted_poverty_rate": safe_div(yp.sum(), len(yp)),
        "recall": safe_div(tp, tp + fn),
        "false_positive_rate": safe_div(fp, fp + tn),
        "precision": safe_div(tp, tp + fp),
    }


def get_booster(final):
    if hasattr(final, "get_booster"):
        return final.get_booster()
    if hasattr(final, "calibrated_classifiers_"):  # calibrated wrapper
        return get_booster(final.calibrated_classifiers_[0].estimator)
    raise SystemExit(f"Final model step is {type(final)}, not XGBoost; tell Claude.")


def origin(name, features):
    """Map an encoded column like 'cat__head_sex_F' back to 'head_sex'."""
    base = name.split("__", 1)[-1]
    hits = [f for f in features if base == f or base.startswith(f + "_")]
    return max(hits, key=len) if hits else base


def main():
    schema = json.loads(SCHEMA_PATH.read_text())
    features, label = schema["features"], schema["label"]

    model = joblib.load(MODEL_PATH)
    print("Loaded:", type(model).__name__)

    df = pd.read_csv(DATA_PATH, encoding="utf-8")
    strat = df[label].astype(str) + "_" + df["district_code"]
    _, test = train_test_split(df, test_size=TEST_SIZE, random_state=SPLIT_SEED,
                               stratify=strat)
    print(f"held-out rows: {len(test)}")
    X, y = test[features], test[label].astype(int).to_numpy()

    # Split pipeline into preprocessing + final XGBoost step
    if hasattr(model, "steps"):
        pre, final = model[:-1], model.steps[-1][1]
        Xt = pre.transform(X)
        Xt = Xt.toarray() if hasattr(Xt, "toarray") else np.asarray(Xt)
        names = list(pre.get_feature_names_out())
    else:
        final, Xt, names = model, X.to_numpy(dtype=float), list(features)

    # TreeSHAP; last column is the bias term
    contribs = get_booster(final).predict(
        xgb.DMatrix(Xt.astype(np.float32)), pred_contribs=True, validate_features=False
    )[:, :-1]
    by_feature = pd.DataFrame(contribs, columns=[origin(n, features) for n in names])
    by_feature = by_feature.T.groupby(level=0).sum().T   # sum encoded columns per feature
    mean_abs = by_feature.abs().mean().sort_values(ascending=False)
    total = float(mean_abs.sum()) or 1.0
    importance = [{"feature": f, "mean_abs_shap": float(v), "share": float(v / total)}
                  for f, v in mean_abs.head(TOP_N).items()]
    (ART / "global_importance.json").write_text(json.dumps(importance, indent=2))

    # Fairness on held-out rows
    pred = (model.predict_proba(X)[:, 1] >= THRESHOLD).astype(int)
    fairness = {"threshold": THRESHOLD,
                "overall": group_metrics(y, pred, np.ones(len(y), bool)), "groups": {}}
    for col in GROUP_COLS:
        if col not in test.columns:
            print(f"skip: '{col}' not in data")
            continue
        fairness["groups"][col] = {
            str(v): group_metrics(y, pred, (test[col] == v).to_numpy())
            for v in sorted(test[col].dropna().unique())
        }
    (ART / "fairness.json").write_text(json.dumps(fairness, indent=2))

    print(f"Wrote global_importance.json ({len(importance)}) and fairness.json")
    print("Top 5:", [d["feature"] for d in importance[:5]])


if __name__ == "__main__":
    main()