import { useState, useRef } from 'react';
import {
  useImbaragaLang,
  translateDriverOrAdviceToRw,
  type HouseholdRecord,
  type UploadedBatchSummary
} from '../utils/imbaragaStore';

const DISTRICT_BASELINES: Record<string, number> = {
  Nyamagabe: 51.4, Gisagara: 45.6, Nyanza: 43.3, Nyaruguru: 41.9, Karongi: 40.2,
  Rutsiro: 39.4, Ngororero: 38.8, Burera: 38.1, Nyamasheke: 37.5, Ruhango: 35.8,
  Gakenke: 34.2, Kirehe: 33.6, Ngoma: 32.9, Gicumbi: 31.8, Rusizi: 31.2,
  Rubavu: 30.5, Muhanga: 29.1, Huye: 28.7, Rulindo: 28.4, Musanze: 27.6,
  Kamonyi: 26.9, Bugesera: 26.1, Kayonza: 25.4, Rwamagana: 24.1, Gatsibo: 23.8,
  Nyagatare: 22.9, Nyabihu: 22.4, Nyarugenge: 14.8, Gasabo: 13.9, Kicukiro: 11.2
};

function parseCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function analyzeUploadedCsv(csvText: string, fileName: string): UploadedBatchSummary {
  const cleaned = csvText.replace(/^\uFEFF/, '').trim();
  const lines = cleaned.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length < 2) {
    throw new Error('The uploaded file must contain a header row and at least one household record.');
  }

  const delimiter = lines[0].includes(';') && !lines[0].includes(',') ? ';' : ',';
  const rawHeaders = parseCsvLine(lines[0], delimiter);
  const headers = rawHeaders.map(normalizeHeader);

  const findIdx = (candidates: string[], fallback: number): number => {
    for (const c of candidates) {
      const idx = headers.findIndex(h => h === c || h.includes(c));
      if (idx !== -1) return idx;
    }
    return fallback;
  };

  const idxId = findIdx(['id', 'householdid', 'hhid', 'code', 'record'], 0);
  const idxDistrict = findIdx(['district', 'akarere'], 1);
  const idxSector = findIdx(['sector', 'umurenge'], 2);
  const idxCell = findIdx(['cell', 'akagari'], 3);
  const idxVillage = findIdx(['village', 'umudugudu'], 4);
  const idxUbudehe = findIdx(['ubudehe', 'category', 'icyiciro', 'tier'], 5);
  const idxMembers = findIdx(['members', 'householdsize', 'size', 'dependents', 'abantu'], 6);
  const idxIncome = findIdx(['income', 'monthlyincome', 'consumption', 'expenditure', 'amafaranga'], 7);
  const idxAssets = findIdx(['assets', 'livestock', 'land', 'imitungo', 'score'], 8);

  const records: HouseholdRecord[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i], delimiter);
    if (cols.length <= 1 && !cols[0]) continue;

    const rawId = cols[idxId] || `HH-${String(i).padStart(4, '0')}`;
    const district = cols[idxDistrict] || 'Unassigned';
    const sector = cols[idxSector] || 'Unassigned';
    const cell = cols[idxCell] || 'Unassigned';
    const village = cols[idxVillage] || 'Unassigned';
    const ubudehe = cols[idxUbudehe] || 'Category 2';

    const membersVal = parseFloat((cols[idxMembers] || '').replace(/[^0-9.-]/g, ''));
    const members = Number.isFinite(membersVal) && membersVal > 0 ? Math.round(membersVal) : 4;

    const incomeVal = parseFloat((cols[idxIncome] || '').replace(/[^0-9.-]/g, ''));
    const income = Number.isFinite(incomeVal) && incomeVal >= 0 ? incomeVal : 25000;

    const assetsVal = parseFloat((cols[idxAssets] || '').replace(/[^0-9.-]/g, ''));
    const assets = Number.isFinite(assetsVal) && assetsVal >= 0 ? assetsVal : 1;

    const districtRate = DISTRICT_BASELINES[district] ?? 27.4;
    const districtFactor = (districtRate / 55.0) * 22;
    const incomeFactor = Math.max(0, Math.min(38, ((45000 - Math.min(income, 45000)) / 45000) * 38));
    const sizeFactor = Math.min(18, (Math.max(1, members) / 9) * 18);
    const assetFactor = Math.max(0, 12 - Math.min(12, assets * 3));

    let ubudeheFactor = 5;
    const uLower = ubudehe.toLowerCase();
    if (uLower.includes('1') || uLower.includes('a') || uLower.includes('extreme')) ubudeheFactor = 10;
    else if (uLower.includes('2') || uLower.includes('b')) ubudeheFactor = 6;
    else if (uLower.includes('3') || uLower.includes('c')) ubudeheFactor = 2;
    else if (uLower.includes('4') || uLower.includes('d')) ubudeheFactor = 0;

    let extraColumnSignal = 0;
    for (let c = 0; c < cols.length; c++) {
      if (![idxId, idxDistrict, idxSector, idxCell, idxVillage, idxUbudehe, idxMembers, idxIncome, idxAssets].includes(c)) {
        const val = (cols[c] || '').toLowerCase();
        if (val === '0' || val === 'no' || val === 'false' || val === 'none' || val === 'low') {
          extraColumnSignal += 2.5;
        }
      }
    }

    const rawScore = Math.min(99.4, Math.max(4.0, districtFactor + incomeFactor + sizeFactor + assetFactor + ubudeheFactor + Math.min(8, extraColumnSignal)));
    const vulnerabilityScore = Number(rawScore.toFixed(1));

    const riskLevel: 'High' | 'Medium' | 'Low' =
      vulnerabilityScore >= 66 ? 'High' : vulnerabilityScore >= 42 ? 'Medium' : 'Low';

    const driversEn: string[] = [];
    const driversRw: string[] = [];
    if (income < 20000) {
      driversEn.push('Severe income deficit');
      driversRw.push('Amikoro make cyane');
    } else if (income < 35000) {
      driversEn.push('Low household income');
      driversRw.push("Amikoro make y'urugo");
    }
    if (members >= 6) {
      driversEn.push(`High dependency (${members} members)`);
      driversRw.push(`Umubare munini w'abagize urugo (${members})`);
    }
    if (assets === 0) {
      driversEn.push('Zero productive assets');
      driversRw.push('Nta mitungo ibyara inyungu');
    }
    if (districtRate >= 35) {
      driversEn.push(`High-poverty district (${districtRate}%)`);
      driversRw.push(`Akarere gafite ubukene bwinshi (${districtRate}%)`);
    }
    if (driversEn.length === 0) {
      driversEn.push('Baseline socio-economic exposure');
      driversRw.push("Ibyago bisanzwe by'imibereho");
    }

    const recommendedIntervention =
      riskLevel === 'High'
        ? 'Direct VUP cash transfer & financial inclusion onboarding'
        : riskLevel === 'Medium'
        ? 'Asset-building cooperative & micro-credit linkage'
        : 'Routine monitoring & community savings group';

    const recommendedInterventionRw =
      riskLevel === 'High'
        ? "Inkunga y'amafaranga ya VUP no kwinjizwa muri serivisi z'imari"
        : riskLevel === 'Medium'
        ? "Kwinjizwa muri koperative y'iterambere no guhabwa inguzanyo nto"
        : 'Gukurikiranwa bisanzwe no kwizigamira mu matsinda (Ibimina)';

    records.push({
      id: rawId,
      district,
      sector,
      cell,
      village,
      ubudehe,
      members,
      income,
      assets,
      vulnerabilityScore,
      riskLevel,
      primaryDriver: driversEn.slice(0, 2).join(' + '),
      primaryDriverRw: driversRw.slice(0, 2).join(' + '),
      recommendedIntervention,
      recommendedInterventionRw
    });
  }

  if (records.length === 0) {
    throw new Error('No valid household records could be parsed from the uploaded file.');
  }

  records.sort((a, b) => b.vulnerabilityScore - a.vulnerabilityScore);

  const highRiskCount = records.filter(r => r.riskLevel === 'High').length;
  const mediumRiskCount = records.filter(r => r.riskLevel === 'Medium').length;
  const lowRiskCount = records.filter(r => r.riskLevel === 'Low').length;
  const avgScore = Number((records.reduce((acc, r) => acc + r.vulnerabilityScore, 0) / records.length).toFixed(1));
  const avgIncome = Math.round(records.reduce((acc, r) => acc + r.income, 0) / records.length);

  const unique = (arr: string[]) => Array.from(new Set(arr.filter(x => x && x !== 'Unassigned')));

  return {
    fileName,
    uploadedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    totalHouseholds: records.length,
    highRiskCount,
    mediumRiskCount,
    lowRiskCount,
    avgScore,
    avgIncome,
    districtsCovered: unique(records.map(r => r.district)),
    sectorsCovered: unique(records.map(r => r.sector)),
    cellsCovered: unique(records.map(r => r.cell)),
    villagesCovered: unique(records.map(r => r.village)),
    records
  };
}

export default function Targeting() {
  const [lang] = useImbaragaLang();
  const isRw = lang === 'RW';

  const [batch, setBatch] = useState<UploadedBatchSummary | null>(() => {
    try {
      const saved = localStorage.getItem('imbaraga_uploaded_batch');
      if (saved) {
        const parsed = JSON.parse(saved) as UploadedBatchSummary;
        window.__IMBARAGA_UPLOADED_DATA__ = parsed;
        return parsed;
      }
    } catch {
      /* ignore */
    }
    return null;
  });
  const [error, setError] = useState<string | null>(null);
  const [filterRisk, setFilterRisk] = useState<'All' | 'High' | 'Medium' | 'Low'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileUpload = (file: File) => {
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const summary = analyzeUploadedCsv(content, file.name);
        setBatch(summary);
        window.__IMBARAGA_UPLOADED_DATA__ = summary;
        try {
          localStorage.setItem('imbaraga_uploaded_batch', JSON.stringify(summary));
        } catch {
          /* storage quota */
        }
        window.dispatchEvent(new CustomEvent('imbaraga-data-updated', { detail: summary }));
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to parse CSV file.');
      }
    };
    reader.onerror = () => setError(isRw ? 'Ikosa mu gusoma dosiye.' : 'Error reading the selected file.');
    reader.readAsText(file);
  };

  const handleClearData = () => {
    setBatch(null);
    setError(null);
    window.__IMBARAGA_UPLOADED_DATA__ = null;
    localStorage.removeItem('imbaraga_uploaded_batch');
    window.dispatchEvent(new CustomEvent('imbaraga-data-updated', { detail: null }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDownloadTemplate = () => {
    const csvHeader = 'id,district,sector,cell,village,ubudehe,members,income,assets\r\n';
    const blob = new Blob([csvHeader], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'imbaraga_targeting_schema.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportResults = () => {
    if (!batch) return;
    const header = 'id,district,sector,cell,village,ubudehe,members,income,assets,vulnerability_score,risk_level,primary_driver,recommended_intervention\r\n';
    const rows = batch.records.map(r =>
      `"${r.id}","${r.district}","${r.sector}","${r.cell}","${r.village}","${r.ubudehe}",${r.members},${r.income},${r.assets},${r.vulnerabilityScore},"${r.riskLevel}","${r.primaryDriver}","${r.recommendedIntervention}"`
    ).join('\r\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scored_${batch.fileName.replace(/\.csv$/i, '')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredRecords = batch
    ? batch.records.filter(r => {
        const matchesRisk = filterRisk === 'All' || r.riskLevel === filterRisk;
        const q = searchQuery.trim().toLowerCase();
        const matchesQuery =
          !q ||
          r.id.toLowerCase().includes(q) ||
          r.district.toLowerCase().includes(q) ||
          r.sector.toLowerCase().includes(q) ||
          r.cell.toLowerCase().includes(q) ||
          r.village.toLowerCase().includes(q) ||
          r.primaryDriver.toLowerCase().includes(q);
        return matchesRisk && matchesQuery;
      })
    : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {isRw ? 'Sisitemu yo Gutoranya no Gusesengura Ingo Zikeneye Ubufasha' : 'Household Vulnerability Targeting Engine'}
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            {isRw
              ? "Shyiramo dosiye y'amakuru y'ingo (CSV) kugira ngo ubarure igipimo cy'ubukene, umenye impamvu zibitera, kandi ukore urutonde rw'ingo zikeneye ubufasha bwihutirwa ukurikije NISR EICV7."
              : 'Upload household survey datasets (CSV) to compute vulnerability scores, identify risk drivers, and generate prioritized intervention lists aligned with NISR EICV7 baselines.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition"
          >
            {isRw ? 'Manura Imbonerahamwe CSV' : 'Download CSV Schema'}
          </button>
          {batch && (
            <>
              <button
                type="button"
                onClick={handleExportResults}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-md hover:bg-emerald-800 transition"
              >
                {isRw ? 'Ohereza CSV Yasesenguwe' : 'Export Scored CSV'}
              </button>
              <button
                type="button"
                onClick={handleClearData}
                className="px-3.5 py-2 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-md hover:bg-rose-100 transition"
              >
                {isRw ? 'Siba Dosiye' : 'Clear Dataset'}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="mt-6 bg-white border border-slate-200 rounded-lg p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
              {isRw ? "Kwinjiza Dosiye y'Ingo (CSV)" : 'Dataset Input'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {isRw
                ? 'Inkingi zemewe: id, district, sector, cell, village, ubudehe, members, income, assets.'
                : 'Supported columns: id, district, sector, cell, village, ubudehe, members, income, assets (plus any custom indicator columns).'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
              }}
              className="block w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-900 file:text-white hover:file:bg-slate-800 cursor-pointer"
            />
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-800 font-medium">
            {error}
          </div>
        )}
      </div>

      {!batch ? (
        <div className="mt-8 bg-slate-50 border border-dashed border-slate-300 rounded-lg p-12 text-center">
          <p className="text-sm font-semibold text-slate-700">
            {isRw ? "Nta Dosiye y'Ingo Irashyirwamo" : 'No Household Dataset Loaded'}
          </p>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            {isRw
              ? "Hitamo dosiye ya CSV hejuru irimo amakuru y'ingo zo mu karere, umurenge, akagari, cyangwa umudugudu kugira ngo usesengure ibyago by'ubukene."
              : 'Select a CSV file above containing household records from any district, sector, cell, or village to run live vulnerability scoring and enable AI dataset querying.'}
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          <div className="bg-slate-900 text-white rounded-lg px-5 py-3.5 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-4">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
              <span className="font-semibold">
                {isRw ? `Dosiye ikoreshwa: ${batch.fileName}` : `Active Dataset: ${batch.fileName}`}
              </span>
              <span className="text-slate-400">
                {isRw ? `Yasesenguwe saa ${batch.uploadedAt}` : `Processed at ${batch.uploadedAt}`}
              </span>
            </div>
            <div className="flex items-center gap-4 text-slate-300">
              <span>{isRw ? 'Uturere' : 'Districts'}: <strong className="text-white">{batch.districtsCovered.length || 1}</strong></span>
              <span>{isRw ? 'Imirenge' : 'Sectors'}: <strong className="text-white">{batch.sectorsCovered.length || 1}</strong></span>
              <span>{isRw ? 'Imidugudu' : 'Villages'}: <strong className="text-white">{batch.villagesCovered.length || 1}</strong></span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <p className="text-xs text-slate-500 font-medium">{isRw ? 'Ingo Zasesenguwe' : 'Households Analyzed'}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{batch.totalHouseholds.toLocaleString()}</p>
              <p className="text-xs text-slate-500 mt-1">
                {isRw ? `Impuzandengo y'amikoro: ${batch.avgIncome.toLocaleString()} RWF` : `Avg Income: ${batch.avgIncome.toLocaleString()} RWF`}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <p className="text-xs text-slate-500 font-medium">{isRw ? 'Ibyago Bikomeye (High Risk)' : 'High Priority (High Risk)'}</p>
              <p className="text-2xl font-bold text-rose-700 mt-1">
                {batch.highRiskCount.toLocaleString()}{' '}
                <span className="text-sm font-normal text-slate-500">
                  ({((batch.highRiskCount / batch.totalHouseholds) * 100).toFixed(1)}%)
                </span>
              </p>
              <p className="text-xs text-slate-500 mt-1">{isRw ? 'Ubufasha bwihutirwa burakenewe' : 'Immediate intervention required'}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <p className="text-xs text-slate-500 font-medium">{isRw ? 'Ibyago Biringaniye (Medium Risk)' : 'Moderate Exposure (Medium Risk)'}</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">
                {batch.mediumRiskCount.toLocaleString()}{' '}
                <span className="text-sm font-normal text-slate-500">
                  ({((batch.mediumRiskCount / batch.totalHouseholds) * 100).toFixed(1)}%)
                </span>
              </p>
              <p className="text-xs text-slate-500 mt-1">{isRw ? 'Inkunga yo kwiteza imbere' : 'Targeted livelihood support'}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <p className="text-xs text-slate-500 font-medium">{isRw ? "Impuzandengo y'Igipimo cy'Ubukene" : 'Mean Vulnerability Index'}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{batch.avgScore} / 100</p>
              <p className="text-xs text-slate-500 mt-1">
                {isRw ? `Ibyago Bike: Ingo ${batch.lowRiskCount.toLocaleString()}` : `Low Risk: ${batch.lowRiskCount.toLocaleString()} households`}
              </p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {(['All', 'High', 'Medium', 'Low'] as const).map(level => {
                const labelRw =
                  level === 'All'
                    ? `Zose (${batch.totalHouseholds})`
                    : level === 'High'
                    ? 'Ibyago Bikomeye'
                    : level === 'Medium'
                    ? 'Ibyago Biringaniye'
                    : 'Ibyago Bike';
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setFilterRisk(level)}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                      filterRisk === level
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {isRw ? labelRw : level === 'All' ? `All (${batch.totalHouseholds})` : `${level} Risk`}
                  </button>
                );
              })}
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isRw ? 'Shakisha ID, akarere, umurenge, akagari, umudugudu...' : 'Filter by ID, district, sector, cell, village...'}
              className="px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:border-slate-900 sm:w-72"
            />
          </div>

          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase font-semibold">
                  <tr>
                    <th className="px-4 py-3">{isRw ? "ID y'Urugo" : 'Household ID'}</th>
                    <th className="px-4 py-3">{isRw ? 'Aho biherereye (Akarere / Umurenge / Akagari / Umudugudu)' : 'Location (District / Sector / Cell / Village)'}</th>
                    <th className="px-4 py-3">{isRw ? 'Abagize Urugo' : 'Members'}</th>
                    <th className="px-4 py-3">{isRw ? 'Amikoro (RWF)' : 'Income (RWF)'}</th>
                    <th className="px-4 py-3">{isRw ? 'Igipimo' : 'Score'}</th>
                    <th className="px-4 py-3">{isRw ? "Urwego rw'Ibyago" : 'Risk Level'}</th>
                    <th className="px-4 py-3">{isRw ? 'Impamvu Nyamukuru' : 'Primary Vulnerability Drivers'}</th>
                    <th className="px-4 py-3">{isRw ? 'Ubufasha Busabwa' : 'Recommended Action'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-800">
                  {filteredRecords.slice(0, 250).map((r, idx) => (
                    <tr key={`${r.id}-${idx}`} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">{r.id}</td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-900">{r.district}</span>
                        <span className="text-slate-500"> / {r.sector} / {r.cell} / {r.village}</span>
                      </td>
                      <td className="px-4 py-3">{r.members}</td>
                      <td className="px-4 py-3">{r.income.toLocaleString()}</td>
                      <td className="px-4 py-3 font-bold">{r.vulnerabilityScore}%</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                            r.riskLevel === 'High'
                              ? 'bg-rose-100 text-rose-800'
                              : r.riskLevel === 'Medium'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {isRw
                            ? r.riskLevel === 'High'
                              ? 'Bikomeye'
                              : r.riskLevel === 'Medium'
                              ? 'Biringaniye'
                              : 'Bike'
                            : r.riskLevel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{isRw ? translateDriverOrAdviceToRw(r.primaryDriver) : r.primaryDriver}</td>
                      <td className="px-4 py-3 text-slate-600">{isRw ? translateDriverOrAdviceToRw(r.recommendedIntervention) : r.recommendedIntervention}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
