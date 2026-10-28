import Database from 'better-sqlite3';
import { parse } from 'csv-parse/sync';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../../..');           // repo root
const dbPath = process.env.DATABASE_URL ?? path.join(root, 'imbaraga.db');
const csvPath = path.join(root, 'data/processed/district_aggregates.csv');

const slug = (s: string) => s.toLowerCase().replace(/[^a-z]+/g, '-');

// Official EICV7 columns stored on `districts`. Same names in district_estimates.csv.
// Keep in sync with the "Official NISR EICV7" block in schema.sql.
const OFFICIAL_COLUMNS: [name: string, sqlType: string][] = [
  ['poverty_rate_modelled', 'REAL'],
  ['poverty_eicv5', 'REAL'],
  ['poverty_change_points', 'REAL'],
  ['rank_official', 'INTEGER'],
  ['access_index', 'REAL'],
  ['dependency_ratio', 'REAL'],
  ['econ_dependency', 'REAL'],
  ['agri_workers_pct', 'REAL'],
  ['no_livestock_pct', 'REAL'],
  ['land_below_half_ha_pct', 'REAL'],
  ['neet_pct', 'REAL'],
  ['youth_literacy_pct', 'REAL'],
  ['improved_water_pct', 'REAL'],
  ['improved_sanitation_pct', 'REAL'],
  ['electricity_pct', 'REAL'],
  ['mobile_phone_pct', 'REAL'],
  ['smartphone_pct', 'REAL'],
  ['cement_floor_pct', 'REAL'],
  // FinScope 2024 (Figure 13)
  ['banked_pct', 'REAL'],
  ['other_formal_pct', 'REAL'],
  ['informal_only_pct', 'REAL'],
  ['excluded_pct', 'REAL'],
];

const db = new Database(dbPath);
db.exec(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));

// CREATE TABLE IF NOT EXISTS does not add columns to a database made with the older schema,
// so add any missing ones. Safe to run on every seed.
const have = new Set((db.prepare('PRAGMA table_info(districts)').all() as { name: string }[]).map((c) => c.name));
for (const [name, type] of OFFICIAL_COLUMNS) {
  if (!have.has(name)) db.exec(`ALTER TABLE districts ADD COLUMN ${name} ${type}`);
}
if (!have.has('high_poverty_low_access')) {
  db.exec(
    `ALTER TABLE districts ADD COLUMN high_poverty_low_access INTEGER NOT NULL DEFAULT 0 CHECK (high_poverty_low_access IN (0,1))`,
  );
}

const rows = parse(fs.readFileSync(csvPath, 'utf8'), { columns: true, skip_empty_lines: true }) as Record<string, string>[];

const insert = db.prepare(`
  INSERT INTO districts (code, name_en, province, population, density_per_km2, urban_pct, poverty_rate, poverty_rate_source)
  VALUES (@code, @name_en, @province, @population, @density, @urban_pct, @poverty_rate, 'province_eicv7')
  ON CONFLICT(code) DO UPDATE SET
    population = excluded.population, density_per_km2 = excluded.density_per_km2,
    urban_pct = excluded.urban_pct, poverty_rate = excluded.poverty_rate,
    poverty_rate_source = 'province_eicv7'`);

db.transaction(() => {
  for (const r of rows) {
    insert.run({
      code: slug(r.district_name_en),
      name_en: r.district_name_en,
      province: r.province,
      population: Number(r.population_2022),
      density: Number(r.density_per_km2),
      urban_pct: Number(r.urban_pct),
      poverty_rate: Number(r.prov_poverty_rate_2024),
    });
  }
})();

// District poverty rates and official indicators from data/processed/district_estimates.csv.
// Each row carries its own source label ("Official NISR figure" or "modelled"), stored as a code.
// Optional: without the file, districts keep their province-level EICV7 rate.
// The CSV carries a readable label; the database stores a stable code, because the frontend builds
// translation keys from it (dashboard.source.<code>) and keys cannot contain spaces.
const SOURCE_CODE: Record<string, string> = {
  'official nisr figure': 'official_eicv7',
  'modelled': 'modelled',
  'microdata': 'microdata',
  'province_eicv7': 'province_eicv7',
};
const sourceCode = (label: string | undefined): string => SOURCE_CODE[(label ?? '').trim().toLowerCase()] ?? 'modelled';

const num = (v: string | undefined): number | null => (v === undefined || v.trim() === '' ? null : Number(v));
const bool = (v: string | undefined): number => (/^(true|1)$/i.test((v ?? '').trim()) ? 1 : 0);

const estPath = path.join(root, 'data/processed/district_estimates.csv');
if (fs.existsSync(estPath)) {
  const est = parse(fs.readFileSync(estPath, 'utf8'), { columns: true, skip_empty_lines: true }) as Record<string, string>[];
  const update = db.prepare(`
    UPDATE districts SET
      poverty_rate = @poverty_rate,
      poverty_rate_source = @poverty_rate_source,
      high_poverty_low_access = @high_poverty_low_access,
      financial_access_rate = @financial_access_rate,
      access_source = @access_source,
      double_exclusion = @double_exclusion,
      ${OFFICIAL_COLUMNS.map(([c]) => `${c} = @${c}`).join(',\n      ')}
    WHERE code = @code`);
  db.transaction(() => {
    for (const e of est) {
      const params: Record<string, string | number | null> = {
        code: e.district_code,
        poverty_rate: num(e.poverty_rate_est),
        poverty_rate_source: sourceCode(e.poverty_rate_source),
        high_poverty_low_access: bool(e.high_poverty_low_access),
        financial_access_rate: num(e.financial_access_rate),
        access_source: e.access_source?.trim() || 'pending',   // pending | finscope | modelled
        double_exclusion: bool(e.double_exclusion),
      };
      for (const [c] of OFFICIAL_COLUMNS) params[c] = num(e[c]);
      const res = update.run(params);
      if (res.changes !== 1) throw new Error(`No district matches estimate code '${e.district_code}'`);
    }
  })();
  const bySource = db
    .prepare('SELECT poverty_rate_source s, COUNT(*) c FROM districts GROUP BY poverty_rate_source')
    .all() as { s: string; c: number }[];
  console.log(`Applied ${est.length} district poverty estimates (${bySource.map((b) => `${b.c} ${b.s}`).join(', ')})`);
}

const n = (db.prepare('SELECT COUNT(*) c FROM districts').get() as { c: number }).c;
console.log(`Seeded ${n} districts into ${dbPath}`);
if (n !== 30) throw new Error(`Expected 30 districts, found ${n}`);