/**
 * Central SQLite client for Punto.
 *
 * Offline-first: this single in-app SQLite database is the source of truth.
 * All business data lives here; nothing touches a network. JSON import/export
 * is the only portability mechanism (see §9.2 of AGENTS.md).
 *
 * We expose a module-level singleton (`getDb()`) instead of relying on React
 * context so zustand stores and repository functions can query the database
 * outside the component tree. The app opens the database once at startup and
 * runs any pending migrations before first render.
 *
 * Conventions applied by the migration layer (see AGENTS.md §6):
 * - money is stored as INTEGER minor units (cents) — never float
 * - quantities are stored as INTEGER × 1000 (milli-units of the row's unit)
 * - timestamps are ISO-8601 UTC TEXT
 * - soft delete via `archived_at`, never hard-delete catalog/history rows
 */

import * as SQLite from 'expo-sqlite';

import { migrations } from '@/db/migrations';

export const DATABASE_NAME = 'punto.db';

export type Database = SQLite.SQLiteDatabase;

let dbPromise: Promise<Database> | null = null;

async function init(): Promise<Database> {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);

  // Durability & concurrency pragmas (SDK 57 expo-sqlite).
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');
  await db.execAsync('PRAGMA synchronous = NORMAL;');
  await db.execAsync('PRAGMA busy_timeout = 5000;');

  await runMigrations(db);
  return db;
}

/**
 * Open (once) and return the app database. Migrations run before the
 * returned promise resolves, so callers can assume the schema is current.
 */
export function getDb(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = init().catch((error) => {
      // Reset the singleton so a later retry re-initializes instead of
      // returning a rejected promise forever.
      dbPromise = null;
      throw error;
    });
  }
  return dbPromise;
}

/** Test helper: drop the cached instance so the next getDb() re-opens. */
export function resetDbForTesting(): void {
  dbPromise = null;
}

/**
 * Run pending migrations, keyed off `PRAGMA user_version` (single source of
 * truth for schema version — we do not mirror it in app_metadata).
 *
 * Migrations are append-only and immutable; each runs inside a transaction so
 * a failure rolls back cleanly and user_version is only bumped on success.
 */
export async function runMigrations(db: Database): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = row?.user_version ?? 0;

  for (const migration of migrations) {
    if (migration.version <= currentVersion) continue;

    await db.withExclusiveTransactionAsync(async () => {
      for (const statement of migration.up) {
        await db.execAsync(statement);
      }
    });

    await db.execAsync(`PRAGMA user_version = ${migration.version}`);
  }
}
