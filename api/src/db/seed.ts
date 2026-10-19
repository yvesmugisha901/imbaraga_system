import Database from 'better-sqlite3';
import { parse } from 'csv-parse/sync';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

const root = path.resolve(here, '../../..');           // repo root
const dbPath = process.env.DATABASE_URL ?? path.join(root, 'imbaraga.db');
const csvPath = path.join(root, 'data/processed/district_aggregates.csv');

const slug = (s: string) => s.toLowerCase().replace(/[^a-z]+/g, '-');

const db = new Database(dbPath);
db.exec(fs.readFileSync(path.join(here, 'schema.sql'), 'utf8'));

const rows = parse(fs.readFileSync(csvPath, 'utf8'), { columns: true, skip_empty_lines: true }) as Record<string, string>[];

const insert = db.prepare(`
  INSERT INTO districts (code, name_en, province, population, density_per_km2, urban_pct, poverty_rate, poverty_rate_source)
  VALUES (@code, @name_en, @province, @population, @density, @urban_pct, @poverty_rate, 'province_eicv7')
  ON CONFLICT(code) DO UPDATE SET
    population = excluded.population, density_per_km2 = excluded.density_per_km2,
    urban_pct = excluded.urban_pct, poverty_rate = excluded.poverty_rate`);

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

const n = (db.prepare('SELECT COUNT(*) c FROM districts').get() as { c: number }).c;
console.log(`Seeded ${n} districts into ${dbPath}`);
if (n !== 30) throw new Error(`Expected 30 districts, found ${n}`);
