import { Router } from 'express';
import { db } from '../db/client';
import { sentenceOf } from '../services/explanations';

export const exportRouter = Router();

// Spreadsheet apps run cells starting with = + - @ as formulas; neutralise them.
const cell = (v: unknown) => {
  let s = v === null || v === undefined ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

exportRouter.get('/:batchId', (req, res) => {
  const id = Number(req.params.batchId);
  const lang = req.query.lang === 'rw' ? 'rw' : 'en';
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'batchId must be a positive integer' } });
  }
  const batch = db.prepare('SELECT * FROM score_batches WHERE id = ?').get(id) as { model_version: string } | undefined;
  if (!batch) return res.status(404).json({ error: { code: 'NOT_FOUND', message: `Batch ${id} not found` } });

  const rows = db.prepare('SELECT * FROM scores WHERE batch_id = ? ORDER BY rank').all(id) as {
    rank: number; household_id: string; district_code: string | null; probability: number; risk_level: string;
    driver1: string | null; driver2: string | null; driver3: string | null;
  }[];

  const reason = (f: string | null) => (f ? sentenceOf(f, 'raises')[lang] : '');
  const header = ['rank', 'household_id', 'district_code', 'probability', 'risk_level', 'reason_1', 'reason_2', 'reason_3', 'model_version'];
  const lines = rows.map((r) =>
    [r.rank, r.household_id, r.district_code, r.probability, r.risk_level,
      reason(r.driver1), reason(r.driver2), reason(r.driver3), batch.model_version].map(cell).join(','));

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="imbaraga-batch-${id}-${lang}.csv"`);
  res.send('\uFEFF' + [header.join(','), ...lines].join('\r\n') + '\r\n'); // BOM so Excel reads UTF-8
});