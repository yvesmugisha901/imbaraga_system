# Imbaraga – Data Sources and Verified Figures

Every number below was read directly from the NISR files in the project. Do not cite figures from memory.

## 1. Sources in use

| Short name | Full name | File | Level of detail |
|---|---|---|---|
| EICV7 | Seventh Integrated Household Living Conditions Survey, 2023/24 (NISR) | `EICV7_Tables_Rwanda_Poverty_Profile.xlsx` | National, province, urban/rural, poverty status |
| RPHC 2022 | Fifth Rwanda Population and Housing Census (NISR) | Yearbook 2025, Tables 15.1 and 15.2 | **30 districts** |
| Yearbook 2025 | Rwanda Statistical Yearbook 2025 (NISR) | `Rwanda_Statistical_Yearbook_2025.xlsx` | Mixed; some district tables |
| RHHS 2019/20 | Rwanda Household Survey (credit, bank accounts) | Pasted text from NISR site | National only |

**Correction to the plan:** replace "EICV 5 (2022/23)" with **EICV7 (2023/24)**. EICV5 is the 2016/17 round, and EICV7 compares against it.

## 2. Headline poverty figures (EICV7, Tables 0.1 and 5.1)

| Indicator | 2017 (modelled from EICV5) | 2024 (actual) |
|---|---|---|
| National poverty headcount | 39.8% | **27.4%** (95% CI 26.4–28.4) |
| National extreme poverty | 11.3% | **5.4%** |
| Kigali City | 14.3% | 9.1% |
| South | 47.6% | 34.7% |
| West | 51.7% | 37.4% |
| North | 33.0% | 20.2% |
| East | 39.1% (Table 0.1) / 39.2% (Table 5.1) | 26.8% |
| Urban / Rural | 18.9% / 44.3% | 16.7% / 31.6% |

- Poverty line: **RWF 560,127** per adult equivalent per year. Extreme poverty line: RWF 356,432. Use the first as the training label threshold (Appendix B, item 4 is now answered).
- 2017 values are model-based predictions, and urban/rural definitions changed between rounds. Say "not directly comparable" for the urban/rural change.
- Table 5.1 shows the East extreme-poverty change as 9.0, but 9.7 → 4.5 is a fall of about 5.2 points, so that cell looks like a typo. Do not quote it. East 2017 poverty is also 39.1 in Table 0.1 and 39.2 in Table 5.1 (rounding).

## 3. Variables for the pitch and the model

**Poverty rate by head-of-household education (Table 6.3):** none/below primary 30.9%, primary 17.8%, lower secondary 9.0%, upper secondary 3.3%, university 0%.

**Poverty rate by head age (Table 6.1):** 17–25: 16.6, 26–35: 17.6, 36–45: 27.5, 46–55: 28.2, 56–65: 24.8, 66+: 21.2. Male-headed 23.3% vs female-headed 23.5% (near identical, so do not expect sex of head to be a strong driver). Note that both rates sit below the 27.4% national rate in this table, which is a source inconsistency; use them as relative, not absolute, calibration targets.

**Main income source, poor vs non-poor households (Table 6.9):** farm wages 32.5% vs 11.8%; non-farm wages 18.9% vs 30.1%; independent non-farmer 7.0% vs 16.3%.

**Financial access, poor vs non-poor households (Table 6.9 memo items):**

| | Poor | Non-poor | All |
|---|---|---|---|
| Has a savings account | 53.2% | 74.4% | 68.0% |
| Has a mobile money account | 77.8% | 90.3% | 86.6% |

This replaces the earlier assumption that "the report has no mobile money data." EICV7 does have it, at national level split by poverty status. It is the basis for `has_mobile_money` and `has_savings` in the generator.

**Assets and housing, poor vs non-poor (Tables 6.7, 6.8):** electricity 55.2 vs 77.1; modern floor 14.5 vs 46.8; corrugated iron roof 66.6 vs 78.6; owns a TV 3.6 vs 27.5; owns a radio 42.7 vs 67.8; owns a bicycle 11.6 vs 22.1.

**Shocks (Table 6.10):** at least one severe shock reported: poor 41.0%, non-poor 35.6%. Main shocks (all households): environmental 30.6%, health 27.0%, high food price 21.5%, loss of employment income 8.5%. The poor/non-poor gap is small, so shock features should add modest predictive power.

**Social protection (EICV7 text):** about 410,000 VUP beneficiaries; 74% female; poverty rate among VUP beneficiaries 40.5% against 27.4% nationally.

**Credit and banking (RHHS 2019/20, national only):** 33.3% of adults 18+ have a bank account (men 41.1%, women 26.7%); 58.9% of households have at least one account holder; 54.7% of households currently hold a loan.

## 4. District-level data (what exists and what does not)

Available per district (RPHC 2022, in `data/processed/district_aggregates.csv`): total, male and female population, population density, urban and rural population and shares. The 30 district names and province assignments match the plan.

**Not available per district in any provided file:** poverty rate, financial access rate, savings or mobile money rates. EICV7 tables stop at province level. The district columns carry the province value, prefixed `prov_`.

Consequences for the plan:

1. `districts.poverty_rate` and `financial_access_rate` (Section 11) cannot be real district values. Options: (a) obtain EICV7 microdata and compute district estimates (sample sizes may be too small for some districts), or (b) model them from province rates, adjusted by urban share and density, **labelled as modelled estimates** in the app.
2. The double-exclusion rule (top tercile risk, bottom tercile access) only means something if districts differ. Within a province all districts currently share one value, so the map would show province blocks. This is the strongest reason to pursue microdata.
3. Never present modelled district values as official NISR statistics.

## 5. Other district tables in the Yearbook (possible proxies)

- Land ownership by district and gender (Environment, Table 5.1).
- Mutuelle de Santé registrations by district (Banking and Finance, Table 12.2.9). This is a registration count, not coverage, so divide by population before using it.
- Land transactions, roads (paved/unpaved km), and accommodation by district.

These can add district variation to the aggregates but are not poverty or financial inclusion measures. Check definitions before using them.

## 6. Still open

- [ ] EICV7 microdata request sent (date: ___)
- [ ] District GeoJSON downloaded; property names checked against `district_lookup.csv`
- [ ] FinScope Rwanda: confirm district or province granularity
- [ ] Kinyarwanda reviewer named
- [ ] Data conflict from the AHS 2024 report: use Tables 2 and 14 of the full report, not the infographic
