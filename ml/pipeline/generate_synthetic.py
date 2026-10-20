"""Generate SYNTHETIC households calibrated to published NISR figures.

Everything produced here is synthetic. It is calibrated to published marginal
figures (EICV7 2023/24 and RPHC 2022); it is NOT real household data and
metrics measured on it say nothing about real-world accuracy.

Method
------
1. Each district gets a poverty probability: its province's EICV7 rate, shifted
   by the district's urban share. The shift strength comes from the EICV7
   urban vs rural poverty gap, and an intercept per province is solved so the
   population-weighted district rates reproduce the province rate exactly.
2. Each household is placed in a district (probability ~ population) and
   assigned poor / non-poor from its district probability.
3. Each feature is then drawn conditional on poverty status, using the
   poor / non-poor figures in EICV7 where they exist. Features with no
   published split are marked "assumed" in generation_report.json.

Features are drawn independently given poverty status. Real data has richer
correlation and more noise, so models trained on this will look better than
they would on real microdata.

Outputs
-------
data/synthetic/synthetic_train.csv     training set (with label is_poor)
data/synthetic/demo_households.csv     200-row demo upload (no label)
data/synthetic/generation_report.json  source of every feature
data/processed/district_estimates.csv  MODELLED district poverty rates

Usage:  python ml/pipeline/generate_synthetic.py [--n 20000] [--seed 42]
"""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
CAL_PATH = ROOT / "data/processed/calibration_eicv7.json"
AGG_PATH = ROOT / "data/processed/district_aggregates.csv"
SYN_DIR = ROOT / "data/synthetic"
PROC_DIR = ROOT / "data/processed"

EDU_LEVELS = ["none_or_below_primary", "primary", "lower_secondary", "upper_secondary", "university"]
INCOME_SOURCES = ["farm_wages", "non_farm_wages", "independent_farmer", "independent_non_farmer", "other"]

# Share of poor / non-poor individuals by head age band (EICV7 Table 6.1).
AGE_BANDS = [(17, 25), (26, 35), (36, 45), (46, 55), (56, 65), (66, 90)]
AGE_SHARE_POOR = [2.5, 14.5, 34.9, 23.4, 14.7, 10.0]
AGE_SHARE_NONPOOR = [3.8, 21.5, 30.9, 19.4, 13.7, 10.7]
FEMALE_HEAD_POOR, FEMALE_HEAD_NONPOOR = 0.222, 0.193  # EICV7 Table 6.1 shares

DEMO_COLUMNS = [
    "household_id", "district_code", "household_size", "dependency_ratio", "head_age", "head_sex",
    "head_education_level", "ubudehe_category", "main_income_source", "income_sources_count",
    "land_size_ha", "asset_index", "has_electricity", "improved_water", "has_mobile_money",
    "has_savings", "has_credit",
]


def slug(name: str) -> str:
    """Same rule as api/src/db/seed.ts so codes match the database."""
    return re.sub(r"[^a-z]+", "-", name.lower())


def sigmoid(x):
    return 1.0 / (1.0 + np.exp(-x))


def solve_intercept(target: float, weights, urban_frac, beta: float) -> float:
    lo, hi = -12.0, 12.0
    for _ in range(80):
        mid = (lo + hi) / 2
        if np.average(sigmoid(mid + beta * urban_frac), weights=weights) < target:
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2


def build_districts(cal: dict) -> pd.DataFrame:
    agg = pd.read_csv(AGG_PATH, encoding="utf-8")
    agg["district_code"] = agg["district_name_en"].map(slug)
    urban_odds = cal["urban_poverty_2024"] / (100 - cal["urban_poverty_2024"])
    rural_odds = cal["rural_poverty_2024"] / (100 - cal["rural_poverty_2024"])
    beta = float(np.log(urban_odds / rural_odds))  # negative: more urban, lower poverty
    agg["poverty_prob"] = np.nan
    for prov, target in cal["province_poverty_2024"].items():
        m = agg["province"] == prov
        a = solve_intercept(target / 100, agg.loc[m, "population_2022"], agg.loc[m, "urban_pct"] / 100, beta)
        agg.loc[m, "poverty_prob"] = sigmoid(a + beta * agg.loc[m, "urban_pct"] / 100)
    agg.attrs["beta"] = beta
    return agg


def draw_binary(rng, y, p_poor, p_non):
    return (rng.random(len(y)) < np.where(y == 1, p_poor, p_non)).astype(int)


def draw_categorical(rng, y, labels, probs_poor, probs_non):
    out = np.empty(len(y), dtype=object)
    for status, probs in ((1, probs_poor), (0, probs_non)):
        p = np.asarray(probs, dtype=float)
        p = p / p.sum()
        idx = np.where(y == status)[0]
        out[idx] = rng.choice(labels, size=len(idx), p=p)
    return out


def generate(n: int, seed: int, cal: dict, districts: pd.DataFrame) -> pd.DataFrame:
    rng = np.random.default_rng(seed)

    # 1-2. district and poverty status
    w = districts["population_2022"].to_numpy(float)
    d_idx = rng.choice(len(districts), size=n, p=w / w.sum())
    d = districts.iloc[d_idx].reset_index(drop=True)
    y = (rng.random(n) < d["poverty_prob"].to_numpy()).astype(int)

    # 3. features given poverty status
    edu = draw_categorical(
        rng, y, EDU_LEVELS,
        [cal["head_education_share_of_poor"][k] for k in EDU_LEVELS],
        [cal["head_education_share_of_nonpoor"][k] for k in EDU_LEVELS],
    )
    mi = cal["main_income_by_poverty_status_pct_hh"]
    income = draw_categorical(
        rng, y, INCOME_SOURCES,
        [mi["poor"].get(k, 0.0) for k in INCOME_SOURCES],
        [mi["non_poor"].get(k, 0.0) for k in INCOME_SOURCES],
    )

    band = draw_categorical(rng, y, list(range(len(AGE_BANDS))), AGE_SHARE_POOR, AGE_SHARE_NONPOOR).astype(int)
    lo = np.array([AGE_BANDS[b][0] for b in band])
    hi = np.array([AGE_BANDS[b][1] for b in band])
    head_age = rng.integers(lo, hi + 1)
    head_sex = np.where(draw_binary(rng, y, FEMALE_HEAD_POOR, FEMALE_HEAD_NONPOOR) == 1, "F", "M")

    fa = cal["financial_access_by_poverty_status_pct_hh"]
    hs = cal["housing_assets_by_poverty_status_pct_hh"]
    pct = lambda block, key: (block[key]["poor"] / 100, block[key]["non_poor"] / 100)  # noqa: E731
    has_savings = draw_binary(rng, y, *pct(fa, "savings_account"))
    has_mobile_money = draw_binary(rng, y, *pct(fa, "mobile_money_account"))
    has_electricity = draw_binary(rng, y, *pct(hs, "electricity"))
    improved_water = draw_binary(rng, y, *pct(hs, "improved_water"))
    asset_parts = [draw_binary(rng, y, *pct(hs, k)) for k in
                   ("own_tv", "own_radio", "own_bicycle", "modern_floor", "corrugated_iron_roof")]
    asset_index = np.round(np.mean(asset_parts, axis=0), 2)

    # ---- ASSUMED features: no poor/non-poor split in the NISR tables we hold ----
    size = np.clip(1 + rng.poisson(np.where(y == 1, 4.2, 3.2)), 1, 12)
    workers = np.maximum(1, rng.binomial(size, np.where(y == 1, 0.45, 0.52)))
    dependency_ratio = np.round((size - workers) / workers, 2)
    income_count = draw_categorical(rng, y, [1, 2, 3], [0.55, 0.35, 0.10], [0.35, 0.42, 0.23]).astype(int)
    ubudehe = draw_categorical(rng, y, [1, 2, 3, 4], [0.12, 0.38, 0.47, 0.03], [0.05, 0.28, 0.62, 0.05]).astype(int)

    farm = np.isin(income, ["farm_wages", "independent_farmer"])
    land = rng.lognormal(np.where(y == 1, np.log(0.25), np.log(0.40)), 0.9)
    land = np.where(farm, land, land * 0.3)
    land = np.where((~farm) & (rng.random(n) < 0.4), 0.0, land)
    land_size_ha = np.round(np.clip(land, 0, 20), 2)

    has_credit = (rng.random(n) < 0.547).astype(int)  # RHHS 2019/20, national, no split by poverty

    return pd.DataFrame({
        "household_id": [f"HH-{i + 1:05d}" for i in range(n)],
        "district_code": d["district_code"],
        "household_size": size,
        "dependency_ratio": dependency_ratio,
        "head_age": head_age,
        "head_sex": head_sex,
        "head_education_level": edu,
        "ubudehe_category": ubudehe,
        "main_income_source": income,
        "income_sources_count": income_count,
        "land_size_ha": land_size_ha,
        "asset_index": asset_index,
        "has_electricity": has_electricity,
        "improved_water": improved_water,
        "has_mobile_money": has_mobile_money,
        "has_savings": has_savings,
        "has_credit": has_credit,
        "district_urban_pct": d["urban_pct"].to_numpy(),
        "is_poor": y,
    })


REPORT_SOURCES = {
    "district / is_poor": "EICV7 province poverty rates (Table 5.1) + district population and urban share (RPHC 2022); district shift from EICV7 urban vs rural gap. MODELLED at district level.",
    "head_education_level": "EICV7 Table 6.3 (shares of poor and non-poor)",
    "main_income_source": "EICV7 Table 6.9 (poor vs non-poor households)",
    "head_age, head_sex": "EICV7 Table 6.1 (shares of poor and non-poor individuals)",
    "has_savings, has_mobile_money": "EICV7 Table 6.9 memo items (national, by poverty status)",
    "has_electricity, improved_water, asset_index": "EICV7 Tables 6.7 and 6.8 (asset_index = mean of TV, radio, bicycle, modern floor, iron roof)",
    "has_credit": "RHHS 2019/20 national rate 54.7%; same for poor and non-poor (no published split)",
    "household_size, dependency_ratio, income_sources_count, land_size_ha, ubudehe_category": "ASSUMED - not taken from any NISR table we hold; do not cite as NISR statistics",
}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--n", type=int, default=20000)
    ap.add_argument("--seed", type=int, default=42)
    args = ap.parse_args()

    cal = json.loads(CAL_PATH.read_text(encoding="utf-8"))
    districts = build_districts(cal)
    SYN_DIR.mkdir(parents=True, exist_ok=True)

    train = generate(args.n, args.seed, cal, districts)
    train.to_csv(SYN_DIR / "synthetic_train.csv", index=False, encoding="utf-8")

    demo = generate(200, args.seed + 1000, cal, districts)
    demo[DEMO_COLUMNS].to_csv(SYN_DIR / "demo_households.csv", index=False, encoding="utf-8")

    est = districts[["district_code", "district_name_en", "province", "urban_pct", "poverty_prob"]].copy()
    est["poverty_rate_est"] = (est.pop("poverty_prob") * 100).round(1)
    est["poverty_rate_source"] = "modelled"
    est["province_rate_eicv7"] = est["province"].map(cal["province_poverty_2024"])
    est.to_csv(PROC_DIR / "district_estimates.csv", index=False, encoding="utf-8")

    report = {
        "synthetic": True,
        "n_train": args.n, "seed": args.seed,
        "urban_logit_beta": round(districts.attrs["beta"], 4),
        "sources": REPORT_SOURCES,
        "warning": "Synthetic data. Metrics on it do not reflect real-world accuracy.",
    }
    (SYN_DIR / "generation_report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")

    # ---- self-check against the targets ----
    print(f"Wrote {len(train)} training rows and 200 demo rows")
    print(f"urban/rural logit slope: {districts.attrs['beta']:.3f}")
    print("Province poverty: sample vs EICV7 target")
    prov = districts.set_index("district_code")["province"]
    train["province"] = train["district_code"].map(prov)
    for p, t in cal["province_poverty_2024"].items():
        print(f"  {p:12s} sample {train.loc[train.province == p, 'is_poor'].mean() * 100:5.1f}%  target {t}%")
    print(f"National sample poverty: {train['is_poor'].mean() * 100:.1f}% (EICV7: {cal['national_poverty_2024']}%)")
    print(f"District estimate range: {est['poverty_rate_est'].min()}% to {est['poverty_rate_est'].max()}%")
    for edu in EDU_LEVELS:
        m = train["head_education_level"] == edu
        print(f"  poverty by education {edu:24s} {train.loc[m, 'is_poor'].mean() * 100:5.1f}%  target {cal['head_education_poverty_rate'][edu]}%")


if __name__ == "__main__":
    main()