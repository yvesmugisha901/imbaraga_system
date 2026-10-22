// frontend/src/components/charts/FairnessTable.tsx
// Shows how well the model finds poor households in each group, from fairness.json.
// Default: female- vs male-headed households. Use groupKey="district_code" for districts.
import { useEffect, useState } from "react";
import { getFairness, type FairnessData, type GroupMetrics } from "../../api/insights";

const GROUP_LABELS: Record<string, string> = { F: "Female-headed", M: "Male-headed" };
const GAP_WARNING = 0.05; // flag if recall differs by more than 5 points
const MIN_N = 30; // ignore groups too small to judge

const pct = (v: number | null) => (v === null ? "–" : `${(v * 100).toFixed(1)}%`);

export default function FairnessTable({
  groupKey = "head_sex",
  maxRows = 10,
}: {
  groupKey?: string;
  maxRows?: number;
}) {
  const [data, setData] = useState<FairnessData | null | undefined>(undefined);

  useEffect(() => {
    getFairness().then(setData);
  }, []);

  if (data === undefined) return <p>Loading…</p>;
  const groups = data?.groups?.[groupKey];
  if (!data || !groups) {
    return <p>Fairness check is not available yet. Run ml/pipeline/explain.py.</p>;
  }

  const rows: [string, GroupMetrics][] = Object.entries(groups)
    .filter(([, m]) => m.n >= MIN_N && m.recall !== null)
    .sort((a, b) => (a[1].recall ?? 0) - (b[1].recall ?? 0)) // weakest first
    .slice(0, maxRows);

  const recalls = rows.map(([, m]) => m.recall as number);
  const gap = recalls.length > 1 ? Math.max(...recalls) - Math.min(...recalls) : 0;
  const flagged = gap > GAP_WARNING;

  return (
    <div>
      <p style={{ margin: "0 0 12px", fontSize: 14 }}>
        {flagged
          ? `Check this: the share of poor households found differs by ${(gap * 100).toFixed(1)} points between groups. Some groups are missed more often.`
          : `The share of poor households found is similar across groups (gap ${(gap * 100).toFixed(1)} points).`}
      </p>
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid rgba(128,128,128,0.4)" }}>
              <th style={{ padding: "6px 8px" }}>Group</th>
              <th style={{ padding: "6px 8px" }}>Households</th>
              <th style={{ padding: "6px 8px" }}>Actually poor</th>
              <th style={{ padding: "6px 8px" }}>Poor households found</th>
              <th style={{ padding: "6px 8px" }}>Non-poor wrongly flagged</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([name, m]) => (
              <tr key={name} style={{ borderBottom: "1px solid rgba(128,128,128,0.2)" }}>
                <td style={{ padding: "6px 8px" }}>{GROUP_LABELS[name] ?? name}</td>
                <td style={{ padding: "6px 8px" }}>{m.n.toLocaleString()}</td>
                <td style={{ padding: "6px 8px" }}>{pct(m.actual_poverty_rate)}</td>
                <td style={{ padding: "6px 8px", fontWeight: 600 }}>{pct(m.recall)}</td>
                <td style={{ padding: "6px 8px" }}>{pct(m.false_positive_rate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ margin: "12px 0 0", opacity: 0.6, fontSize: 12 }}>
        Measured on held-out synthetic households at a risk cutoff of {data.threshold}. Real-world fairness must be
        re-checked on real survey data. Groups under {MIN_N} households are hidden.
      </p>
    </div>
  );
}