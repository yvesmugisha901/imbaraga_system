import { Router } from 'express';
import { db } from '../db/client';

export const districtsRouter = Router();

type Row = {
  code: string; name_en: string; name_rw: string | null; province: string;
  population: number; density_per_km2: number | null; urban_pct: number | null;
  poverty_rate: number | null; poverty_rate_source: string;
  financial_access_rate: number | null; access_source: string;
  exclusion_gap: number | null; risk_score: number | null; double_exclusion: number;
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
  povertyRateSource: r.poverty_rate_source,   // province_eicv7 | microdata | modelled
  financialAccessRate: r.financial_access_rate,
  accessSource: r.access_source,              // pending | finscope | modelled
  exclusionGap: r.exclusion_gap,
  riskScore: r.risk_score,
  doubleExclusionFlag: r.double_exclusion === 1,
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