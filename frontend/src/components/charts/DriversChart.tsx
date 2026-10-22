// frontend/src/components/charts/DriversChart.tsx
// "What drives the risk score": horizontal bars from global_importance.json.
// Plain CSS bars, no chart library. Shows a friendly note if the file is missing.
import { useEffect, useState } from "react";
import { getDrivers, type DriverItem } from "../../api/insights";

// Plain-language labels. Add Kinyarwanda later via your i18n files.
const LABELS: Record<string, string> = {
  household_size: "Household size",
  dependency_ratio: "Dependants per earner",
  head_age: "Age of household head",
  ubudehe_category: "Ubudehe category",
  income_sources_count: "Number of income sources",
  land_size_ha: "Land owned (ha)",
  asset_index: "Household assets",
  has_electricity: "Has electricity",
  improved_water: "Improved water source",
  has_mobile_money: "Uses mobile money",
  has_savings: "Has savings",
  has_credit: "Has access to credit",
  district_urban_pct: "Urban share of district",
  head_education_level: "Education of household head",
  head_sex: "Sex of household head",
  main_income_source: "Main source of income",
};

export default function DriversChart({ topN = 10 }: { topN?: number }) {
  const [items, setItems] = useState<DriverItem[] | null | undefined>(undefined);

  useEffect(() => {
    getDrivers().then(setItems);
  }, []);

  if (items === undefined) return <p>Loading…</p>;
  if (items === null || items.length === 0) {
    return <p>Driver analysis is not available yet. Run ml/pipeline/explain.py.</p>;
  }

  const rows = items.slice(0, topN);
  const max = Math.max(...rows.map((r) => r.share), 0.0001);

  return (
    <div>
      <p style={{ margin: "0 0 12px", opacity: 0.75, fontSize: 14 }}>
        How much each answer moves the risk estimate, across all test households.
        Longer bar means a bigger influence.
      </p>
      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {rows.map((r) => (
          <li
            key={r.feature}
            style={{ display: "grid", gridTemplateColumns: "200px 1fr 48px", gap: 8, alignItems: "center", marginBottom: 8 }}
          >
            <span style={{ fontSize: 14 }}>{LABELS[r.feature] ?? r.feature}</span>
            <div style={{ background: "rgba(128,128,128,0.18)", borderRadius: 4, height: 14 }}>
              <div
                role="img"
                aria-label={`${LABELS[r.feature] ?? r.feature}: ${(r.share * 100).toFixed(1)}%`}
                style={{ width: `${(r.share / max) * 100}%`, height: "100%", borderRadius: 4, background: "#2f7d6d" }}
              />
            </div>
            <span style={{ fontSize: 13, textAlign: "right" }}>{(r.share * 100).toFixed(0)}%</span>
          </li>
        ))}
      </ul>
      <p style={{ margin: "12px 0 0", opacity: 0.6, fontSize: 12 }}>
        Based on synthetic data. Percentages are each feature's share of total influence (TreeSHAP).
      </p>
    </div>
  );
}