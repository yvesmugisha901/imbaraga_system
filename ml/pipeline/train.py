"""Train the Imbaraga poverty-risk models and write artifacts.

Baseline: Logistic Regression (scaled, class_weight='balanced')
Primary:  XGBoost (scale_pos_weight, small randomized search)

Evaluation: stratified 80/20 split on (label, district), plus GroupKFold by
district to check generalisation to districts the model has not seen.

THE DATA IS SYNTHETIC (see generate_synthetic.py). Metrics are labelled as
such in metrics.json and must never be presented as real-world accuracy.

Usage:  python ml/pipeline/train.py
Outputs (ml/artifacts/): model.joblib, baseline.joblib, feature_schema.json, metrics.json
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import sklearn
import xgboost
from sklearn.base import clone
from sklearn.compose import ColumnTransformer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (accuracy_score, average_precision_score, confusion_matrix, f1_score,
                             precision_score, recall_score, roc_auc_score, roc_curve)
from sklearn.model_selection import GroupKFold, RandomizedSearchCV, cross_val_score, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, OrdinalEncoder, StandardScaler
from xgboost import XGBClassifier

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data/synthetic/synthetic_train.csv"
ART = ROOT / "ml/artifacts"
SEED = 42

EDU_LEVELS = ["none_or_below_primary", "primary", "lower_secondary", "upper_secondary", "university"]
NUMERIC = ["household_size", "dependency_ratio", "head_age", "ubudehe_category", "income_sources_count",
           "land_size_ha", "asset_index", "has_electricity", "improved_water", "has_mobile_money",
           "has_savings", "has_credit", "district_urban_pct"]
ORDINAL = ["head_education_level"]
CATEGORICAL = ["head_sex", "main_income_source"]
FEATURES = NUMERIC + ORDINAL + CATEGORICAL
LABEL = "is_poor"

# Label comes from consumption, so nothing derived from consumption or the label may be a feature.
FORBIDDEN = ("consum", "expend", "food", "poverty", "poor", "income_amount")


def check_no_leakage(features: list[str]) -> None:
    bad = [f for f in features if any(tok in f.lower() for tok in FORBIDDEN)]
    if bad:
        raise ValueError(f"Label-leakage risk, remove these features: {bad}")


def make_preprocessor(scale: bool) -> ColumnTransformer:
    return ColumnTransformer([
        ("num", StandardScaler() if scale else "passthrough", NUMERIC),
        ("edu", OrdinalEncoder(categories=[EDU_LEVELS], handle_unknown="use_encoded_value", unknown_value=-1), ORDINAL),
        ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), CATEGORICAL),
    ])


def metrics_for(model, X, y) -> dict:
    proba = model.predict_proba(X)[:, 1]
    pred = (proba >= 0.5).astype(int)
    tn, fp, fn, tp = confusion_matrix(y, pred).ravel()
    fpr, tpr, _ = roc_curve(y, proba)
    keep = np.unique(np.linspace(0, len(fpr) - 1, 60).astype(int))
    level = np.where(proba < 0.33, "Low", np.where(proba <= 0.66, "Medium", "High"))
    return {
        "accuracy": round(accuracy_score(y, pred), 4),
        "precision_poor": round(precision_score(y, pred), 4),
        "recall_poor": round(recall_score(y, pred), 4),
        "f1_poor": round(f1_score(y, pred), 4),
        "auc": round(roc_auc_score(y, proba), 4),
        "pr_auc": round(average_precision_score(y, proba), 4),
        "confusion_matrix": {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)},
        "roc_points": [{"fpr": round(float(fpr[i]), 4), "tpr": round(float(tpr[i]), 4)} for i in keep],
        "risk_level_counts": {k: int((level == k).sum()) for k in ("Low", "Medium", "High")},
    }


def main() -> None:
    check_no_leakage(FEATURES)
    df = pd.read_csv(DATA, encoding="utf-8")
    X, y = df[FEATURES], df[LABEL]

    strat = y.astype(str) + "_" + df["district_code"]
    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, stratify=strat, random_state=SEED)
    groups_tr = df.loc[X_tr.index, "district_code"]
    print(f"train {len(X_tr)}  test {len(X_te)}  poor share {y.mean():.3f}")

    # ---- baseline ----
    baseline = Pipeline([
        ("prep", make_preprocessor(scale=True)),
        ("model", LogisticRegression(class_weight="balanced", max_iter=2000)),
    ]).fit(X_tr, y_tr)

    # ---- XGBoost with a small randomized search ----
    spw = float((y_tr == 0).sum() / (y_tr == 1).sum())
    xgb_pipe = Pipeline([
        ("prep", make_preprocessor(scale=False)),
        ("model", XGBClassifier(scale_pos_weight=spw, eval_metric="logloss", random_state=SEED, n_jobs=1)),
    ])
    search = RandomizedSearchCV(
        xgb_pipe,
        {
            "model__n_estimators": [150, 300, 450],
            "model__max_depth": [3, 4, 5, 6],
            "model__learning_rate": [0.03, 0.05, 0.1],
            "model__subsample": [0.7, 0.85, 1.0],
            "model__colsample_bytree": [0.7, 0.85, 1.0],
            "model__min_child_weight": [1, 5, 10],
        },
        n_iter=12, scoring="roc_auc", cv=3, random_state=SEED, n_jobs=-1,
    ).fit(X_tr, y_tr)
    xgb_best = search.best_estimator_
    print("best XGBoost params:", {k.replace("model__", ""): v for k, v in search.best_params_.items()})

    # ---- held-out test ----
    results = {"baseline_logreg": metrics_for(baseline, X_te, y_te), "xgboost": metrics_for(xgb_best, X_te, y_te)}

    # ---- generalisation to unseen districts ----
    gkf = GroupKFold(n_splits=5)
    group_cv = {}
    for name, mdl in (("baseline_logreg", baseline), ("xgboost", xgb_best)):
        scores = cross_val_score(clone(mdl), X_tr, y_tr, groups=groups_tr, cv=gkf, scoring="roc_auc")
        group_cv[name] = {"auc_mean": round(float(scores.mean()), 4), "auc_std": round(float(scores.std()), 4),
                          "folds": [round(float(s), 4) for s in scores]}

    for name, m in results.items():
        print(f"{name:16s} acc {m['accuracy']:.3f}  prec {m['precision_poor']:.3f}  rec {m['recall_poor']:.3f}  "
              f"f1 {m['f1_poor']:.3f}  auc {m['auc']:.3f}  pr_auc {m['pr_auc']:.3f}")
    for name, g in group_cv.items():
        print(f"{name:16s} district-grouped CV AUC {g['auc_mean']:.3f} +/- {g['auc_std']:.3f}")

    # ---- artifacts ----
    ART.mkdir(parents=True, exist_ok=True)
    joblib.dump(xgb_best, ART / "model.joblib")
    joblib.dump(baseline, ART / "baseline.joblib")

    schema = {
        "model_version": "v0.1-synthetic",
        "trained_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "data_origin": "synthetic",
        "features": FEATURES,
        "numeric": NUMERIC, "ordinal": {"head_education_level": EDU_LEVELS}, "categorical": CATEGORICAL,
        "categories": {"head_sex": ["F", "M"],
                       "main_income_source": ["farm_wages", "non_farm_wages", "independent_farmer",
                                              "independent_non_farmer", "other"]},
        "label": LABEL,
        "risk_thresholds": {"low_below": 0.33, "high_above": 0.66},
        "excluded_for_leakage": ["consumption", "expenditure", "food spending", "poverty rate aggregates"],
        "versions": {"sklearn": sklearn.__version__, "xgboost": xgboost.__version__, "pandas": pd.__version__},
    }
    (ART / "feature_schema.json").write_text(json.dumps(schema, indent=2), encoding="utf-8")

    out = {
        "data_origin": "synthetic",
        "warning": "Trained and tested on SYNTHETIC data calibrated to published NISR marginals. "
                   "These numbers are not real-world accuracy.",
        "n_train": int(len(X_tr)), "n_test": int(len(X_te)),
        "poor_share": round(float(y.mean()), 4),
        "xgboost_best_params": {k.replace("model__", ""): (v.item() if hasattr(v, "item") else v)
                                for k, v in search.best_params_.items()},
        "test": results,
        "district_grouped_cv": group_cv,
    }
    (ART / "metrics.json").write_text(json.dumps(out, indent=2), encoding="utf-8")
    print("Saved model.joblib, baseline.joblib, feature_schema.json, metrics.json to", ART)


if __name__ == "__main__":
    main()