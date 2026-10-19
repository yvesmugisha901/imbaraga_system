import { Router } from 'express';
import { db } from '../db/client';

export const kpisRouter = Router();

// Official national headcount poverty, EICV7 2024 (Table 0.1). Not recomputed from district rows.
const NATIONAL_POVERTY_PCT = 27.4;

kpisRouter.get('/', (_req, res) => {
  const highRisk = db.prepare('SELECT COUNT(*) c FROM districts WHERE risk_score IS NOT NULL AND double_exclusion = 1').get() as { c: number };
  const scored = db.prepare('SELECT COALESCE(SUM(row_count),0) c FROM score_batches').get() as { c: number };
  const withAccess = db.prepare('SELECT COUNT(*) c FROM districts WHERE financial_access_rate IS NOT NULL').get() as { c: number };

  res.json({
    povertyPct: NATIONAL_POVERTY_PCT,
    povertySource: 'EICV7 2023/24, NISR (Table 0.1)',
    exclusionPct: null,                                   // pending: needs financial access data
    highRiskDistrictCount: withAccess.c === 0 ? null : highRisk.c,
    householdsScored: scored.c,
  });
});