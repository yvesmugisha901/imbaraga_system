// frontend/src/pages/Insights.tsx
// "For analysts" page: how the model works and how far it can be trusted.
import type { ReactNode } from "react";
import DriversChart from "../components/charts/DriversChart";
import FairnessTable from "../components/charts/FairnessTable";
import ConfusionMatrix from "../components/charts/ConfusionMatrix";
import RocChart from "../components/charts/RocChart";
import ModelComparison from "../components/charts/ModelComparison";

function Card({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <section
      style={{
        border: "1px solid rgba(128,128,128,0.3)",
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
      }}
    >
      <h2 style={{ margin: "0 0 2px", fontSize: 18 }}>{title}</h2>
      <p style={{ margin: "0 0 12px", opacity: 0.7, fontSize: 13 }}>{subtitle}</p>
      {children}
    </section>
  );
}

export default function Insights() {
  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: 16 }}>
      <h1 style={{ margin: "0 0 4px" }}>For analysts</h1>
      <p style={{ margin: "0 0 16px", opacity: 0.75, fontSize: 14 }}>
        How the risk estimate is made, how accurate it is, and whether it treats groups fairly. Results here come from
        synthetic data and must be re-checked on real survey data before field use.
      </p>

      <Card title="What drives the risk estimate" subtitle="The household answers that matter most">
        <DriversChart topN={10} />
      </Card>

      <Card title="Does it treat groups fairly?" subtitle="Share of poor households found, by head of household">
        <FairnessTable groupKey="head_sex" />
      </Card>

      <Card title="Where it finds and misses households" subtitle="Results on households the model never saw in training">
        <ConfusionMatrix />
      </Card>

      <Card title="How good is the ranking?" subtitle="Poor households found versus non-poor households wrongly flagged">
        <RocChart />
      </Card>

      <Card title="Simple model versus complex model" subtitle="Both were tested on the same households">
        <ModelComparison />
      </Card>

      <Card title="Weakest districts" subtitle="Districts where the fewest poor households are found">
        <FairnessTable groupKey="district_code" maxRows={8} />
      </Card>
    </div>
  );
}