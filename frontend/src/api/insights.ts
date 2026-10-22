// frontend/src/api/insights.ts
// Loads Insights data from /insights/*.json (frontend/public/insights/).
// Every loader returns null if the file is missing, so the page can show "coming soon".

export interface DriverItem {
  feature: string;
  mean_abs_shap: number;
  share: number; // 0..1 share of total importance
}

export interface GroupMetrics {
  n: number;
  actual_poverty_rate: number | null;
  predicted_poverty_rate: number | null;
  recall: number | null;
  false_positive_rate: number | null;
  precision: number | null;
}

export interface FairnessData {
  threshold: number;
  overall: GroupMetrics;
  groups: Record<string, Record<string, GroupMetrics>>;
}

export interface RocData {
  models: { name: string; auc: number; fpr: number[]; tpr: number[] }[];
}

export interface ConfusionData {
  model: string;
  threshold: number;
  tp: number;
  fp: number;
  fn: number;
  tn: number;
}

export interface ModelComparisonRow {
  model: string;
  auc: number;
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
}

async function loadJson<T>(name: string): Promise<T | null> {
  try {
    const res = await fetch(`/insights/${name}.json`);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export const getDrivers = () => loadJson<DriverItem[]>("global_importance");
export const getFairness = () => loadJson<FairnessData>("fairness");
export const getRoc = () => loadJson<RocData>("roc");
export const getConfusion = () => loadJson<ConfusionData>("confusion");
export const getModelComparison = () =>
  loadJson<ModelComparisonRow[]>("model_comparison");

// ---- metrics.json (written by train.py) ----
export interface ModelTestMetrics {
  accuracy: number;
  precision_poor: number;
  recall_poor: number;
  f1_poor: number;
  auc: number;
  pr_auc: number;
  confusion_matrix: { tn: number; fp: number; fn: number; tp: number };
  roc_points: { fpr: number; tpr: number }[];
  risk_level_counts: { Low: number; Medium: number; High: number };
}

export interface MetricsData {
  data_origin: string;
  warning: string;
  n_train: number;
  n_test: number;
  poor_share: number;
  test: { baseline_logreg: ModelTestMetrics; xgboost: ModelTestMetrics };
  district_grouped_cv: {
    baseline_logreg: { auc_mean: number; auc_std: number; folds: number[] };
    xgboost: { auc_mean: number; auc_std: number; folds: number[] };
  };
}

export const getMetrics = () => loadJson<MetricsData>("metrics");