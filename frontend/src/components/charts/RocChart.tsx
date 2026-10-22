// frontend/src/components/charts/RocChart.tsx
// ROC curve for both models from metrics.json, drawn as plain SVG (no chart library).
import { useEffect, useState } from "react";
import { getMetrics, type MetricsData } from "../../api/insights";

const SIZE = 340;
const PAD = 48;
const INNER = SIZE - PAD * 2;

const x = (v: number) => PAD + v * INNER;
const y = (v: number) => SIZE - PAD - v * INNER;

const SERIES = [
  { key: "xgboost", label: "XGBoost", color: "#2f7d6d", dash: undefined },
  { key: "baseline_logreg", label: "Simple baseline (logistic regression)", color: "#8a6fd1", dash: "5 4" },
] as const;

export default function RocChart() {
  const [data, setData] = useState<MetricsData | null | undefined>(undefined);

  useEffect(() => {
    getMetrics().then(setData);
  }, []);

  if (data === undefined) return <p>Loading…</p>;
  if (data === null) return <p>Results are not available yet. Run ml/pipeline/train.py.</p>;

  const ticks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div>
      <p style={{ margin: "0 0 8px", fontSize: 14 }}>
        The closer a line gets to the top-left corner, the better the model finds poor households without flagging
        many non-poor ones. The dotted diagonal is random guessing.
      </p>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ width: "100%", maxWidth: 420 }} role="img" aria-label="ROC curve">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD} x2={SIZE - PAD} y1={y(t)} y2={y(t)} stroke="rgba(128,128,128,0.25)" />
            <line x1={x(t)} x2={x(t)} y1={PAD} y2={SIZE - PAD} stroke="rgba(128,128,128,0.25)" />
            <text x={PAD - 6} y={y(t) + 4} fontSize="10" textAnchor="end" fill="currentColor" opacity="0.7">
              {Math.round(t * 100)}%
            </text>
            <text x={x(t)} y={SIZE - PAD + 14} fontSize="10" textAnchor="middle" fill="currentColor" opacity="0.7">
              {Math.round(t * 100)}%
            </text>
          </g>
        ))}
        <line x1={x(0)} y1={y(0)} x2={x(1)} y2={y(1)} stroke="currentColor" opacity="0.4" strokeDasharray="2 3" />
        {SERIES.map((s) => {
          const pts = [...data.test[s.key].roc_points].sort((a, b) => a.fpr - b.fpr || a.tpr - b.tpr);
          const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${x(p.fpr).toFixed(1)},${y(p.tpr).toFixed(1)}`).join(" ");
          return <path key={s.key} d={d} fill="none" stroke={s.color} strokeWidth="2.5" strokeDasharray={s.dash} />;
        })}
        <text x={SIZE / 2} y={SIZE - 8} fontSize="11" textAnchor="middle" fill="currentColor">
          Non-poor households wrongly flagged
        </text>
        <text
          x={12}
          y={SIZE / 2}
          fontSize="11"
          textAnchor="middle"
          fill="currentColor"
          transform={`rotate(-90 12 ${SIZE / 2})`}
        >
          Poor households found
        </text>
      </svg>
      <ul style={{ listStyle: "none", margin: "8px 0 0", padding: 0, fontSize: 13 }}>
        {SERIES.map((s) => (
          <li key={s.key} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span
              style={{
                width: 22,
                height: 0,
                borderTop: `3px ${s.dash ? "dashed" : "solid"} ${s.color}`,
              }}
            />
            {s.label}: AUC {data.test[s.key].auc.toFixed(3)}
          </li>
        ))}
      </ul>
      <p style={{ margin: "10px 0 0", opacity: 0.6, fontSize: 12 }}>
        AUC is 1.0 for a perfect model and 0.5 for guessing. {data.warning}
      </p>
    </div>
  );
}