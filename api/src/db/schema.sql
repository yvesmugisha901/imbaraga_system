-- Imbaraga schema (SQLite). Aggregated indicators and synthetic households only.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS districts (
  code                    TEXT PRIMARY KEY,          -- slug for now; swap for official code from district_lookup.csv
  name_en                 TEXT NOT NULL UNIQUE,
  name_rw                 TEXT,
  province                TEXT NOT NULL,
  population              INTEGER NOT NULL,          -- RPHC 2022
  density_per_km2         REAL,
  urban_pct               REAL,                      -- RPHC 2022
  poverty_rate            REAL,                      -- % of individuals, EICV7 2024
  poverty_rate_source     TEXT NOT NULL DEFAULT 'province_eicv7',  -- province_eicv7 | microdata | modelled
  financial_access_rate   REAL,                      -- 0-100; NULL until sourced or modelled
  access_source           TEXT NOT NULL DEFAULT 'pending',         -- pending | finscope | modelled
  exclusion_gap           REAL,
  risk_score              REAL,                      -- filled after model/aggregation
  double_exclusion        INTEGER NOT NULL DEFAULT 0 CHECK (double_exclusion IN (0,1))
);

CREATE TABLE IF NOT EXISTS households_demo (
  id                      TEXT PRIMARY KEY,
  district_code           TEXT NOT NULL REFERENCES districts(code),
  household_size          INTEGER,
  dependency_ratio        REAL,
  head_age                INTEGER,
  head_sex                TEXT CHECK (head_sex IN ('M','F')),
  head_education_level    TEXT,
  ubudehe_category        INTEGER CHECK (ubudehe_category BETWEEN 1 AND 4),
  main_income_source      TEXT,
  income_sources_count    INTEGER,
  land_size_ha            REAL,
  asset_index             REAL,
  has_electricity         INTEGER,
  improved_water          INTEGER,
  has_mobile_money        INTEGER,
  has_savings             INTEGER,
  has_credit              INTEGER,
  is_synthetic            INTEGER NOT NULL DEFAULT 1,
  created_at              TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS score_batches (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  row_count     INTEGER NOT NULL,
  model_version TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS scores (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  batch_id      INTEGER NOT NULL REFERENCES score_batches(id) ON DELETE CASCADE,
  household_id  TEXT NOT NULL,
  probability   REAL NOT NULL CHECK (probability BETWEEN 0 AND 1),
  risk_level    TEXT NOT NULL CHECK (risk_level IN ('Low','Medium','High')),
  driver1       TEXT, driver2 TEXT, driver3 TEXT,
  rank          INTEGER
);
CREATE INDEX IF NOT EXISTS idx_scores_batch ON scores(batch_id);

CREATE TABLE IF NOT EXISTS model_metrics (
  model_name TEXT NOT NULL, accuracy REAL, "precision" REAL, recall REAL, f1 REAL, auc REAL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS feature_importance (
  feature TEXT PRIMARY KEY, label_en TEXT, label_rw TEXT, mean_abs_shap REAL
);
