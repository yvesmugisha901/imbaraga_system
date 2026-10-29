// frontend/src/utils/alertRules.ts
// Alert rules: edit these numbers to change when an alert appears.
// Rules compare each district with the national average, so they stay meaningful if the data changes.
export const RULES = {
  highAboveAverage: 0.1, // HIGH: share of families poor or close to poverty is 10+ points above average
  watchAboveAverage: 0.04, // WATCH: share close to falling into poverty is 4+ points above average
  maxAlerts: 6,
}