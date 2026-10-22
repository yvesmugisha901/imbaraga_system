// frontend/src/components/charts/ConfusionMatrix.tsx
// Plain-language 2x2 result table from metrics.json (test set).
import { useEffect, useState } from "react";
import { getMetrics, type MetricsData } from "../../api/insights";

type ModelKey = "xgboost" | "baseline_logreg";

const nf = (n: number) => n.toLocaleString();
const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

function Cell({ title, count, share, good }: { title: string; count: number; share: number; good: boolean }) {
  return (
    <div
      style={{
        padding: 12,
        borderRadius: 8,
        background: good ? "rgba(47,125,109,0.16)" : "rgba(200,90,60,0.16)",
        border: `1px solid ${good ? "rgba(47,125,109,0.5)" : "rgba(200,90,60,0.5)"}`,
      }}
    >
      <div style={{ fontSize: 12, opacity: 0.8 }}>{title}</div>
      <div style={{ fontSize: 24, fontWeight: 700 }}>{nf(count)}</div>
      <div style={{ fontSize: 12, opacity: 0.7 }}>{pct(share)} of households</div>
    </div>
  );
}

export default function ConfusionMatrix({ model = "xgboost" }: { model?: ModelKey }) {
  const [data, setData] = useState<MetricsData | null | undefined>(undefined);

  useEffect(() => {
    getMetrics().then(setData);
  }, []);

  if (data === undefined) return <p>Loading…</p>;
  if (data === null) return <p>Results are not available yet. Run ml/pipeline/train.py.</p>;

  const { tp, fn, fp, tn } = data.test[model].confusion_matrix;
  const total = tp + fn + fp + tn;
  const poor = tp + fn;
  const flagged = tp + fp;

  return (
    <div>
      <p style={{ margin: "0 0 12px", fontSize: 14 }}>
        Of {nf(poor)} households that are really poor, the model found {nf(tp)} and missed {nf(fn)}. Of {nf(flagged)}{" "}
        households it flagged, {nf(fp)} were not poor, which is why a home visit confirms every flag.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr 1fr", gap: 8, alignItems: "stretch" }}>
        <div />
        <div style={{ fontSize: 13, textAlign: "center", fontWeight: 600 }}>Flagged as at risk</div>
        <div style={{ fontSize: 13, textAlign: "center", fontWeight: 600 }}>Not flagged</div>

        <div style={{ fontSize: 13, fontWeight: 600, alignSelf: "center" }}>Really poor</div>
        <Cell title="Correctly found" count={tp} share={tp / total} good />
        <Cell title="Missed" count={fn} share={fn / total} good={false} />

        <div style={{ fontSize: 13, fontWeight: 600, alignSelf: "center" }}>Not poor</div>
        <Cell title="Flagged by mistake" count={fp} share={fp / total} good={false} />
        <Cell title="Correctly left out" count={tn} share={tn / total} good />
      </div>
      <p style={{ margin: "12px 0 0", opacity: 0.6, fontSize: 12 }}>
        {nf(total)} held-out test households. {data.warning}
      </p>
    </div>
  );
}