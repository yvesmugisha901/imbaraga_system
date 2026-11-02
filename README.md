# 🇷🇼 Imbaraga System — Seeing Poverty Before the Next Survey
> **Kubona ishusho y'ubukene mbere y'ibarura ritaha**  
> *An Explainable AI, Macro-to-Micro Poverty Targeting & Decision Intelligence Platform aligned with NISR EICV7 (2023/24) and FinScope 2024.*

🌐 **Live Deployed Platform:** **[https://imbaraga-system.vercel.app](https://imbaraga-system.vercel.app)**

---

## 🎥 Project Demonstration (3-Minute Pitch & System Walkthrough)

▶️ **[Click here to watch/download the 3-minute Imbaraga System Demo Video (.webm)](https://github.com/yvesmugisha901/imbaraga_system/raw/main/imbaraga-demo.webm)**

<video src="https://github.com/yvesmugisha901/imbaraga_system/raw/main/imbaraga-demo.webm" controls="controls" width="100%"></video>

---

## 🎯 1. The Challenge & Why Imbaraga Matters

National household surveys such as **NISR's EICV** provide the gold standard for measuring poverty across Rwanda's 30 districts, but they occur several years apart. Between survey cycles, local government leaders and social protection planners face three critical operational gaps:
1. **The Inter-Survey Blind Spot:** Households can slip into poverty between national surveys due to income shocks, asset loss, or high dependency ratios without being detected in time.
2. **Macro-to-Micro Disconnect:** District-level poverty rates show *where* budget is needed, but local officials at the **Sector (*Umurenge*), Cell (*Akagari*), and Village (*Umudugudu*)** levels need household-level prioritization and specific intervention matching.
3. **Black-Box Distrust & Language Barriers:** Complex machine learning models are often opaque to policymakers, and English-only analytics tools exclude grassroots leaders who operate in **Kinyarwanda**.

**Imbaraga System** solves all three by combining official **NISR EICV7 (2023/24)** and **FinScope 2024** macro baselines with an explainable, fairness-audited **Household Vulnerability Targeting Engine** and a **100% Bilingual (English & Kinyarwanda)** interface.

---

## 🚀 2. Core Objectives

* **Bridge the Survey Gap for NISR & Policy Makers:** Provide an operational early-warning system that flags households in poverty—and those at high risk of falling into poverty—between multi-year national surveys.
* **Preventative Intervention Matching:** Automatically diagnose *why* each household is vulnerable and prescribe targeted interventions:
  * **High Risk (Score ≥ 66%):** *Direct VUP cash transfer & financial inclusion onboarding* (*Inkunga y'amafaranga ya VUP no kwinjizwa muri serivisi z'imari*).
  * **Medium Risk (Score 42%–65% — Preventative Tier):** *Asset-building cooperative & micro-credit linkage* (*Kwinjizwa muri koperative y'iterambere no guhabwa inguzanyo nto*) to stop families from falling into extreme poverty.
  * **Low Risk (Score < 42%):** *Routine monitoring & community savings group / Ibimina*.
* **Guarantee Algorithmic Fairness & Transparency:** Benchmark complex AI against explainable baselines, audit gender and geographic equity, and enforce a **human-in-the-loop home visit** before any benefit decision is finalized.
* **Empower Grassroots Officials in Kinyarwanda:** Translate every chart, metric, dynamic risk driver, policy recommendation, and AI query response seamlessly between **English (`EN`)** and **Kinyarwanda (`RW`)**.

---

## ⚙️ 3. Key Platform Modules & How They Work

### A. National Macro Dashboard (*Ahabanza*)
* Integrates official **NISR EICV7 2023/24** poverty rates (27.4% national rate; 30 of 30 districts reduced poverty since 2016/17) with **FinScope 2024** financial access and basic service indicators.
* Identifies the **9 priority districts** where poverty exceeds the national average alongside low access to services or financial exclusion—including the **6 double-exclusion districts** (*Gisagara, Nyaruguru, Karongi, Rutsiro, Ngororero, Burera*).

### B. Household Vulnerability Targeting Engine (*Guhitamo ingo*)
* Allows analysts or local officials to upload any household survey batch (`.csv`) covering **District, Sector, Cell, and Village**.
* Evaluates household income, household size/dependency, productive assets, Ubudehe tier, and district baselines to compute a **Vulnerability Score (0–100%)**, classify **Risk Level**, isolate the **Primary Vulnerability Drivers**, and export a prioritized **Scored CSV** for field verification.

### C. Explainable AI, Accuracy & Fairness Audit (*Ubusesenguzi*)
* **Feature Transparency:** Displays exact factor weights driving the risk estimate—led by **Household assets (17%)**, **Education of household head (11%)**, **Main source of income (10%)**, **Land owned (8%)**, and **Number of income sources (8%)**.
* **Rigorous Model Validation (20,000 Calibrated Synthetic Households — 16,000 Train / 4,000 Test):**

| Measure (*Igipimo*) | Simple Baseline (Logistic Regression) | Complex Model (XGBoost) | Policy Takeaway |
| :--- | :---: | :---: | :--- |
| **Poor households found (Recall)** | 82.7% | **84.6%** | Catches 925 of 1,093 truly poor test households |
| **Flags that were truly poor (Precision)** | 63.7% | **64.7%** | Every flag is verified via a confirmatory home visit |
| **Overall correct (Accuracy)** | 82.4% | **83.2%** | Strong overall classification stability |
| **Ranking quality (ROC AUC)** | 0.908 | **0.913** | Simple explainable model performs nearly identically to XGBoost |
| **Unseen Districts (District-grouped AUC)** | 0.903 ± 0.003 | **0.908 ± 0.004** | Generalizes reliably to districts unseen during training |

* **Gender & Geographic Fairness Audit:**
  * Female-headed households achieve **83.1%** recall vs. **85.1%** for male-headed households (only a **2.0 percentage point gap**).
  * Transparently highlights urban districts (*Kicukiro, Nyarugenge, Gasabo*) where low baseline poverty rates require localized threshold calibration.

### D. Imbaraga Intelligence AI Assistant (Bilingual Administrative & Dataset Chatbot)
* Indexes all **30 Districts, 416 Sectors, 2,148 Cells, and Village registries**, plus any **live uploaded CSV dataset**.
* Officials can query any administrative unit or specific household ID in **English or Kinyarwanda** to receive instant poverty baselines, financial exclusion metrics, and intervention summaries.

---

## 🧭 4. Quick 60-Second Guide for Judges

1. **Open the Live Platform:** Visit **[https://imbaraga-system.vercel.app](https://imbaraga-system.vercel.app)**.
2. **Test Real-Time Kinyarwanda Localization:** Click the **`EN` / `RW`** toggle in the top-right header at any time to see all navigation, charts, statistical explanations, and tables switch between English and Kinyarwanda.
3. **Explore Macro Priorities (*Dashboard / Ahabanza*):** Hover or click on districts in the interactive map, review the **Progress since 2016/17** dumbbell chart, and filter all 30 districts.
4. **Run Household Targeting (*Targeting / Guhitamo ingo*):**
   * Click **Download CSV Schema** or upload a household `.csv` file.
   * Filter households by **High / Medium / Low Risk**, search by Sector/Cell/Village, switch between **EN** and **RW** to see localized drivers and VUP/cooperative recommendations, and click **Export Scored CSV**.
5. **Inspect Model Fairness & Explainability (*Insights / Ubusesenguzi*):** Review the top household risk drivers, the gender fairness audit, the 4,000-household confusion matrix, and the XGBoost vs. Logistic Regression comparison.
6. **Query Imbaraga Intelligence:** Click the **Imbaraga Intelligence** button in the bottom-right corner and ask about any district, sector, cell, village (e.g., *"Nyamagabe"*, *"Bushoki sector"*, *"Kayenzi cell"*), or your uploaded household records in English or Kinyarwanda.

---

## 🛡️ 5. Data Ethics & Scientific Integrity
* **Macro Layer:** 100% official published statistics from **NISR EICV7 (2023/24)**, **FinScope Rwanda 2024**, and **RPHC5 (2022)**.
* **Micro Predictive Layer:** Trained and evaluated on synthetic household microdata statistically calibrated to published NISR marginals to protect household privacy during prototyping. Before field deployment, the pipeline is designed to be re-verified directly on official NISR microdata with mandatory human-in-the-loop home visits.
