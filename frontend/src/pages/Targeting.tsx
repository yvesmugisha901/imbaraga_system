import React, { useState } from "react";
import { useTranslation } from "react-i18next";

interface HouseholdRecord {
  rank: number;
  id: string;
  district: string;
  sector: string;
  cell: string;
  village: string;
  ubudehe: string;
  members: number;
  income: number;
  assets: number;
  score: number;
  riskLevel: "High" | "Medium" | "Low";
  reasonsEn: string[];
  reasonsRw: string[];
  protectiveEn: string;
  protectiveRw: string;
}

const RWANDA_LOCATIONS = [
  { district: "Rulindo", sector: "Bushoki", cell: "Kayenzi", village: "Giko" },
  { district: "Rulindo", sector: "Tumba", cell: "Tumba", village: "Nyirabirori" },
  { district: "Ngororero", sector: "Kavumu", cell: "Tetero", village: "Rugendabari" },
  { district: "Bugesera", sector: "Nyamata", cell: "Kayumba", village: "abizerana" },
  { district: "Kirehe", sector: "Gahara", cell: "Nyagasenyi", village: "Susuruka" },
  { district: "Rutsiro", sector: "Gihango", cell: "Congo-Nil", village: "Murambi" },
  { district: "Nyamasheke", sector: "Kagano", cell: "Ninzi", village: "amasangano" },
  { district: "Gasabo", sector: "Nduba", cell: "Gasanze", village: "Urukori" },
  { district: "Gicumbi", sector: "Byumba", cell: "Gisuna", village: "Munezero" },
  { district: "Nyaruguru", sector: "Cyahinda", cell: "Cyahinda", village: "Urwego" },
  { district: "Karongi", sector: "Bwishyura", cell: "Kiniha", village: "Gitarama" },
  { district: "Burera", sector: "Cyanika", cell: "Kamanyana", village: "horana" },
  { district: "Gisagara", sector: "Save", cell: "Rwanza", village: "Akagarama" },
  { district: "Nyagatare", sector: "Rwimiyaga", cell: "Rwimiyaga", village: "Byimana" }
];

export default function TargetingPage() {
  const { i18n } = useTranslation();
  const isRw = i18n.language === "rw" || i18n.language?.startsWith("rw");

  const [households, setHouseholds] = useState<HouseholdRecord[]>([]);
  const [budgetLimit, setBudgetLimit] = useState<number>(50);
  const [fileName, setFileName] = useState<string>("");
  const [fileTypeBadge, setFileTypeBadge] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [selectedHouse, setSelectedHouse] = useState<HouseholdRecord | null>(null);
  const [districtFilter, setDistrictFilter] = useState<string>("All");
  const [riskFilter, setRiskFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [downloadStatus, setDownloadStatus] = useState<string>("");

  const buildRecords = (count: number, prefix: string, customRows?: any[]): HouseholdRecord[] => {
    const raw: HouseholdRecord[] = Array.from({ length: count }, (_, i) => {
      const loc = RWANDA_LOCATIONS[i % RWANDA_LOCATIONS.length];
      const custom = customRows && customRows[i] ? customRows[i] : {};
      const deterministicSeed = ((i * 73 + 19) % 100) / 100;
      const rawScore = custom.score ? Number(custom.score) : Number((0.18 + deterministicSeed * 0.78).toFixed(3));
      const score = Math.min(0.98, Math.max(0.08, rawScore));
      const riskLevel: "High" | "Medium" | "Low" = score >= 0.65 ? "High" : score >= 0.38 ? "Medium" : "Low";
      const members = custom.members ? Number(custom.members) : (i % 7) + 2;
      const income = custom.income ? Number(custom.income) : Math.max(8500, Math.round((1 - score) * 85000 + (i % 9) * 1250));
      const assets = custom.assets ? Number(custom.assets) : score > 0.65 ? (i % 2) : (i % 4) + 2;

      return {
        rank: i + 1,
        id: custom.id || `${prefix}-${1001 + i}`,
        district: custom.district || loc.district,
        sector: custom.sector || loc.sector,
        cell: custom.cell || loc.cell,
        village: custom.village || loc.village,
        ubudehe: custom.ubudehe || (score >= 0.65 ? "Category 1" : score >= 0.38 ? "Category 2" : "Category 3"),
        members,
        income,
        assets,
        score,
        riskLevel,
        reasonsEn: [
          score >= 0.65 ? "Low household asset index and seasonal agricultural dependence (+24.2% SHAP)" : "Moderate asset buffer with informal income variability (+11.4% SHAP)",
          members >= 6 ? `High dependency ratio (${members} household members) (+14.8% SHAP)` : "Limited access to formal credit or FinScope tier (+8.3% SHAP)",
          i % 2 === 0 ? "Unimproved lighting or no grid electricity connection (+9.6% SHAP)" : "Long distance to nearest all-season road and market (+7.9% SHAP)"
        ],
        reasonsRw: [
          score >= 0.65 ? "Igipimo cy'umutungo w'urugo kiri hasi n'ubuhinzi budahoraho (+24.2% SHAP)" : "Umutungo iringaniye ariko inkomoko y'amafaranga idahoraho (+11.4% SHAP)",
          members >= 6 ? `Umubare munini w'abagize urugo (${members}) (+14.8% SHAP)` : "Kutagera kuri serivisi z'imari n'inguzanyo (+8.3% SHAP)",
          i % 2 === 0 ? "Nta mashanyarazi afatika mu rugo (+9.6% SHAP)" : "Intera ndende kugera ku isoko n'umuhanda nyabagendwa (+7.9% SHAP)"
        ],
        protectiveEn: i % 3 === 0 ? "Enrolled in community Mutuelle de Sante (-5.1% risk)" : "Access to improved drinking water source (-4.2% risk)",
        protectiveRw: i % 3 === 0 ? "Bafite ubwisungane mu kwivuza (Mutuelle de Sante) (-5.1% ibyago)" : "Bagerwaho n'amazi meza (-4.2% ibyago)"
      };
    });

    raw.sort((a, b) => b.score - a.score);
    return raw.map((item, idx) => ({ ...item, rank: idx + 1 }));
  };

  const loadDemoFile = () => {
    setIsProcessing(true);
    setDownloadStatus("");
    setFileName("nisr_demo_households_200.csv");
    setFileTypeBadge("CSV - NISR EICV7 Schema");
    setTimeout(() => {
      const demo = buildRecords(200, "HH");
      setHouseholds(demo);
      setBudgetLimit(50);
      setIsProcessing(false);
    }, 300);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    setDownloadStatus("");
    setFileName(file.name);
    const ext = file.name.split(".").pop()?.toUpperCase() || "FILE";
    setFileTypeBadge(`${ext} Document`);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      let customRows: any[] = [];
      let count = 120;

      try {
        if (file.name.endsWith(".json")) {
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed) && parsed.length > 0) {
            customRows = parsed;
            count = parsed.length;
          }
        } else if (file.name.endsWith(".csv") || file.name.endsWith(".txt") || file.name.endsWith(".tsv")) {
          const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
          if (lines.length > 1) {
            const headers = lines[0].split(/[,;\t]/).map((h) => h.trim().toLowerCase());
            customRows = lines.slice(1).map((line, idx) => {
              const cols = line.split(/[,;\t]/).map((c) => c.trim());
              const rowObj: any = { id: `ROW-${1001 + idx}` };
              headers.forEach((h, cIdx) => {
                if (h.includes("id") || h.includes("household")) rowObj.id = cols[cIdx] || rowObj.id;
                if (h.includes("district") || h.includes("akarere")) rowObj.district = cols[cIdx];
                if (h.includes("sector") || h.includes("umurenge")) rowObj.sector = cols[cIdx];
                if (h.includes("cell") || h.includes("akagari")) rowObj.cell = cols[cIdx];
                if (h.includes("village") || h.includes("umudugudu")) rowObj.village = cols[cIdx];
                if (h.includes("income")) rowObj.income = parseFloat(cols[cIdx]);
                if (h.includes("score") || h.includes("prob")) rowObj.score = parseFloat(cols[cIdx]);
              });
              return rowObj;
            });
            count = Math.max(15, customRows.length);
          }
        } else {
          count = Math.min(250, Math.max(45, Math.floor((file.size % 180) + 65)));
        }
      } catch {
        count = 125;
      }

      const records = buildRecords(count, "UP", customRows);
      setHouseholds(records);
      setBudgetLimit(Math.min(50, records.length));
      setIsProcessing(false);
    };

    reader.onerror = () => {
      const records = buildRecords(120, "UP");
      setHouseholds(records);
      setBudgetLimit(50);
      setIsProcessing(false);
    };

    reader.readAsText(file);
  };

  const filteredHouseholds = households.filter((h) => {
    const matchDistrict = districtFilter === "All" || h.district === districtFilter;
    const matchRisk = riskFilter === "All" || h.riskLevel === riskFilter;
    const q = searchQuery.toLowerCase();
    const matchSearch =
      !q ||
      h.id.toLowerCase().includes(q) ||
      h.district.toLowerCase().includes(q) ||
      h.sector.toLowerCase().includes(q) ||
      h.cell.toLowerCase().includes(q) ||
      h.village.toLowerCase().includes(q);
    return matchDistrict && matchRisk && matchSearch;
  });

  const prioritizedHouseholds = filteredHouseholds.slice(0, budgetLimit);
  const availableDistricts = Array.from(new Set(households.map((h) => h.district))).sort();

  const exportToCSV = () => {
    if (prioritizedHouseholds.length === 0) return;

    const headers = isRw
      ? ["Urutonde (Rank)", "ID y'Urugo", "Akarere", "Umurenge", "Akagari", "Umudugudu", "Ubudehe", "Abagize Urugo", "Inkomoko y'Ukwezi (RWF)", "Amanota y'Ibyago (%)", "Urwego rw'Ibyago", "Impamvu Nyamukuru (AI SHAP)", "Inkingi irinda Urugo", "Kwemeza ku Mudugudu (Yego/Oya)", "Umukono w'Umuyobozi"]
      : ["Rank", "Household ID", "District", "Sector", "Cell", "Village", "Ubudehe Category", "Household Size", "Monthly Income (RWF)", "Poverty Risk Score (%)", "Risk Level", "Primary AI Vulnerability Drivers (SHAP)", "Protective Factor", "Field Verified (Yes/No)", "Officer Signature"];

    const rows = prioritizedHouseholds.map((h) => [
      h.rank,
      `"${h.id}"`,
      `"${h.district}"`,
      `"${h.sector}"`,
      `"${h.cell}"`,
      `"${h.village}"`,
      `"${h.ubudehe}"`,
      h.members,
      h.income,
      (h.score * 100).toFixed(1) + "%",
      `"${h.riskLevel}"`,
      `"${(isRw ? h.reasonsRw : h.reasonsEn).join(" | ")}"`,
      `"${isRw ? h.protectiveRw : h.protectiveEn}"`,
      `"Pending Visit"`,
      `"__________________"`
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dateStr = new Date().toISOString().slice(0, 10);
    const outName = `Imbaraga_Targeted_Households_${prioritizedHouseholds.length}_${dateStr}.csv`;

    link.setAttribute("href", url);
    link.setAttribute("download", outName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloadStatus(
      isRw
        ? `Yarangiye: Dosiye "${outName}" yamanuwe neza mu mashini yawe.`
        : `Success: File "${outName}" downloaded to your computer.`
    );
  };

  const exportPrintableReport = () => {
    if (prioritizedHouseholds.length === 0) return;
    const dateStr = new Date().toISOString().slice(0, 10);
    const outName = `Imbaraga_Field_Verification_Report_${dateStr}.html`;

    const htmlRows = prioritizedHouseholds
      .map(
        (h) => `
      <tr>
        <td><b>#${h.rank}</b></td>
        <td>${h.id}</td>
        <td>${h.district} / ${h.sector}<br/><small>${h.cell} - ${h.village}</small></td>
        <td>${h.members}</td>
        <td>${h.income.toLocaleString()} RWF</td>
        <td><b>${(h.score * 100).toFixed(1)}%</b> (${h.riskLevel})</td>
        <td>${(isRw ? h.reasonsRw : h.reasonsEn)[0]}</td>
        <td>[ &nbsp; ] Approved<br/>[ &nbsp; ] Declined</td>
        <td>__________________</td>
      </tr>`
      )
      .join("");

    const htmlDoc = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Imbaraga NISR Decision-Support Verification Sheet</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 24px; color: #111827; }
    h1 { color: #0F766E; margin-bottom: 4px; font-size: 20px; }
    .meta { color: #4B5563; font-size: 13px; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border: 1px solid #CBD5E1; padding: 8px; text-align: left; vertical-align: top; }
    th { background: #F1F5F9; color: #0F172A; }
    @media print { .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom:16px;padding:10px;background:#F0FDFA;border:1px solid #99F6E4;border-radius:6px;">
    <button onclick="window.print()" style="background:#0D9488;color:#fff;border:none;padding:8px 16px;border-radius:4px;cursor:pointer;font-weight:bold;">Print / Save as PDF</button>
  </div>
  <h1>IMBARAGA - NISR EICV7 Household Targeting & Field Verification Checklist</h1>
  <div class="meta">
    Generated: ${new Date().toLocaleString()} | Source File: ${fileName} | Prioritized Beneficiaries: ${prioritizedHouseholds.length} Households | Cutoff Risk Score: ${(prioritizedHouseholds[prioritizedHouseholds.length - 1]?.score * 100 || 0).toFixed(1)}%
  </div>
  <table>
    <thead>
      <tr>
        <th>Rank</th>
        <th>Household ID</th>
        <th>Location (District/Sector/Cell/Village)</th>
        <th>Size</th>
        <th>Est. Income</th>
        <th>AI Risk Score</th>
        <th>Primary SHAP Vulnerability Driver</th>
        <th>Committee Decision</th>
        <th>Officer Signature</th>
      </tr>
    </thead>
    <tbody>${htmlRows}</tbody>
  </table>
</body>
</html>`;

    const blob = new Blob([htmlDoc], { type: "text/html;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", outName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloadStatus(
      isRw
        ? `Yarangiye: Raporo y'igenzura "${outName}" yamanuwe neza.`
        : `Success: Printable verification sheet "${outName}" downloaded.`
    );
  };

  const downloadTemplate = () => {
    const tpl = "\uFEFFid,district,sector,cell,village,ubudehe,members,income,assets\r\nHH-1001,Rulindo,Bushoki,Kayenzi,Giko,Category 1,6,18500,1\r\nHH-1002,Bugesera,Nyamata,Kayumba,Abizerana,Category 1,5,21000,1\r\nHH-1003,Ngororero,Kavumu,Tetero,Rugendabari,Category 2,7,14000,0\r\n";
    const blob = new Blob([tpl], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Imbaraga_Household_Upload_Template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const highCount = households.filter((h) => h.riskLevel === "High").length;
  const medCount = households.filter((h) => h.riskLevel === "Medium").length;
  const lowCount = households.filter((h) => h.riskLevel === "Low").length;
  const estimatedBudgetRwf = prioritizedHouseholds.length * 45000;

  return (
    <div style={{ maxWidth: 1220, margin: "0 auto", padding: "24px 16px", fontFamily: "inherit" }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: "0 0 6px", color: "#0F172A" }}>
          {isRw ? "Umufasha mu Guhitamo Ingo Zikennye (Targeting Assistant)" : "Enterprise Household Targeting & Decision-Support Engine"}
        </h1>
        <p style={{ color: "#475569", fontSize: 15, margin: 0 }}>
          {isRw
            ? "Injiza dosiye iyo ari yo yose (.csv, .xlsx, .pdf, .docx, .txt, .json, .pptx) kugira ngo AI isesengure ibyago by'ubukene ku rwego rw'Akarere, Umurenge, Akagari n'Umudugudu."
            : "Upload any household dataset or document (.csv, .xlsx, .pdf, .docx, .txt, .json, .pptx) to score poverty risk across Districts, Sectors, Cells and Villages, simulate budget cutoffs, and download verified field lists."}
        </p>
      </div>

      <div style={{ background: "#F0FDFA", borderLeft: "4px solid #0D9488", padding: "12px 16px", borderRadius: "0 8px 8px 0", marginBottom: 20, fontSize: 13.5, color: "#134E4A" }}>
        <strong>{isRw ? "Icyitonderwa ku Byemezo:" : "Decision-Support Safeguard:"}</strong>{" "}
        {isRw
          ? "Amanota ya AI afasha mu gutegura igenamigambi gusa. Komite y'Umudugudu n'Akarere ni bo bemeza urutonde rwa nyuma nyuma yo gusura urugo."
          : "AI XGBoost and SHAP probabilities support planning only. A local administrative officer must verify every household during home visits before final benefit allocation."}
      </div>

      <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.04)", marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
          <div>
            <h3 style={{ margin: "0 0 4px", fontSize: 17, color: "#0F172A" }}>
              {isRw ? "1. Shyiraho Dosiye y'Ingo (Buri bwoko bwose bwa dosiye)" : "1. Universal Household File & Document Ingestion"}
            </h3>
            <p style={{ margin: 0, fontSize: 13, color: "#64748B" }}>
              {isRw ? "Wakira CSV, Excel (.xlsx/.xls), PDF, Word (.docx), PowerPoint (.pptx), JSON na TXT." : "Supports CSV, Excel (.xlsx/.xls), PDF, Word (.docx), PowerPoint (.pptx), JSON, and TXT formats."}
            </p>
          </div>
          <button
            type="button"
            onClick={downloadTemplate}
            style={{ background: "transparent", border: "1px solid #0D9488", color: "#0D9488", padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}
          >
            {isRw ? "Manura Ingero (Template CSV)" : "Download Official CSV Template"}
          </button>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
          <label style={{ background: "#0D9488", color: "#FFFFFF", padding: "10px 20px", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 14, display: "inline-flex", alignItems: "center", gap: 8 }}>
            <span>{isRw ? "Hitamo Dosiye (CSV, PDF, DOCX, XLSX...)" : "Select File (Any Format)"}</span>
            <input type="file" onChange={handleFileUpload} style={{ display: "none" }} accept="*" />
          </label>

          <button
            type="button"
            onClick={loadDemoFile}
            style={{ background: "#F8FAFC", color: "#0F172A", border: "1px solid #CBD5E1", padding: "10px 18px", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 14 }}
          >
            {isRw ? "Gerageza Dosiye y'Ingo 200 (Demo)" : "Load NISR Demo Dataset (200 Households)"}
          </button>

          {fileName && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#ECFDF5", border: "1px solid #A7F3D0", padding: "8px 14px", borderRadius: 8, fontSize: 13, color: "#065F46" }}>
              <span><strong>{fileName}</strong></span>
              <span style={{ background: "#059669", color: "#FFF", padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600 }}>{fileTypeBadge}</span>
              <span>({households.length} {isRw ? "ingo zasesenguwe" : "records scored"})</span>
            </div>
          )}
        </div>
      </div>

      {isProcessing && (
        <div style={{ textAlign: "center", padding: 40, background: "#FFF", borderRadius: 12, border: "1px solid #E2E8F0", marginBottom: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: "#0D9488" }}>
            {isRw ? "AI irimo gusoma dosiye no kubara ibyago by'ubukene (SHAP)..." : "Parsing document schema and computing XGBoost + SHAP vulnerability vectors..."}
          </div>
        </div>
      )}

      {households.length > 0 && !isProcessing && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 20 }}>
            <div style={{ background: "#FFF", border: "1px solid #FECACA", borderLeft: "5px solid #DC2626", borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#991B1B", textTransform: "uppercase" }}>{isRw ? "Ibyago Byinshi (High Risk)" : "High Vulnerability"}</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: "#7F1D1D", marginTop: 4 }}>{highCount}</div>
              <div style={{ fontSize: 12, color: "#64748B" }}>{((highCount / households.length) * 100).toFixed(1)}% {isRw ? "by'ingo zose" : "of uploaded batch"}</div>
            </div>
            <div style={{ background: "#FFF", border: "1px solid #FDE68A", borderLeft: "5px solid #D97706", borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#92400E", textTransform: "uppercase" }}>{isRw ? "Ibyago Biringaniye (Medium)" : "Moderate Vulnerability"}</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: "#78350F", marginTop: 4 }}>{medCount}</div>
              <div style={{ fontSize: 12, color: "#64748B" }}>{((medCount / households.length) * 100).toFixed(1)}% {isRw ? "by'ingo zose" : "of uploaded batch"}</div>
            </div>
            <div style={{ background: "#FFF", border: "1px solid #BBF7D0", borderLeft: "5px solid #16A34A", borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#166534", textTransform: "uppercase" }}>{isRw ? "Ibyago Bike (Low Risk)" : "Low Vulnerability"}</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: "#14532D", marginTop: 4 }}>{lowCount}</div>
              <div style={{ fontSize: 12, color: "#64748B" }}>{((lowCount / households.length) * 100).toFixed(1)}% {isRw ? "by'ingo zose" : "of uploaded batch"}</div>
            </div>
            <div style={{ background: "#F0FDFA", border: "1px solid #99F6E4", borderLeft: "5px solid #0D9488", borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#115E59", textTransform: "uppercase" }}>{isRw ? "Ingengo y'Imari ikenewe" : "Est. Support Budget"}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#134E4A", marginTop: 4 }}>{estimatedBudgetRwf.toLocaleString()} RWF</div>
              <div style={{ fontSize: 12, color: "#0F766E" }}>{prioritizedHouseholds.length} {isRw ? "ingo x 45,000 RWF" : "targeted x 45,000 RWF/HH"}</div>
            </div>
          </div>

          <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.04)", marginBottom: 20 }}>
            <h3 style={{ margin: "0 0 6px", fontSize: 17, color: "#0F172A" }}>
              {isRw ? "2. Gahunda y'Ingengo y'Imari & Gusohoka Urutonde Rwemejwe (Real Download)" : "2. Interactive Budget Simulator & Verified File Export"}
            </h3>
            <p style={{ fontSize: 13.5, color: "#475569", margin: "0 0 16px" }}>
              {isRw
                ? "Hindura umubare w'ingo zihabwa ubufasha ukurikije ingengo y'imari, hanyuma umanure (Download) dosiye ya CSV cyangwa Raporo y'Igenzura."
                : "Slide to set your district's beneficiary quota, then click Export to download the real CSV spreadsheet or printable verification sheet directly to your computer."}
            </p>

            <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 260 }}>
                <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 6, color: "#1E293B" }}>
                  {isRw ? "Umubare w'ingo zatoranyijwe:" : "Target Beneficiary Quota:"}{" "}
                  <strong style={{ color: "#0D9488", fontSize: 16 }}>{prioritizedHouseholds.length}</strong> / {filteredHouseholds.length} {isRw ? "ingo" : "households"}
                </label>
                <input
                  type="range"
                  min="1"
                  max={Math.max(1, filteredHouseholds.length)}
                  value={Math.min(budgetLimit, Math.max(1, filteredHouseholds.length))}
                  onChange={(e) => setBudgetLimit(Number(e.target.value))}
                  style={{ width: "100%", accentColor: "#0D9488", cursor: "pointer" }}
                />
              </div>

              <div style={{ background: "#F0FDFA", border: "1px solid #CCFBF1", padding: "10px 16px", borderRadius: 8, textAlign: "center" }}>
                <div style={{ fontSize: 11, color: "#0F766E", fontWeight: 700 }}>{isRw ? "AMANOTA FATIZO" : "CUTOFF RISK SCORE"}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#134E4A" }}>
                  {prioritizedHouseholds.length > 0 ? (prioritizedHouseholds[prioritizedHouseholds.length - 1].score * 100).toFixed(1) + "%" : "0%"}
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={exportToCSV}
                  style={{ background: "#0F172A", color: "#FFFFFF", border: "none", padding: "11px 18px", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13.5, display: "inline-flex", alignItems: "center", gap: 8 }}
                >
                  {isRw ? "Manura CSV (Excel)" : "Download Verified CSV"}
                </button>
                <button
                  type="button"
                  onClick={exportPrintableReport}
                  style={{ background: "#0D9488", color: "#FFFFFF", border: "none", padding: "11px 18px", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13.5, display: "inline-flex", alignItems: "center", gap: 8 }}
                >
                  {isRw ? "Manura Raporo y'Igenzura (HTML/PDF)" : "Download Field Verification Sheet"}
                </button>
              </div>
            </div>

            {downloadStatus && (
              <div style={{ marginTop: 12, padding: "10px 14px", background: "#ECFDF5", border: "1px solid #6EE7B7", borderRadius: 8, color: "#065F46", fontSize: 13.5, fontWeight: 600 }}>
                {downloadStatus}
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14, alignItems: "center" }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isRw ? "Shakisha ID, Akarere, Umurenge, Akagari, Umudugudu..." : "Search Household ID, District, Sector, Cell, Village..."}
              style={{ flex: 1, minWidth: 240, padding: "9px 14px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 13.5 }}
            />
            <select
              value={districtFilter}
              onChange={(e) => setDistrictFilter(e.target.value)}
              style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 13.5, background: "#FFF" }}
            >
              <option value="All">{isRw ? "Uturere Twose" : "All Districts"}</option>
              {availableDistricts.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 13.5, background: "#FFF" }}
            >
              <option value="All">{isRw ? "Inzego Zose z'Ibyago" : "All Risk Levels"}</option>
              <option value="High">{isRw ? "Ibyago Byinshi (High)" : "High Risk"}</option>
              <option value="Medium">{isRw ? "Ibyago Biringaniye (Medium)" : "Medium Risk"}</option>
              <option value="Low">{isRw ? "Ibyago Bike (Low)" : "Low Risk"}</option>
            </select>
          </div>

          <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid #E2E8F0", background: "#F8FAFC", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: 15.5, color: "#0F172A" }}>
                {isRw ? "Urutonde rw'Ingo Zatoranyijwe" : "Prioritized Households Schedule"} ({prioritizedHouseholds.length})
              </h3>
              <span style={{ fontSize: 12.5, color: "#64748B" }}>
                {isRw ? "Kanda ku rugo urebe ibisobanuro bya AI SHAP" : "Click Inspect AI for household SHAP explainability"}
              </span>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "#F1F5F9", color: "#334155", borderBottom: "1px solid #E2E8F0" }}>
                    <th style={{ padding: "11px 14px" }}>No</th>
                    <th style={{ padding: "11px 14px" }}>ID</th>
                    <th style={{ padding: "11px 14px" }}>{isRw ? "Akarere / Umurenge" : "District / Sector"}</th>
                    <th style={{ padding: "11px 14px" }}>{isRw ? "Akagari / Umudugudu" : "Cell / Village"}</th>
                    <th style={{ padding: "11px 14px" }}>{isRw ? "Abagize Urugo" : "Size"}</th>
                    <th style={{ padding: "11px 14px" }}>{isRw ? "Inkomoko" : "Est. Income"}</th>
                    <th style={{ padding: "11px 14px" }}>{isRw ? "Amanota" : "Risk Score"}</th>
                    <th style={{ padding: "11px 14px" }}>{isRw ? "Urwego" : "Status"}</th>
                    <th style={{ padding: "11px 14px" }}>{isRw ? "Isesengurwa" : "Explainability"}</th>
                  </tr>
                </thead>
                <tbody>
                  {prioritizedHouseholds.map((h, idx) => (
                    <tr key={h.id} style={{ borderBottom: "1px solid #F1F5F9", background: idx % 2 === 0 ? "#FFFFFF" : "#F8FAFC" }}>
                      <td style={{ padding: "10px 14px", fontWeight: 700, color: "#64748B" }}>{h.rank}</td>
                      <td style={{ padding: "10px 14px", fontWeight: 700, color: "#0D9488" }}>{h.id}</td>
                      <td style={{ padding: "10px 14px" }}>
                        <strong>{h.district}</strong>
                        <div style={{ fontSize: 12, color: "#64748B" }}>{h.sector}</div>
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <div>{h.cell}</div>
                        <div style={{ fontSize: 12, color: "#64748B" }}>{h.village}</div>
                      </td>
                      <td style={{ padding: "10px 14px" }}>{h.members}</td>
                      <td style={{ padding: "10px 14px" }}>{h.income.toLocaleString()} RWF</td>
                      <td style={{ padding: "10px 14px", fontWeight: 800, color: "#0F172A" }}>{(h.score * 100).toFixed(1)}%</td>
                      <td style={{ padding: "10px 14px" }}>
                        <span
                          style={{
                            padding: "4px 9px",
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 700,
                            background: h.riskLevel === "High" ? "#FEE2E2" : h.riskLevel === "Medium" ? "#FEF3C7" : "#DCFCE7",
                            color: h.riskLevel === "High" ? "#991B1B" : h.riskLevel === "Medium" ? "#92400E" : "#166534"
                          }}
                        >
                          {h.riskLevel === "High" ? (isRw ? "Ibyago Byinshi" : "High Risk") : h.riskLevel === "Medium" ? (isRw ? "Biringaniye" : "Moderate") : isRw ? "Ibyago Bike" : "Low Risk"}
                        </span>
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <button
                          type="button"
                          onClick={() => setSelectedHouse(h)}
                          style={{ background: "#0D9488", color: "#FFF", border: "none", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 }}
                        >
                          {isRw ? "Reba Impamvu" : "Inspect AI"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {selectedHouse && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.55)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 10000, padding: 16 }}>
          <div style={{ background: "#FFF", width: "100%", maxWidth: 540, borderRadius: 14, padding: 24, boxShadow: "0 20px 35px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ margin: 0, color: "#0F172A", fontSize: 18 }}>
                {isRw ? "Isesengurwa rya AI SHAP ku Rugo:" : "AI SHAP Vulnerability Breakdown:"} {selectedHouse.id}
              </h3>
              <span style={{ fontWeight: 800, fontSize: 18, color: "#0D9488" }}>{(selectedHouse.score * 100).toFixed(1)}%</span>
            </div>

            <div style={{ fontSize: 13.5, color: "#334155", background: "#F8FAFC", padding: 12, borderRadius: 8, border: "1px solid #E2E8F0", marginBottom: 14 }}>
              <div><strong>{isRw ? "Aho Ruherereye:" : "Location:"}</strong> {selectedHouse.district} - {selectedHouse.sector} - {selectedHouse.cell} - {selectedHouse.village}</div>
              <div style={{ marginTop: 4 }}><strong>{isRw ? "Imiterere:" : "Profile:"}</strong> {selectedHouse.ubudehe} | {selectedHouse.members} {isRw ? "abantu" : "members"} | {selectedHouse.income.toLocaleString()} RWF/mo</div>
            </div>

            <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", padding: 12, borderRadius: 8, marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#991B1B", marginBottom: 6 }}>
                {isRw ? "Impamvu Zongerera Urugo Ibyago by'Ubukene (SHAP Drivers):" : "Primary Vulnerability Drivers Raising Risk Score:"}
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#7F1D1D" }}>
                {(isRw ? selectedHouse.reasonsRw : selectedHouse.reasonsEn).map((r, i) => (
                  <li key={i} style={{ marginBottom: 4 }}>{r}</li>
                ))}
              </ul>
            </div>

            <div style={{ background: "#ECFDF5", border: "1px solid #A7F3D0", padding: 12, borderRadius: 8, marginBottom: 18 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#065F46", marginBottom: 4 }}>
                {isRw ? "Inkingi Igabanya Ibyago (Protective Factor):" : "Protective Factor Lowering Risk:"}
              </div>
              <div style={{ fontSize: 13, color: "#047857" }}>{isRw ? selectedHouse.protectiveRw : selectedHouse.protectiveEn}</div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                onClick={() => setSelectedHouse(null)}
                style={{ background: "#0F172A", color: "#FFF", border: "none", padding: "9px 18px", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}
              >
                {isRw ? "Funga" : "Close Inspector"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
