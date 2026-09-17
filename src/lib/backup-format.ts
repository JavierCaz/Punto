/**
 * JSON backup format + pure validation (AGENTS §3.3 data portability).
 *
 * Punto is offline-first: the local SQLite database is the source of truth and
 * JSON export/import is the only portability mechanism. A backup is a faithful
 * *table snapshot* — every row of every domain table, including ids, money
 * (INTEGER cents), quantities (INTEGER ×1000) and ISO timestamps, exactly as
 * stored. It is intentionally NOT built through entity repositories: those apply
 * business logic (new ids, counter bumps, stock re-posting) and would not
 * round-trip byte-for-byte.
 *
 * This module is pure (no expo/DB imports) so mapping and validation are unit
 * testable in a plain Node environment. The DB-facing half lives in
 * `src/db/repositories/backup.ts`, which supplies the live column schema from
 * `PRAGMA table_info` and calls {@link validateBackupDocument}.
 *
 * Format invariants:
 * - `formatVersion` is pinned to 1; `schemaVersion` must equal the running
 *   app's `LATEST_SCHEMA_VERSION` (no cross-version import in v1).
 * - Every table key is present (possibly an empty array) and every row carries
 *   every column (nulls included), so import never has to guess.
 * - Column order follows the schema declaration order and rows are emitted in
 *   primary-key order, so serialization is deterministic.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const BACKUP_FORMAT = 'punto.backup';
export const BACKUP_FORMAT_VERSION = 1;
export const BACKUP_APP_NAME = 'Punto';
export const BACKUP_APP_VERSION = '0.0.0';

/**
 * Domain tables in FK-safe INSERT order (parents before children). Export
 * iterates this order, import inserts in it, and the delete order is its exact
 * reverse (see {@link BACKUP_DELETE_ORDER}).
 */
export const BACKUP_TABLES = [
  'business',
  'category',
  'employee',
  'unit',
  'inventory_item',
  'payment_method',
  'financial_category',
  'supplier',
  'product',
  'recipe',
  'purchase',
  'sale',
  'recipe_item',
  'supplier_item',
  'inventory_movement',
  'purchase_item',
  'financial_transaction',
  'sale_item',
  'payment',
  'app_metadata',
] as const;

export type BackupTableName = (typeof BACKUP_TABLES)[number];

/** Reverse of {@link BACKUP_TABLES}: children before parents (delete order). */
export const BACKUP_DELETE_ORDER: readonly BackupTableName[] = [...BACKUP_TABLES].reverse();

/** Defensive limits so a corrupt/hostile file cannot hang or OOM the app. */
export const BACKUP_LIMITS = {
  /** Max JSON string length accepted before parsing (~100 MB). */
  maxBytes: 100 * 1024 * 1024,
  maxRowsPerTable: 500_000,
  maxTotalRows: 1_000_000,
  maxStringLength: 1_000_000,
} as const;

/** Keys that must never appear in a parsed row (prototype-pollution guard). */
const FORBIDDEN_KEYS: ReadonlySet<string> = new Set(['__proto__', 'constructor', 'prototype']);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single SQLite cell as it survives JSON: string, integer/real, or null. */
export type BackupValue = string | number | null;

/** A table row keyed by column name. */
export type BackupRow = Record<string, BackupValue>;

export type BackupTables = Record<BackupTableName, BackupRow[]>;

export interface BackupDocument {
  format: typeof BACKUP_FORMAT;
  formatVersion: number;
  /** The app schema version the snapshot was taken from. */
  schemaVersion: number;
  /** ISO-8601 UTC timestamp of the export. */
  exportedAt: string;
  app: { name: string; version: string };
  tables: BackupTables;
}

/** A column as reported by `PRAGMA table_info`. */
export interface BackupColumn {
  name: string;
  /** Declared SQLite type, e.g. `TEXT` / `INTEGER`. */
  type: string;
  notNull: boolean;
  pk: boolean;
}

export interface BackupTableSchema {
  columns: BackupColumn[];
}

/** Live schema for every backed-up table, keyed by table name. */
export type BackupSchema = Record<BackupTableName, BackupTableSchema>;

export interface BackupValidationError {
  /** JSON-path-ish location, e.g. `$.tables.product[3].price_minor`. */
  path: string;
  message: string;
}

export interface BackupStats {
  totalRows: number;
  perTable: Record<BackupTableName, number>;
}

export type BackupValidationResult =
  | { ok: true; document: BackupDocument; stats: BackupStats }
  | { ok: false; errors: BackupValidationError[] };

export type BackupParseResult =
  | { ok: true; value: unknown }
  | { ok: false; errors: BackupValidationError[] };

export interface BackupValidationOptions {
  /** Schema version the running app expects (`LATEST_SCHEMA_VERSION`). */
  expectedSchemaVersion: number;
}

export interface BuildBackupDocumentInput {
  schemaVersion: number;
  exportedAt: string;
  tables: BackupTables;
  appName?: string;
  appVersion?: string;
}

// ---------------------------------------------------------------------------
// Build / serialize
// ---------------------------------------------------------------------------

/** An empty tables map with every table key present, in canonical order. */
export function emptyBackupTables(): BackupTables {
  const tables = {} as BackupTables;
  for (const table of BACKUP_TABLES) {
    tables[table] = [];
  }
  return tables;
}

/**
 * Assemble a document with canonical key order (tables in {@link BACKUP_TABLES}
 * order) so `serializeBackup` output is deterministic for identical data.
 */
export function buildBackupDocument(input: BuildBackupDocumentInput): BackupDocument {
  const tables = emptyBackupTables();
  for (const table of BACKUP_TABLES) {
    tables[table] = input.tables[table] ?? [];
  }

  return {
    format: BACKUP_FORMAT,
    formatVersion: BACKUP_FORMAT_VERSION,
    schemaVersion: input.schemaVersion,
    exportedAt: input.exportedAt,
    app: {
      name: input.appName ?? BACKUP_APP_NAME,
      version: input.appVersion ?? BACKUP_APP_VERSION,
    },
    tables,
  };
}

/** Pretty-print a document. Deterministic for a given document. */
export function serializeBackup(document: BackupDocument): string {
  return JSON.stringify(document, null, 2);
}

/** File name for an export, e.g. `punto-backup-2026-09-17-143005.json` (UTC). */
export function buildBackupFileName(now: Date = new Date()): string {
  const pad = (value: number): string => String(value).padStart(2, '0');
  const stamp = [
    now.getUTCFullYear(),
    pad(now.getUTCMonth() + 1),
    pad(now.getUTCDate()),
    '-',
    pad(now.getUTCHours()),
    pad(now.getUTCMinutes()),
    pad(now.getUTCSeconds()),
  ].join('');
  return `punto-backup-${stamp}.json`;
}

/** Row counts per table plus the total, for UI summaries. */
export function summarizeBackup(document: BackupDocument): BackupStats {
  const perTable = {} as Record<BackupTableName, number>;
  let totalRows = 0;
  for (const table of BACKUP_TABLES) {
    const count = document.tables[table]?.length ?? 0;
    perTable[table] = count;
    totalRows += count;
  }
  return { totalRows, perTable };
}

// ---------------------------------------------------------------------------
// Parse + validate
// ---------------------------------------------------------------------------

/** Parse raw file text into a JSON value, rejecting oversized/corrupt input. */
export function parseBackupJson(json: string): BackupParseResult {
  if (typeof json !== 'string' || json.trim().length === 0) {
    return { ok: false, errors: [{ path: '$', message: 'the backup file is empty' }] };
  }
  if (json.length > BACKUP_LIMITS.maxBytes) {
    return {
      ok: false,
      errors: [{ path: '$', message: `the backup file exceeds the ${BACKUP_LIMITS.maxBytes} byte limit` }],
    };
  }

  try {
    return { ok: true, value: JSON.parse(json) as unknown };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return { ok: false, errors: [{ path: '$', message: `invalid JSON: ${detail}` }] };
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Map a declared SQLite type to its storage affinity. */
function affinityOf(declaredType: string): 'INTEGER' | 'TEXT' | 'REAL' | 'NUMERIC' | 'BLOB' {
  const type = declaredType.toUpperCase();
  if (type.includes('INT')) return 'INTEGER';
  if (type.includes('CHAR') || type.includes('CLOB') || type.includes('TEXT')) return 'TEXT';
  if (type.includes('BLOB') || type.trim() === '') return 'BLOB';
  if (type.includes('REAL') || type.includes('FLOA') || type.includes('DOUB')) return 'REAL';
  return 'NUMERIC';
}

function isValueAcceptable(value: unknown, affinity: ReturnType<typeof affinityOf>): boolean {
  switch (affinity) {
    case 'INTEGER':
      // JSON has no integer type; `1e999` parses to Infinity, `1.5` is a float.
      return typeof value === 'number' && Number.isSafeInteger(value);
    case 'TEXT':
      return typeof value === 'string';
    case 'REAL':
      return typeof value === 'number' && Number.isFinite(value);
    default:
      return (
        typeof value === 'string' ||
        (typeof value === 'number' && Number.isFinite(value))
      );
  }
}

/**
 * Validate a parsed backup against the live column schema and return a fully
 * normalized, trusted document (rows rebuilt in schema column order with nulls
 * made explicit). Validation is total: it collects every problem rather than
 * throwing on the first, so the UI can show all errors at once.
 */
export function validateBackupDocument(
  raw: unknown,
  schema: BackupSchema,
  options: BackupValidationOptions,
): BackupValidationResult {
  const errors: BackupValidationError[] = [];
  const push = (path: string, message: string): void => {
    errors.push({ path, message });
  };

  if (!isPlainObject(raw)) {
    return { ok: false, errors: [{ path: '$', message: 'the backup must be a JSON object' }] };
  }

  if (raw.format !== BACKUP_FORMAT) {
    push('$.format', `expected "${BACKUP_FORMAT}"`);
  }
  if (raw.formatVersion !== BACKUP_FORMAT_VERSION) {
    push('$.formatVersion', `expected ${BACKUP_FORMAT_VERSION}`);
  }
  if (typeof raw.schemaVersion !== 'number' || !Number.isInteger(raw.schemaVersion)) {
    push('$.schemaVersion', 'must be an integer');
  } else if (raw.schemaVersion !== options.expectedSchemaVersion) {
    push(
      '$.schemaVersion',
      `unsupported schema version ${raw.schemaVersion} (this app expects ${options.expectedSchemaVersion})`,
    );
  }
  if (typeof raw.exportedAt !== 'string') {
    push('$.exportedAt', 'must be a string');
  }
  if (!isPlainObject(raw.app)) {
    push('$.app', 'must be an object');
  }

  if (!isPlainObject(raw.tables)) {
    push('$.tables', 'must be an object');
    return { ok: false, errors };
  }
  const tablesRaw = raw.tables;

  // Exact table set: every known table present, nothing unknown.
  for (const table of BACKUP_TABLES) {
    if (!(table in tablesRaw)) {
      push(`$.tables.${table}`, 'missing table');
    }
  }
  for (const key of Object.keys(tablesRaw)) {
    if (!(BACKUP_TABLES as readonly string[]).includes(key)) {
      push(`$.tables.${key}`, 'unknown table');
    }
  }

  const normalizedTables = emptyBackupTables();
  const perTable = {} as Record<BackupTableName, number>;
  let totalRows = 0;

  for (const table of BACKUP_TABLES) {
    const rowsRaw = tablesRaw[table];
    perTable[table] = 0;
    if (rowsRaw === undefined) continue;

    if (!Array.isArray(rowsRaw)) {
      push(`$.tables.${table}`, 'must be an array');
      continue;
    }
    if (rowsRaw.length > BACKUP_LIMITS.maxRowsPerTable) {
      push(`$.tables.${table}`, `too many rows (${rowsRaw.length})`);
      continue;
    }

    const tableSchema = schema[table];
    if (!tableSchema || tableSchema.columns.length === 0) {
      push(`$.tables.${table}`, 'no schema is available for this table');
      continue;
    }

    const columnNames = new Set(tableSchema.columns.map((column) => column.name));
    const pkColumns = tableSchema.columns.filter((column) => column.pk).map((column) => column.name);
    const seenPks = new Set<string>();
    const normalizedRows: BackupRow[] = [];

    rowsRaw.forEach((row, index) => {
      const path = `$.tables.${table}[${index}]`;
      if (!isPlainObject(row)) {
        push(path, 'must be an object');
        return;
      }

      // Reject unknown / dangerous keys, then rebuild in schema column order.
      for (const key of Object.keys(row)) {
        if (FORBIDDEN_KEYS.has(key)) {
          push(`${path}.${key}`, 'forbidden key');
          continue;
        }
        if (!columnNames.has(key)) {
          push(`${path}.${key}`, 'unknown column');
        }
      }

      const normalizedRow: BackupRow = {};
      for (const column of tableSchema.columns) {
        if (!(column.name in row)) {
          push(`${path}.${column.name}`, 'missing column');
          continue;
        }
        const value = row[column.name];
        if (value === null) {
          if (column.notNull) {
            push(`${path}.${column.name}`, 'must not be null');
          }
          normalizedRow[column.name] = null;
          continue;
        }
        const affinity = affinityOf(column.type);
        if (!isValueAcceptable(value, affinity)) {
          push(`${path}.${column.name}`, `invalid value for ${affinity} column`);
          continue;
        }
        if (typeof value === 'string' && value.length > BACKUP_LIMITS.maxStringLength) {
          push(`${path}.${column.name}`, 'string value is too long');
          continue;
        }
        normalizedRow[column.name] = value as BackupValue;
      }

      for (const pk of pkColumns) {
        const value = row[pk];
        if (value === null || value === undefined) {
          push(`${path}.${pk}`, 'primary key must not be null');
          continue;
        }
        const key = String(value);
        if (seenPks.has(key)) {
          push(`${path}.${pk}`, 'duplicate primary key');
        } else {
          seenPks.add(key);
        }
      }

      normalizedRows.push(normalizedRow);
    });

    normalizedTables[table] = normalizedRows;
    perTable[table] = normalizedRows.length;
    totalRows += normalizedRows.length;
  }

  if (totalRows > BACKUP_LIMITS.maxTotalRows) {
    push('$.tables', `too many total rows (${totalRows})`);
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const app = isPlainObject(raw.app) ? raw.app : {};
  const document: BackupDocument = {
    format: BACKUP_FORMAT,
    formatVersion: BACKUP_FORMAT_VERSION,
    schemaVersion: options.expectedSchemaVersion,
    exportedAt: raw.exportedAt as string,
    app: {
      name: typeof app.name === 'string' ? app.name : BACKUP_APP_NAME,
      version: typeof app.version === 'string' ? app.version : BACKUP_APP_VERSION,
    },
    tables: normalizedTables,
  };

  return { ok: true, document, stats: { totalRows, perTable } };
}
