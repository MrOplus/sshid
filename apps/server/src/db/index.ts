import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import Database from 'better-sqlite3';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { MIGRATIONS } from './migrate.js';

/**
 * A single, process-wide SQLite handle.
 *
 * better-sqlite3 is synchronous and fully serialised internally, so one
 * connection is the correct and most efficient model — there is no connection
 * pool to manage and no risk of interleaved partial writes. We enable WAL so
 * that concurrent readers never block the single writer, set a busy timeout so
 * transient lock contention is retried instead of throwing, and enforce foreign
 * keys for referential integrity.
 */
function openDatabase(): Database.Database {
  const path = resolve(config.databasePath);
  mkdirSync(dirname(path), { recursive: true });

  const db = new Database(path);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  // Keep temp structures in memory; bound the page cache to ~16 MiB.
  db.pragma('temp_store = MEMORY');
  db.pragma('cache_size = -16000');

  runMigrations(db);
  logger.info({ path }, 'database ready');
  return db;
}

function runMigrations(db: Database.Database): void {
  db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)');
  const applied = new Set(
    db.prepare('SELECT version FROM schema_migrations').all().map((r) => (r as { version: number }).version),
  );
  const record = db.prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)');

  for (const migration of MIGRATIONS) {
    if (applied.has(migration.version)) continue;
    const apply = db.transaction(() => {
      db.exec(migration.up);
      record.run(migration.version, new Date().toISOString());
    });
    apply();
    logger.info({ version: migration.version, name: migration.name }, 'applied migration');
  }
}

export const db = openDatabase();

/** Flush WAL and close the handle. Safe to call multiple times. */
let closed = false;
export function closeDatabase(): void {
  if (closed) return;
  closed = true;
  try {
    db.pragma('wal_checkpoint(TRUNCATE)');
    db.close();
    logger.info('database closed');
  } catch (err) {
    logger.error({ err }, 'error while closing database');
  }
}
