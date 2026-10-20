import Database from 'better-sqlite3';
import path from 'node:path';

const dbPath = process.env.DATABASE_URL ?? path.resolve(__dirname, '../../../imbaraga.db');

export const db = new Database(dbPath, { fileMustExist: true });
db.pragma('foreign_keys = ON');

// Older databases were seeded before scores had district_code; add it in place.
const scoreCols = db.prepare('PRAGMA table_info(scores)').all() as { name: string }[];
if (!scoreCols.some((c) => c.name === 'district_code')) {
  db.exec('ALTER TABLE scores ADD COLUMN district_code TEXT');
}