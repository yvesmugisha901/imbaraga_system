# Changelog

All notable changes are recorded here. Format follows Keep a Changelog; versions follow Semantic Versioning.

## [Unreleased]

### Added
- Synthetic household generator calibrated to published EICV7 figures.
- Model training with a simple baseline and XGBoost, including district-grouped cross-validation.
- Global driver importance (TreeSHAP) and fairness breakdown by head of household and district.
- Household vulnerability bands (poor now, at risk, stable) and a district vulnerability layer.
- Dashboard with district map, four map layers, early-warning alerts and a searchable, paginated district list.
- "For analysts" Insights page: drivers, fairness, confusion matrix, ROC curve and model comparison.
- Professional navigation bar with mobile menu, skip link and footer notice.

### Notes
- All model results are based on synthetic data and are not real-world accuracy.
- The "close to poverty" view is a screening proxy, not a forecast.