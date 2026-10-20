import express, { Router } from 'express';
import { parse } from 'csv-parse/sync';
import { db } from '../db/client';
import { REQUIRED_COLUMNS, validateRows, type RowError } from '../validators/household';
import { getScorer, ScorerUnavailableError } from '../services/scorer';
import { labelOf, sentenceOf } from '../services/explanations';
import type { RawDriver } from '../services/scorer';

export const scoreRouter = Router();
export const templateRouter = Router();

const MAX_ROWS = 2000;
const MAX_ERRORS_RETURNED = 50;

export const riskLevel = (p: number) => (p < 0.33 ? 'Low' : p <= 0.66 ? 'Medium' : 'High');

const fail = (status: number, code: string, message: string, details?: unknown) => ({
  status,
  body: { error: { code, message, ...(details ? { details } : {}) } },
});

const driverDto = (d: RawDriver) => ({
  feature: d.feature,
  label: labelOf(d.feature),
  value: d.value,
  shap: d.shap,
  direction: d.direction,
  sentence: sentenceOf(d.feature, d.direction),
});

templateRouter.get('/', (_req, res) => {
  const example = [
    ['HH-0001', 'gasabo', 4, 1.0, 38, 'F', 'primary', 2, 'independent_farmer', 2, 0.3, 0.4, 1, 1, 1, 0, 1],
    ['HH-0002', 'nyamasheke', 7, 3.5, 52, 'M', 'none_or_below_primary', 1, 'farm_wages', 1, 0.05, 0.0, 0, 0, 0, 0, 0],
  ];
  const csv = [REQUIRED_COLUMNS.join(','), ...example.map((r) => r.join(','))].join('\n') + '\n';
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="imbaraga-template.csv"');
  res.send(csv);
});

// Accepts: raw text/csv body, JSON { csv: "..." }, or JSON { households: [...] }
scoreRouter.use(express.text({ type: ['text/csv', 'text/plain'], limit: '2mb' }));

scoreRouter.post('/', async (req, res, next) => {
  try {
    let rawRows: Record<string, unknown>[];
    let firstRowNumber: number;

    const csvText: string | undefined =
      typeof req.body === 'string' ? req.body : typeof req.body?.csv === 'string' ? req.body.csv : undefined;

    if (csvText !== undefined) {
      if (csvText.trim() === '') {
        const e = fail(400, 'EMPTY_FILE', 'The file is empty'); return res.status(e.status).json(e.body);
      }
      try {
        rawRows = parse(csvText, { columns: (h: string[]) => h.map((x) => x.trim()), skip_empty_lines: true, trim: true, bom: true }) as Record<string, unknown>[];
      } catch (err) {
        const e = fail(400, 'CSV_PARSE_ERROR', `Could not read the CSV: ${(err as Error).message}`);
        return res.status(e.status).json(e.body);
      }
      firstRowNumber = 2; // row 1 is the header
      if (rawRows.length > 0) {
        const have = new Set(Object.keys(rawRows[0]));
        const missing = REQUIRED_COLUMNS.filter((c) => !have.has(c));
        if (missing.length) {
          const e = fail(400, 'MISSING_COLUMNS', `Missing required column(s): ${missing.join(', ')}`);
          return res.status(e.status).json(e.body);
        }
      }
    } else if (Array.isArray(req.body?.households)) {
      rawRows = req.body.households as Record<string, unknown>[];
      firstRowNumber = 1;
    } else {
      const e = fail(400, 'BAD_REQUEST', "Send a CSV file (text/csv), JSON { csv }, or JSON { households: [...] }");
      return res.status(e.status).json(e.body);
    }

    if (rawRows.length === 0) { const e = fail(400, 'EMPTY_FILE', 'No household rows found'); return res.status(e.status).json(e.body); }
    if (rawRows.length > MAX_ROWS) {
      const e = fail(400, 'TOO_MANY_ROWS', `At most ${MAX_ROWS} rows per upload (got ${rawRows.length})`);
      return res.status(e.status).json(e.body);
    }

    const known = new Set((db.prepare('SELECT code FROM districts').all() as { code: string }[]).map((r) => r.code));
    const { rows, errors } = validateRows(rawRows, { firstRowNumber, knownDistricts: known });
    if (errors.length) {
      const shown: RowError[] = errors.slice(0, MAX_ERRORS_RETURNED);
      const e = fail(400, 'VALIDATION_ERROR',
        `${errors.length} problem(s) found. First: Row ${errors[0].row}: ${errors[0].message}`,
        { errors: shown.map((x) => ({ ...x, text: `Row ${x.row}: ${x.message}` })), totalErrors: errors.length });
      return res.status(e.status).json(e.body);
    }

    const scorer = getScorer();
    const [version, raw] = await Promise.all([scorer.modelVersion(), scorer.score(rows)]);
    const byId = new Map(rows.map((r) => [r.household_id, r]));

    const ranked = raw
      .map((r) => ({ ...r, probability: Number(r.probability.toFixed(4)) }))
      .sort((a, b) => b.probability - a.probability || a.id.localeCompare(b.id))
      .map((r, i) => ({ ...r, rank: i + 1, riskLevel: riskLevel(r.probability) }));

    const batchId = db.transaction(() => {
      const b = db.prepare('INSERT INTO score_batches (row_count, model_version) VALUES (?, ?)').run(ranked.length, version);
      const ins = db.prepare(
        `INSERT INTO scores (batch_id, household_id, district_code, probability, risk_level, driver1, driver2, driver3, rank)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
      for (const r of ranked) {
        ins.run(b.lastInsertRowid, r.id, byId.get(r.id)?.district_code ?? null, r.probability, r.riskLevel,
          r.drivers[0]?.feature ?? null, r.drivers[1]?.feature ?? null, r.drivers[2]?.feature ?? null, r.rank);
      }
      return Number(b.lastInsertRowid);
    })();

    res.json({
      batchId,
      modelVersion: version,
      isMock: scorer.isMock,
      count: ranked.length,
      summary: {
        High: ranked.filter((r) => r.riskLevel === 'High').length,
        Medium: ranked.filter((r) => r.riskLevel === 'Medium').length,
        Low: ranked.filter((r) => r.riskLevel === 'Low').length,
      },
      results: ranked.map((r) => ({
        id: r.id,
        districtCode: byId.get(r.id)?.district_code ?? null,
        probability: r.probability,
        riskLevel: r.riskLevel,
        rank: r.rank,
        drivers: r.drivers.map(driverDto),
        protective: r.protective ? driverDto(r.protective) : null,
      })),
    });
  } catch (err) {
    if (err instanceof ScorerUnavailableError) {
      const e = fail(503, 'ML_SERVICE_UNAVAILABLE', err.message);
      return res.status(e.status).json(e.body);
    }
    next(err);
  }
});