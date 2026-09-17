import { getDb } from '@/db/client';
import { LATEST_SCHEMA_VERSION } from '@/db/migrations';
import { resetBusinessScope } from '@/db/repositories/business-scope';
import { nowIso } from '@/db/repositories/clock';
import type { DatabaseAdapter } from '@/db/repositories/database';
import { REPO_ERROR, isRepoError, repoError } from '@/db/repositories/errors';
import { withTransaction } from '@/db/repositories/transaction';
import {
  BACKUP_DELETE_ORDER,
  BACKUP_TABLES,
  buildBackupDocument,
  emptyBackupTables,
  validateBackupDocument,
} from '@/lib/backup-format';
import type {
  BackupDocument,
  BackupSchema,
  BackupStats,
  BackupTables,
  BackupValidationError,
  BackupValidationResult,
  BackupValue,
} from '@/lib/backup-format';

/**
 * JSON backup data access (AGENTS §3.3 — data portability without cloud).
 *
 * The database holds exactly one business; a backup is a raw snapshot of every
 * domain table (see `@/lib/backup-format`). Reads and writes go through the
 * sanctioned `withTransaction` (shared write queue, `BEGIN IMMEDIATE`), and the
 * entire import is ONE transaction: validate first, then delete-all + insert-all
 * inside the same transaction. Any failure rolls back and the previous data
 * survives intact.
 *
 * FK ordering: import inserts parents before children ({@link BACKUP_TABLES})
 * and deletes children before parents ({@link BACKUP_DELETE_ORDER}). We also set
 * `PRAGMA defer_foreign_keys = ON` inside the transaction so a dangling
 * reference in a file becomes a guaranteed full rollback at COMMIT, never a
 * half-written database.
 *
 * `clearAllData`/`importDatabase` replace the single business row, so they must
 * call `resetBusinessScope()` afterwards or every repository would keep
 * querying the stale business id.
 */

/** Import conflict policy. `'fail'` refuses a non-empty target; `'replace'` wipes it. */
export type ImportMode = 'fail' | 'replace';

export interface ImportDatabaseOptions {
  /** Defaults to `'fail'` — the caller must opt in to destroying existing data. */
  mode?: ImportMode;
}

export interface ExportDatabaseOptions {
  /** Override the export timestamp (deterministic tests). */
  exportedAt?: string;
  appName?: string;
  appVersion?: string;
}

export interface BackupImportResult {
  stats: BackupStats;
}

// ---------------------------------------------------------------------------
// Schema introspection
// ---------------------------------------------------------------------------

interface TableInfoRow {
  name: string;
  type: string;
  notnull: number;
  pk: number;
}

/** Read the live column schema for every backed-up table via `PRAGMA table_info`. */
async function readSchema(db: DatabaseAdapter): Promise<BackupSchema> {
  const schema = {} as BackupSchema;
  for (const table of BACKUP_TABLES) {
    const rows = await db.getAllAsync<TableInfoRow>(`PRAGMA table_info(${table})`);
    schema[table] = {
      columns: rows.map((row) => ({
        name: row.name,
        type: row.type,
        notNull: row.notnull === 1,
        pk: row.pk > 0,
      })),
    };
  }
  return schema;
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

/**
 * Snapshot the whole business dataset into a versioned document.
 *
 * Deterministic: columns follow schema declaration order (`cid`) and rows are
 * ordered by primary key, so exporting identical data twice yields identical
 * serialized output (given the same `exportedAt`).
 */
export async function exportDatabase(options: ExportDatabaseOptions = {}): Promise<BackupDocument> {
  const db = await getDb();
  const schema = await readSchema(db);
  const tables = emptyBackupTables();

  for (const table of BACKUP_TABLES) {
    const columns = schema[table].columns.map((column) => column.name);
    const pkColumns = schema[table].columns
      .filter((column) => column.pk)
      .map((column) => column.name);
    const orderBy = (pkColumns.length > 0 ? pkColumns : columns)
      .map((column) => `${column} ASC`)
      .join(', ');

    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT ${columns.join(', ')} FROM ${table} ORDER BY ${orderBy}`,
    );
    tables[table] = rows.map((row) => normalizeRow(row, columns));
  }

  return buildBackupDocument({
    schemaVersion: LATEST_SCHEMA_VERSION,
    exportedAt: options.exportedAt ?? nowIso(),
    appName: options.appName,
    appVersion: options.appVersion,
    tables,
  });
}

/** Rebuild a row in schema column order, turning any `undefined` into `null`. */
function normalizeRow(row: Record<string, unknown>, columns: readonly string[]): Record<string, BackupValue> {
  const normalized: Record<string, BackupValue> = {};
  for (const column of columns) {
    const value = row[column];
    normalized[column] = value === undefined ? null : (value as BackupValue);
  }
  return normalized;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/** Validate a parsed backup against the live schema without touching data. */
export async function inspectBackup(raw: unknown): Promise<BackupValidationResult> {
  const db = await getDb();
  const schema = await readSchema(db);
  return validateBackupDocument(raw, schema, { expectedSchemaVersion: LATEST_SCHEMA_VERSION });
}

function formatValidationErrors(errors: BackupValidationError[]): string {
  const first = errors.slice(0, 3).map((error) => `${error.path}: ${error.message}`);
  const suffix = errors.length > 3 ? ` (+${errors.length - 3} more)` : '';
  return `${errors.length} validation error(s): ${first.join('; ')}${suffix}`;
}

// ---------------------------------------------------------------------------
// Import / clear
// ---------------------------------------------------------------------------

/**
 * Import a validated backup in a single transaction.
 *
 * @throws `REPO_BACKUP_INVALID` when the file fails validation or the rows
 *   violate the schema (dangling FK, CHECK, NOT NULL, UNIQUE).
 * @throws `REPO_BACKUP_CONFLICT` when the target already holds data and the
 *   caller did not opt into `mode: 'replace'`.
 */
export async function importDatabase(
  raw: unknown,
  options: ImportDatabaseOptions = {},
): Promise<BackupImportResult> {
  const mode = options.mode ?? 'fail';

  const db = await getDb();
  const schema = await readSchema(db);
  const validation = validateBackupDocument(raw, schema, {
    expectedSchemaVersion: LATEST_SCHEMA_VERSION,
  });
  if (!validation.ok) {
    throw repoError(REPO_ERROR.BACKUP_INVALID, formatValidationErrors(validation.errors));
  }

  try {
    await withTransaction(async (txn) => {
      // Conflict check INSIDE the transaction to avoid a TOCTOU race with the
      // pre-import emptiness check.
      const row = await txn.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) AS count FROM business',
      );
      const targetHasData = (row?.count ?? 0) > 0;
      if (targetHasData && mode !== 'replace') {
        throw repoError(REPO_ERROR.BACKUP_CONFLICT, 'the database already contains a business');
      }

      // Defer FK enforcement to COMMIT so ordering mistakes (or a dangling
      // reference in the file) can never leave a half-imported database.
      await txn.execAsync('PRAGMA defer_foreign_keys = ON');
      await deleteAllRows(txn);
      await insertAllRows(txn, schema, validation.document.tables);
    });
  } catch (error) {
    if (isRepoError(error)) {
      throw error;
    }
    // Any SQLite failure here means the file is incompatible with the schema.
    throw repoError(
      REPO_ERROR.BACKUP_INVALID,
      error instanceof Error ? error.message : String(error),
    );
  }

  resetBusinessScope();
  return { stats: validation.stats };
}

/** Delete every row of every domain table (children first). */
async function deleteAllRows(txn: DatabaseAdapter): Promise<void> {
  for (const table of BACKUP_DELETE_ORDER) {
    await txn.runAsync(`DELETE FROM ${table}`);
  }
}

/** Insert every row of every table in FK-safe order with explicit column lists. */
async function insertAllRows(
  txn: DatabaseAdapter,
  schema: BackupSchema,
  tables: BackupTables,
): Promise<void> {
  for (const table of BACKUP_TABLES) {
    const columns = schema[table].columns.map((column) => column.name);
    if (columns.length === 0) continue;

    const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns
      .map(() => '?')
      .join(', ')})`;

    for (const row of tables[table]) {
      await txn.runAsync(
        sql,
        ...columns.map((column) => (row[column] === undefined ? null : row[column])),
      );
    }
  }
}

/** Erase all business data. The app returns to first-run onboarding afterwards. */
export async function clearAllData(): Promise<void> {
  await withTransaction(async (txn) => {
    await txn.execAsync('PRAGMA defer_foreign_keys = ON');
    await deleteAllRows(txn);
  });
  resetBusinessScope();
}

/** True when no business row exists (fresh install / after a clear). */
export async function isDatabaseEmpty(): Promise<boolean> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM business',
  );
  return (row?.count ?? 0) === 0;
}

