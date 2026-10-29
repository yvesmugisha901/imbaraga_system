# Imbaraga

**Seeing poverty before the next survey.**

Imbaraga (Kinyarwanda for "strength / power") is a decision-support platform for Rwanda. It shows where poverty and financial exclusion overlap across all 30 districts, and it helps programme officers rank households for support (for example VUP) and export targeting lists in minutes.

> **Decision-support only.** Imbaraga ranks and explains. It does not move money, and it does not collect personal data. A person must confirm every household before any decision is made.

| | |
|---|---|
| **Live app** | https://imbaraga-system.vercel.app |
| **API** | https://imbaraga-system.onrender.com (`/api/health`, `/api/districts`) |
| **Repository** | https://github.com/yvesmugisha901/imbaraga_system |
| **Current release** | `v0.1.0` (pre-release) |
| **Aligned with** | NST2 (poverty reduction and social protection pillar), Vision 2050 |

> The free Render instance sleeps when idle. The first request can take up to about a minute. If the app says "Cannot reach the server", wait and press **Try again**.

---

## Table of contents

1. [The problem](#1-the-problem)
2. [What Imbaraga does](#2-what-imbaraga-does)
3. [Status: what is built and what is planned](#3-status-what-is-built-and-what-is-planned)
4. [Architecture](#4-architecture)
5. [Tech stack](#5-tech-stack)
6. [Repository structure](#6-repository-structure)
7. [Data sources](#7-data-sources)
8. [Getting started (local)](#8-getting-started-local)
9. [Environment variables](#9-environment-variables)
10. [API reference](#10-api-reference)
11. [Database](#11-database)
12. [Frontend](#12-frontend)
13. [Machine learning design](#13-machine-learning-design)
14. [Deployment](#14-deployment)
15. [Git workflow and releases](#15-git-workflow-and-releases)
16. [Testing and quality](#16-testing-and-quality)
17. [Ethics, privacy and fairness](#17-ethics-privacy-and-fairness)
18. [Limitations](#18-limitations)
19. [Roadmap](#19-roadmap)
20. [Troubleshooting](#20-troubleshooting)
21. [Contributing, changelog and licence](#21-contributing-changelog-and-licence)

---

## 1. The problem

Rwanda measures poverty through periodic household surveys (EICV, roughly every 3 to 5 years) and Ubudehe categorisation cycles. Households that fall into poverty between cycles are invisible to the system, so cash transfers, health-insurance subsidies and financial services arrive late or not at all.

| # | Sub-problem | What it means | Imbaraga feature |
|---|---|---|---|
| P1 | Stale targeting | Ubudehe categories and VUP lists do not reflect recent shocks such as job loss, crop failure or illness | Household risk scoring |
| P2 | Double exclusion | Households with no mobile money, savings or credit in high-poverty districts are hit hardest and recover slowest | Poverty × financial-access map |
| P3 | No early warning | Districts react after statistics are published | District dashboard and insights |
| P4 | No transparency in ranking | Officers cannot see why a household is flagged | Plain-language explanations (English and Kinyarwanda) |

## 2. What Imbaraga does

**Target users**

- **Social protection officers** (LODA, MINALOC, NGOs): upload a household list, see who is most at risk, export a ranked list.
- **Policymakers and planners** (district and national): see KPIs and the districts where poverty and financial exclusion overlap.
- **Field and community leaders**: read a simple explanation, in Kinyarwanda, of why a household is flagged.

**The three things to remember**

1. A risk model with honest validation (baseline versus XGBoost, district-aware split).
2. Every score is explainable: the top three drivers in plain language.
3. A live map showing where poverty and financial exclusion overlap ("double exclusion").

**Pages**

| Page | Route | Purpose |
|---|---|---|
| Dashboard | `/` | District map, KPI cards, searchable and paginated district list, sources and limits. Sub-views: **Map**, **All districts**, **Sources** |
| Targeting | `/targeting` | Table of households, scoring, risk badges, reason chips, CSV export |
| Insights | `/insights` | District deep-dive, drivers, model metrics and fairness views |

The interface has an English / Kinyarwanda toggle (`EN` / `RW`).

## 3. Status: what is built and what is planned

Imbaraga is built in stages. This table is the honest picture as of `v0.1.0`.

| Area | Status |
|---|---|
| Official district poverty data for all 30 districts (NISR EICV7 2023/24) | Built, seeded into the database |
| District API (`/api/health`, `/api/districts`, `/api/kpis`) | Built and deployed |
| Dashboard with map, KPIs, tabbed and searchable district list, early-warning alerts | Built and deployed |
| Targeting page with household scoring and explanations | Built, uses a **mock scorer** (`mockScorer`) with a shared `explanations.json` |
| Household risk model (XGBoost + Logistic Regression baseline) | **Planned.** The household model in `v0.1.0` is synthetic |
| Python ML service (FastAPI) | **Planned** |
| Real household data | **Not used.** Households shown in the Targeting page are synthetic |
| Persistent storage of saved scores | Not persistent on the free host (database rebuilt in `/tmp` on every start) |

> `v0.1.0` is published as a **pre-release** because the household model is synthetic. The district figures are official; the household scores are not.

## 4. Architecture

Three tiers. The React frontend talks only to the Express API. Express owns the database, validation and CSV handling, and (once the ML service exists) calls it over REST.

```
┌──────────────────────────────────────────┐
│  React + TypeScript (Vite)               │
│  Dashboard • Targeting • Insights        │
│  EN/RW toggle • district map             │
└──────────────────┬───────────────────────┘
                   │ REST / JSON (HTTPS)
┌──────────────────▼───────────────────────┐
│  Node.js + Express API                   │
│  /api/health /api/districts /api/kpis    │
│  validation (zod) • CSV • caching        │
└─────────┬────────────────────┬───────────┘
          │ SQL                │ REST (planned)
┌─────────▼──────────┐  ┌──────▼─────────────────┐
│ SQLite             │  │ Python ML service      │
│ (better-sqlite3)   │  │ FastAPI • XGBoost      │
│ districts, scores  │  │ SHAP explanations      │
└────────────────────┘  └────────────────────────┘
```

**Request flow for "Score" in the Targeting page**

1. The user uploads a CSV or adds rows; the frontend sends them to the API.
2. Express validates columns and types (zod) and fills defaults.
3. The scorer returns a probability, a risk level and the top three drivers per row. Today this is the mock scorer; later it is the Python service.
4. Express maps driver codes to sentences using the shared `explanations.json` (English and Kinyarwanda) and returns the ranked list.
5. The frontend renders the table and reason chips and enables CSV export.

## 5. Tech stack

| Layer | Technology |
|---|---|
| Frontend | React, TypeScript, Vite |
| API | Node.js, Express 5, TypeScript |
| Validation and parsing | zod, multer (uploads), csv-parse, csv-stringify |
| Security and logging | helmet, cors, morgan |
| Database | SQLite via `better-sqlite3` |
| Tooling | tsx, ESLint, Prettier, GitHub Actions CI |
| Hosting | Vercel (frontend), Render (API) |
| Planned ML | Python, FastAPI, pandas, scikit-learn, XGBoost, SHAP |

See `api/package.json` and `frontend/package.json` for exact versions.

## 6. Repository structure

```
imbaraga_system/
├── README.md
├── CHANGELOG.md
├── CONTRIBUTING.md
├── .github/                      CI workflow, pull request template
├── data/
│   └── processed/
│       ├── district_aggregates.csv
│       └── district_estimates.csv   official EICV7 district figures
├── api/                          Node + Express + TypeScript
│   ├── package.json
│   └── src/
│       ├── index.ts              server entry
│       ├── routes/               districts.ts and other routes
│       ├── services/             mockScorer.ts, explanations.ts
│       ├── db/                   schema.sql, seed.ts, connection
│       └── shared/
│           └── explanations.json  driver sentences (EN/RW)
└── frontend/                     React + Vite
    ├── vercel.json               single-page-app rewrite
    ├── public/
    │   └── rwanda_districts.geojson
    └── src/
        ├── api/                  client.ts, hooks.ts
        └── components/dashboard/
```

## 7. Data sources

| Source | Used for |
|---|---|
| NISR **EICV7 2023/24** | Official district poverty rate |
| **FinScope 2024** | Financial inclusion context |
| **RPHC 2022** (Population and Housing Census) | District population |
| **geoBoundaries** (CC BY 4.0) | District boundaries (`rwanda_districts.geojson`) |

Rules for the data:

- Cite numbers exactly from the published reports. Do not use remembered figures.
- District estimates are loaded from `data/processed/*.csv` into SQLite by `npm run seed`. On a successful run the log shows `Applied 30 district poverty estimates (30 official_eicv7)` and `Seeded 30 districts`.
- Household rows are **synthetic** and anonymised. No real household registry is used.

## 8. Getting started (local)

**Requirements:** Node.js 22 LTS or newer, npm, Git. (Python 3.11 will be needed once the ML service is added.)

```bash
git clone https://github.com/yvesmugisha901/imbaraga_system.git
cd imbaraga_system
```

**API**

```bash
cd api
npm install
cp .env.example .env        # Windows: copy .env.example .env
npm run seed                # creates the SQLite database and loads 30 districts
npm run dev                 # http://localhost:4000
```

Check it: open `http://localhost:4000/api/health`, then `http://localhost:4000/api/districts` (30 districts).

**Frontend** (in a second terminal)

```bash
cd frontend
npm install
npm run dev                 # Vite, usually http://localhost:5173
```

With no `VITE_API_URL` set, the frontend uses `http://localhost:4000` and adds `/api` itself.

**API scripts**

| Script | What it does |
|---|---|
| `npm run dev` | Run with `tsx watch` (reloads on change) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled server (`node dist/index.js`) |
| `npm run seed` | Create the schema and load the official district data |
| `npm run lint` | ESLint on `src` |
| `npm run format` | Prettier on `src` |

> The seed uses `tsx`, so it runs from TypeScript source. The compiled server in `dist/` also reads `dist/shared/explanations.json`, which `tsc` does not copy. See [Deployment](#14-deployment).

## 9. Environment variables

Names only. Never commit real values. Keep `.env.example` in sync with this table.

**API (`api/.env`)**

| Variable | Example | Purpose |
|---|---|---|
| `DATABASE_URL` | `./data/imbaraga.db` locally, `/tmp/imbaraga.db` on Render | SQLite file path |
| `CORS_ORIGIN` | `https://imbaraga-system.vercel.app` | The **one** origin the API accepts. Exact match, **no trailing slash**, no path |
| `PORT` | `4000` | Local only. Do **not** set on Render; it provides its own |
| `ML_SERVICE_URL` | `http://localhost:8000` | Planned: Python ML service |

**Frontend (Vercel environment variables)**

| Variable | Example | Purpose |
|---|---|---|
| `VITE_API_URL` | `https://imbaraga-system.onrender.com` | API base URL. **No trailing slash and no `/api`.** Baked in at build time |

## 10. API reference

Base path: `/api`. Responses are JSON. Failures return `{ "error": { "code", "message" } }` where implemented.

**Available in v0.1.0**

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Health check |
| GET | `/api/districts` | All 30 districts with poverty rate and indicators |
| GET | `/api/kpis` | National KPI cards for the dashboard |

**Designed (scoring and insights, per the project outline)**

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/districts/:code` | One district deep-dive |
| GET | `/api/households` | Demo households (paginated, filter by district and risk) |
| POST | `/api/households` | Add one household row |
| POST | `/api/score` | Score a batch (JSON or CSV upload) |
| GET | `/api/export/:batchId` | Download a scored batch as CSV |
| GET | `/api/insights/drivers` | Global feature importance |
| GET | `/api/insights/metrics` | Model metrics (baseline and XGBoost) |
| GET | `/api/insights/fairness` | Flag rate and average risk by group |
| GET | `/api/insights/scatter` | Risk × financial-access points per district |

Conventions: HTTP 400 for validation errors, 503 if the ML service is down, 2 MB request limit, CORS restricted to the frontend origin.

**CSV template for the Targeting page**

Required columns:

```
household_id, district_code, household_size, dependency_ratio, head_age, head_sex,
head_education_level, ubudehe_category, main_income_source, income_sources_count,
land_size_ha, asset_index, has_electricity, improved_water, has_mobile_money,
has_savings, has_credit
```

Optional: shock flags (job loss, crop failure, illness). Missing optional values are filled with training medians. Errors are reported per row, for example `Row 14: ubudehe_category must be 1–4`.

## 11. Database

SQLite, created by `api/src/db/schema.sql` and filled by `api/src/db/seed.ts`. It holds only aggregated indicators and synthetic households.

| Table | Key columns |
|---|---|
| `districts` | code (PK), names (EN/RW), province, population, poverty rate, source |
| `households_demo` | id (PK), district code (FK), model features |
| `score_batches` | id (PK), created at, row count, model version |
| `scores` | id (PK), batch id (FK), household id, probability, risk level, three drivers, rank |

**Double-exclusion rule** (define once, reuse everywhere): a district is flagged when its risk score is in the **top tercile** and its financial-access rate is in the **bottom tercile**. The rule is shown on the dashboard so reviewers can see it is transparent.

## 12. Frontend

- **Dashboard**: map by district (poverty, missing support, "poor and left out"), KPI cards, searchable and paginated district list, and a Sources tab with the limits of the data.
- **Targeting**: household table, scoring, risk shown as colour **plus** label (Low / Medium / High), reason chips in English or Kinyarwanda, CSV export, and a visible "decision-support only" notice.
- **Insights**: district selector, risk distribution, drivers, model comparison, fairness view.
- **How it reaches the API**: `frontend/src/api/client.ts` reads `VITE_API_URL`, falls back to `http://localhost:4000`, and adds `/api`. Data hooks live in `hooks.ts`. The map loads `/rwanda_districts.geojson` from `frontend/public`.
- **Accessibility**: responsive on laptop and tablet, readable on a projector, loading, empty and error states on every async view, risk never shown by colour alone.
- **Language**: EN/RW switch; keep a glossary so terms stay consistent. Kinyarwanda text should be reviewed by a native speaker.

## 13. Machine learning design

> This section describes the planned model. `v0.1.0` uses a mock scorer and synthetic households.

**Label.** `poor = 1` if consumption per adult equivalent is below the national poverty line, else `0`. Record the line value used.

**Avoid label leakage.** The label comes from consumption, so do **not** use consumption, expenditure or food-spending variables as features. Use structural and observable proxies only: demographics, assets, housing, land, income sources, access, shocks.

**Pipeline**

1. Ingest EICV household and consumption files and FinScope aggregates.
2. Clean: handle missing values (median or mode plus missing flags), remove duplicates, standardise district codes against one master list of 30 districts.
3. Label and engineer features.
4. Split 80/20, stratified by label and district. Also run **GroupKFold by district** to test generalisation to unseen districts.
5. Train Logistic Regression (baseline, scaled features) and XGBoost (primary). Use `scale_pos_weight` / `class_weight='balanced'` for imbalance.
6. Evaluate accuracy, precision, recall, F1, ROC-AUC, PR-AUC, confusion matrix and calibration. Report precision and recall for the poor class, not only accuracy.
7. Explain with SHAP TreeExplainer: top three drivers per household and a global importance chart.
8. Export `model.joblib`, `feature_schema.json`, `metrics.json`.

**Risk levels** (thresholds are tunable): Low < 0.33, Medium 0.33–0.66, High > 0.66.

**Targets for the MVP:** AUC ≥ 0.80 and accuracy ≥ 75% on a held-out set. Report whatever the real numbers are, honestly.

**Explanations.** Each feature has a bilingual sentence for "raises risk" and "lowers risk", stored in `api/src/shared/explanations.json` and shared by the ML and API layers. Show the three features with the largest positive SHAP value as red chips, and optionally one protective factor as a green chip.

If real EICV microdata is not available, use a public survey with a similar structure or a clearly labelled synthetic set calibrated to published district figures. Never claim real-world accuracy from synthetic data.

## 14. Deployment

The API runs on **Render**, the frontend on **Vercel**. Deploy the API first, test it alone, then point the frontend at it.

### 14.1 API on Render

| Setting | Value |
|---|---|
| Root Directory | `api` |
| Build Command | `npm install --include=dev && npm run build && mkdir -p dist/shared && cp src/shared/explanations.json dist/shared/` |
| Start Command | `npm run seed && npm start` |
| Health Check Path | `/api/health` |
| Branch | `main` |

Environment variables on Render:

| Key | Value |
|---|---|
| `DATABASE_URL` | `/tmp/imbaraga.db` |
| `CORS_ORIGIN` | `https://imbaraga-system.vercel.app` (no trailing slash) |
| `NODE_VERSION` | `22`, only if `better-sqlite3` fails to compile on the default Node |

Why the `cp` step: `tsc` compiles only `.ts` files, so `explanations.json` is not copied into `dist/`. Without the copy the API crashes at start with `ENOENT ... dist/shared/explanations.json`. A more portable fix is to move the copy into `api/package.json`:

```json
"build": "tsc && node -e \"require('fs').cpSync('src/shared','dist/shared',{recursive:true})\""
```

Then the Render build command is just `npm install --include=dev && npm run build`.

**Before deploying, check:**

```bash
git ls-files data/processed          # must list district_aggregates.csv and district_estimates.csv
git ls-files "*explanations.json"    # api/src/shared/explanations.json
```

**A good start log shows:**

```
Applied 30 district poverty estimates (30 official_eicv7)
Seeded 30 districts into /tmp/imbaraga.db
API running on http://localhost:10000
==> Your service is live
```

Then test `/api/health` (JSON) and `/api/districts` (30 districts, Nyamagabe at 51.4).

> The database lives in `/tmp` and is rebuilt on every start. Official data is unaffected, but anything saved at runtime (for example scores on the Targeting page) does not survive a restart. Use a persistent disk or hosted PostgreSQL if that must persist.

### 14.2 Frontend on Vercel

1. Set **Root Directory** to `frontend`.
2. Add `VITE_API_URL` = `https://imbaraga-system.onrender.com` for **Production** and **Preview**. No trailing slash, no `/api`.
3. **Redeploy** (Deployments, then the `⋯` menu on the latest Production deployment, then Redeploy, with the build cache unticked). Vite writes the variable into the build, so changing it alone does nothing.
4. Keep `frontend/vercel.json` so refreshing `/targeting` and `/insights` works:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

5. Confirm the map file is committed: `git ls-files frontend/public` must list `rwanda_districts.geojson`.

Open the site from the production domain, not from a per-deployment preview URL (see CORS in [Troubleshooting](#20-troubleshooting)).

### 14.3 Before a demo

Free-tier services sleep. Open the API URL about 15 minutes before presenting. Keep a screen-recorded demo video and exported slides as a backup, and a local copy ready to run.

## 15. Git workflow and releases

- **Branches:** `main` holds releases only. Day-to-day work happens on `dev` and on feature branches (`feat/...`, `fix/...`, `chore/...`).
- **Commits:** [Conventional Commits](https://www.conventionalcommits.org/) (`feat(frontend): ...`, `fix(api): ...`, `chore: ...`).
- **Feature PRs into `dev`:** squash is fine.
- **Release PRs, `dev` into `main`:** always choose **Create a merge commit**, never squash. Squashing leaves `dev` unaware that `main` contains the release, and the next release PR shows conflicts again.
- **Tagging a release:**

```bash
git checkout main
git pull origin main
git tag -a v0.1.0 -m "Release v0.1.0"
git push origin v0.1.0
```

- **If `main` was squashed by mistake**, join the histories on `dev` (the files are identical, so keep `dev`'s content):

```bash
git checkout dev
git pull origin dev
git merge -s ours origin/main -m "merge: record main (v0.1.0) in dev"
git diff --stat origin/main HEAD     # must print nothing
git push origin dev
```

- **GitHub Release:** draft from the tag. Mark `v0.1.0` as a **pre-release** because the household model is synthetic.
- **Housekeeping:** delete merged branches, and stamp `CHANGELOG.md` with the version and date (`## [0.1.0] - 2026-10-29`) instead of leaving `## [Unreleased]`.
- **Windows note:** `grep` does not exist in Command Prompt. Use `git ls-files "*pattern*"` or `findstr`.

## 16. Testing and quality

| Area | What to test | Tool |
|---|---|---|
| API | Validation errors, CSV edge cases (missing columns, wrong types, empty file), pagination, ML service down (503) | Jest + Supertest |
| Frontend | Table sorting and filtering, language toggle, upload flow, charts with empty data | Vitest + React Testing Library |
| ML (planned) | No leakage, schema matches between training and service, probabilities in [0, 1], deterministic output | pytest |
| End to end | Upload a 200-row CSV, score, export in under 1 minute; dashboard loads in under 3 seconds | Manual, stopwatch |

**Definition of done for a feature:** works end to end with real API data, has loading, empty and error states, works in both languages, and is merged to `main` through the release flow.

CI (GitHub Actions) and a pull-request template are in `.github/`.

## 17. Ethics, privacy and fairness

- **Privacy.** Only aggregated or anonymised survey data and synthetic households. No real household registry. Consistent with Law No. 058/2021 on personal data protection. Any real-data deployment needs formal data-sharing agreements and a data protection impact assessment.
- **Human in the loop.** The model ranks and explains; officers and communities decide. The interface says so.
- **Fairness.** Check flag rates and average risk by sex of household head, rural/urban and district, and report findings honestly, including limits.
- **Transparency.** Show metrics, the double-exclusion rule, data sources and the model version in the app.
- **Harm avoidance.** Household scores are never shown publicly. An export contains only the IDs from the uploaded file.

## 18. Limitations

- Survey data ages. District figures reflect EICV7 2023/24, not today.
- The household model in `v0.1.0` is synthetic and uses a mock scorer. Do not treat its scores as evidence about real people.
- District-level bias is possible; a model trained on some districts may not generalise to others.
- A probability is not certainty, and the system makes no causal claims.
- Free hosting sleeps and does not persist runtime data.

## 19. Roadmap

Planned, not built. Stated as future work, not as current features.

- Train and serve the real risk model (XGBoost with SHAP) through a FastAPI service
- Persistent storage (PostgreSQL or a persistent disk)
- Memoranda of understanding with LODA and MINALOC for real data access
- SMS / USSD alerts
- Farmer-facing mobile app
- Automated retraining and MLOps
- What-if scenarios (adjust a shock flag, see the score change) and a printable district brief

**Out of scope by design:** direct cash disbursement, collection of personally identifiable data, mobile-money integration, province-level policy prescriptions.

## 20. Troubleshooting

| Symptom | Cause and fix |
|---|---|
| "Cannot reach the server" on first load | The free Render instance is asleep. Wait up to about a minute, then press **Try again** |
| Console: `blocked by CORS policy ... value 'https://...vercel.app/' that is not equal to the supplied origin` | `CORS_ORIGIN` on Render has a trailing slash, or differs from the site address. Set it to exactly `https://imbaraga-system.vercel.app`, no trailing slash, no spaces |
| CORS error only on a long URL like `imbaraga-system-xxxx-....vercel.app` | That is a per-deployment preview URL, not the allowed origin. Open the production domain |
| Network tab shows requests to `localhost:4000` | `VITE_API_URL` was not in the build. Add it and **redeploy without build cache** |
| Render: `npm error Missing script: "seed"` | `api/package.json` on `main` lacks `"seed": "tsx src/db/seed.ts"`. Add it and merge to `main` |
| Render: `ENOENT ... dist/shared/explanations.json` | `tsc` does not copy JSON. Use the build command in section 14.1 |
| Render: `better_sqlite3.node`, `NODE_MODULE_VERSION`, `node-gyp` | Native module and Node mismatch. Set `NODE_VERSION=22` and redeploy |
| Seed cannot find the CSVs | `data/processed/*.csv` are not committed. Check `git ls-files data/processed` |
| Refreshing `/targeting` gives 404 on Vercel | Missing `frontend/vercel.json` rewrite |
| Map is blank | `frontend/public/rwanda_districts.geojson` is not committed |
| `'#' is not recognized` or `'grep' is not recognized` | You are in Windows Command Prompt. Comments and `grep` are not available; skip the comment, use `git ls-files "*pattern*"` |
| `tsc` prints its help text instead of building | You ran it in the repo root. Run API commands inside `api/` |

## 21. Contributing, changelog and licence

- See [CONTRIBUTING.md](CONTRIBUTING.md) for the contribution guide and [CHANGELOG.md](CHANGELOG.md) for release notes.
- Open feature pull requests against `dev`, following the template in `.github/`.
- **Licence:** the API declares ISC in `api/package.json`. Add a top-level `LICENSE` file to make the licence explicit for the whole repository.
- **Acknowledgements:** NISR (EICV7, RPHC), FinScope Rwanda, geoBoundaries.

---

*Estimates support planning. A person should confirm every household before any decision is made.*
