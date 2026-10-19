import Database from 'better-sqlite3';
import path from 'node:path';
const dbPath = process.env.DATABASE_URL ?? path.resolve(__dirname, '../../../imbaraga.db');

export const db = new Database(dbPath, { readonly: true, fileMustExist: true });