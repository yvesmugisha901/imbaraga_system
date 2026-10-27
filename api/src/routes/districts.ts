import { Router } from 'express';
import { db } from '../db/client';

export const districtsRouter = Router();

type Row = {
  code: string; name_en: string; name_rw: string | null; province: string;
  population: number; density_per_km2: number | null; urban_pct: number | null;
  poverty_rate: number | null; poverty_rate_source: string;
  financial_access_rate: number | null; access_source: string;
  exclusion_gap: number | null; risk_score: number | null; double_exclusion: number;
  // official EICV7 indicators (null until seeded from district_estimates.csv)
  poverty_rate_modelled: number | null; poverty_eicv5: number | null; poverty_change_points: number | null;
  rank_official: number | null; access_index: number | null; high_poverty_low_access: number;
  dependency_ratio: number | null; econ_dependency: number | null; agri_workers_pct: number | null;
  no_livestock_pct: number | null; land_below_half_ha_pct: number | null; neet_pct: number | null;
  youth_literacy_pct: number | null; improved_water_pct: number | null; improved_sanitation_pct: number | null;
  electricity_pct: number | null; mobile_phone_pct: number | null; smartphone_pct: number | null;
  cement_floor_pct: number | null;
  banked_pct: number | null; other_formal_pct: number | null;
  informal_only_pct: number | null; excluded_pct: number | null;
};

const toDto = (r: Row) => ({
  code: r.code,
  nameEn: r.name_en,
  nameRw: r.name_rw,
  province: r.province,
  population: r.population,
  densityPerKm2: r.density_per_km2,
  urbanPct: r.urban_pct,
  povertyRate: r.poverty_rate,
  povertyRateSource: r.poverty_rate_source,   // province_eicv7 | official_eicv7 | microdata | modelled
  financialAccessRate: r.financial_access_rate,
  accessSource: r.access_source,              // pending | finscope | modelled
  exclusionGap: r.exclusion_gap,
  riskScore: r.risk_score,
  doubleExclusionFlag: r.double_exclusion === 1,

  povertyRateModelled: r.poverty_rate_modelled,   // old simulated estimate, comparison only
  povertyEicv5: r.poverty_eicv5,
  povertyChangePoints: r.poverty_change_points,   // EICV7 minus EICV5, percentage points
  rankOfficial: r.rank_official,                  // 1 = highest official poverty
  accessIndex: r.access_index,                    // mean of water, sanitation, electricity, mobile phone (%)
  highPovertyLowAccess: r.high_poverty_low_access === 1,
  financialAccess: {                              // FinScope 2024, % of adults; null if not loaded
    bankedPct: r.banked_pct,
    otherFormalPct: r.other_formal_pct,
    informalOnlyPct: r.informal_only_pct,
    excludedPct: r.excluded_pct,
  },
  indicators: {
    dependencyRatio: r.dependency_ratio,
    econDependency: r.econ_dependency,
    agriWorkersPct: r.agri_workers_pct,
    noLivestockPct: r.no_livestock_pct,
    landBelowHalfHaPct: r.land_below_half_ha_pct,
    neetPct: r.neet_pct,
    youthLiteracyPct: r.youth_literacy_pct,
    improvedWaterPct: r.improved_water_pct,
    improvedSanitationPct: r.improved_sanitation_pct,
    electricityPct: r.electricity_pct,
    mobilePhonePct: r.mobile_phone_pct,
    smartphonePct: r.smartphone_pct,
    cementFloorPct: r.cement_floor_pct,
  },
});

districtsRouter.get('/', (_req, res) => {
  const rows = db.prepare('SELECT * FROM districts ORDER BY province, name_en').all() as Row[];
  res.json(rows.map(toDto));
});

districtsRouter.get('/:code', (req, res) => {
  const row = db.prepare('SELECT * FROM districts WHERE code = ?').get(req.params.code) as Row | undefined;
  if (!row) return res.status(404).json({ error: { code: 'NOT_FOUND', message: `District '${req.params.code}' not found` } });
  res.json(toDto(row));
});