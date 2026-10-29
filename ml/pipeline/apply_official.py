"""
Apply official district data on top of the simulated outputs.

Run AFTER ml/pipeline/vulnerability.py (which regenerates the simulated files):
    python ml/pipeline/apply_official.py

Reads:   data/processed/district_official.csv      NISR EICV7 district decks (poverty, services, livelihoods)
         data/processed/district_finscope.csv      FinScope 2024 Figure 13 (financial access by district). Optional.
         data/processed/district_estimates.csv     modelled or already merged
         data/processed/district_vulnerability.csv simulated or already merged
Writes:  the same two CSVs plus frontend/public/insights/district_vulnerability.json
         and ml/artifacts/district_vulnerability.json

Safe to run repeatedly: modelled values are preserved in *_modelled columns.
"""
import json
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
PROC = ROOT / "data" / "processed"
OFFICIAL = PROC / "district_official.csv"
FINSCOPE = PROC / "district_finscope.csv"
EST = PROC / "district_estimates.csv"
VUL = PROC / "district_vulnerability.csv"
OUT_JSON = [
    ROOT / "frontend" / "public" / "insights" / "district_vulnerability.json",
    ROOT / "ml" / "artifacts" / "district_vulnerability.json",
]

NATIONAL_POVERTY = 27.4       # EICV7 2023/24, percent
FORMAL_INCLUSION_CUT = 90     # FinScope 2024 national formal inclusion is 92%; flag districts below 90
ACCESS_COLS = ["improved_water_pct", "improved_sanitation_pct", "electricity_pct", "mobile_phone_pct"]
SOURCE = "Official NISR figure"
THRESHOLDS = {"low": 0.33, "high": 0.66, "near": 0.15, "fragile": 0.5}
NOTE = "Screening proxy from one snapshot of synthetic data. Not a forecast."
POVERTY_NOTE = ("District poverty rates and rank_official are official NISR EICV7 (2023/24) figures. "
                "Financial access is FinScope 2024. vulnerability_index and rank_simulated come from synthetic households.")

FS_COLS = ["banked_pct", "other_formal_pct", "informal_only_pct", "excluded_pct",
           "financial_access_rate", "access_source", "double_exclusion"]
# columns this script adds; dropped first so reruns never create duplicates
ADDED = ["poverty_eicv7", "poverty_eicv5", "poverty_change_points", "rank_official", "rank_gap",
         "access_index", "high_poverty_low_access", "poverty_rate_source"] + FS_COLS


def official_table() -> pd.DataFrame:
    o = pd.read_csv(OFFICIAL, encoding="utf-8")
    if len(o) != 30 or o.district_code.duplicated().any():
        raise SystemExit("district_official.csv must have 30 unique districts")
    o["access_index"] = o[ACCESS_COLS].mean(axis=1).round(1)
    cut = o.access_index.quantile(1 / 3)
    o["high_poverty_low_access"] = (o.poverty_eicv7 > NATIONAL_POVERTY) & (o.access_index <= cut)
    o["rank_official"] = o.poverty_eicv7.rank(ascending=False, method="min").astype(int)

    if FINSCOPE.exists():
        f = pd.read_csv(FINSCOPE, encoding="utf-8")
        if len(f) != 30 or f.district_code.duplicated().any():
            raise SystemExit("district_finscope.csv must have 30 unique districts")
        o = o.merge(f[["district_code", "banked_pct", "other_formal_pct", "informal_only_pct",
                       "excluded_pct", "financial_access_rate", "access_source"]],
                    on="district_code", how="left", validate="1:1")
        if o.financial_access_rate.isna().any():
            raise SystemExit("some districts missing from district_finscope.csv")
        # poor AND below the formal-inclusion cut-off
        o["double_exclusion"] = (o.poverty_eicv7 > NATIONAL_POVERTY) & (o.financial_access_rate < FORMAL_INCLUSION_CUT)
    return o


def main() -> None:
    o = official_table()
    has_fs = "financial_access_rate" in o.columns
    fs = FS_COLS if has_fs else []
    extra = [c for c in o.columns if c.endswith("_pct") and c not in FS_COLS or "depend" in c]

    # ---- estimates
    e = pd.read_csv(EST, encoding="utf-8")
    if "poverty_rate_modelled" not in e.columns:
        e["poverty_rate_modelled"] = e["poverty_rate_est"]
    e = e.drop(columns=[c for c in ADDED + extra if c in e.columns])
    keep = ["poverty_eicv5", "poverty_change_points", "rank_official", "access_index",
            "high_poverty_low_access"] + extra + fs
    e = e.merge(o[["district_code", "poverty_eicv7"] + keep], on="district_code", how="left", validate="1:1")
    if e.poverty_eicv7.isna().any():
        raise SystemExit("some districts missing from district_official.csv")
    e["poverty_rate_est"] = e.poverty_eicv7.round(1)
    e["poverty_rate_source"] = SOURCE
    e = e.drop(columns=["poverty_eicv7"])
    e.to_csv(EST, index=False, encoding="utf-8")

    # ---- vulnerability
    v = pd.read_csv(VUL, encoding="utf-8")
    if "rank_simulated" not in v.columns:
        v = v.rename(columns={"rank": "rank_simulated"})
    if "poverty_rate_modelled" not in v.columns:
        v["poverty_rate_modelled"] = v["poverty_rate_est"]
    v = v.drop(columns=[c for c in ADDED if c in v.columns])
    vcols = ["poverty_eicv7", "rank_official", "access_index", "high_poverty_low_access"] + \
            [c for c in fs if c != "access_source"] + (["access_source"] if has_fs else [])
    v = v.merge(o[["district_code"] + vcols], on="district_code", how="left", validate="1:1")
    v["poverty_rate_est"] = v.poverty_eicv7.round(1)
    v["poverty_rate_source"] = SOURCE
    v["rank_gap"] = v.rank_simulated - v.rank_official
    v = v.drop(columns=["poverty_eicv7"]).sort_values("rank_official")
    v.to_csv(VUL, index=False, encoding="utf-8")

    # ---- JSON for the frontend: `rank` now means official rank
    j = v.copy()
    j["rank"] = j["rank_official"]
    for b in ("high_poverty_low_access", "double_exclusion"):
        if b in j.columns:
            j[b] = j[b].astype(bool)
    records = json.loads(j.round(4).to_json(orient="records"))
    payload = {"note": NOTE, "poverty_note": POVERTY_NOTE, "thresholds": THRESHOLDS, "districts": records}
    for path in OUT_JSON:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    n_de = int(o.double_exclusion.sum()) if has_fs else 0
    print(f"Applied official data to {len(records)} districts"
          + (f" (FinScope merged, {n_de} flagged double exclusion)" if has_fs else " (no FinScope file found)"))


if __name__ == "__main__":
    main()