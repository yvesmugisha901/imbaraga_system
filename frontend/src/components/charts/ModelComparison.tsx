// frontend/src/components/charts/ModelComparison.tsx
// Side-by-side comparison of the simple baseline and XGBoost, from metrics.json.
import { useEffect, useState } from "react";
import { getMetrics, type MetricsData } from "../../api/insights";

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

export default function ModelComparison() {
  const [data, setData] = useState<MetricsData | null | undefined>(undefined);

  useEffect(() => {
    getMetrics().then(setData);
  }, []);

  if (data === undefined) return <p>Loading…</p>;
  if (data === null) return <p>Results are not available yet. Run ml/pipeline/train.py.</p>;

  const b = data.test.baseline_logreg;
  const g = data.test.xgboost;
  const cvB = data.district_grouped_cv.baseline_logreg;
  const cvG = data.district_grouped_cv.xgboost;

  const rows: { label: string; hint: string; base: string; xgb: string; xgbBetter: boolean }[] = [
    { label: "Poor households found", hint: "Recall", base: pct(b.recall_poor), xgb: pct(g.recall_poor), xgbBetter: g.recall_poor >= b.recall_poor },
    { label: "Flags that were truly poor", hint: "Precision", base: pct(b.precision_poor), xgb: pct(g.precision_poor), xgbBetter: g.precision_poor >= b.precision_poor },
    { label: "Overall correct", hint: "Accuracy", base: pct(b.accuracy), xgb: pct(g.accuracy), xgbBetter: g.accuracy >= b.accuracy },
    { label: "Ranking quality", hint: "AUC", base: b.auc.toFixed(3), xgb: g.auc.toFixed(3), xgbBetter: g.auc >= b.auc },
    {
      label: "Ranking on unseen districts",
      hint: "District-grouped AUC",
      base: `${cvB.auc_mean.toFixed(3)} ± ${cvB.auc_std.toFixed(3)}`,
      xgb: `${cvG.auc_mean.toFixed(3)} ± ${cvG.auc_std.toFixed(3)}`,
      xgbBetter: cvG.auc_mean >= cvB.auc_mean,
    },
  ];

  const cell = { padding: "6px 8px" } as const;
  const best = { ...cell, fontWeight: 700 } as const;

  return (
    <div>
      <p style={{ margin: "0 0 12px", fontSize: 14 }}>
        We tested a complex model (XGBoost) against a simple, easy-to-explain one. When they score almost the same, the
        simple model is a strong choice for officials who need to understand the result.
      </p>
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid rgba(128,128,128,0.4)" }}>
              <th style={cell}>Measure</th>
              <th style={cell}>Simple baseline</th>
              <th style={cell}>XGBoost</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} style={{ borderBottom: "1px solid rgba(128,128,128,0.2)" }}>
                <td style={cell}>
                  {r.label} <span style={{ opacity: 0.55, fontSize: 12 }}>({r.hint})</span>
                </td>
                <td style={r.xgbBetter ? cell : best}>{r.base}</td>
                <td style={r.xgbBetter ? best : cell}>{r.xgb}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ margin: "12px 0 0", opacity: 0.6, fontSize: 12 }}>
        Bold marks the better value. Test set: {data.n_test.toLocaleString()} households; training set:{" "}
        {data.n_train.toLocaleString()}. The unseen-district row checks that the model works on districts it was not
        trained on. {data.warning}
      </p>
    </div>
  );
}