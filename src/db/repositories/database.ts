import type * as SQLite from 'expo-sqlite';

/**
 * Database adapter seam — the narrow query surface every entity repository
 * builds on.
 *
 * Repositories never touch `expo-sqlite`'s `SQLiteDatabase` directly; they
 * depend on this interface so they can be driven by the real database in
 * production and by a scripted fake (see `__tests__/fakes/recording-adapter`)
 * in unit tests without a native SQLite engine.
 *
 * Deliberately ABSENT: any transaction method. `withTransaction` (see
 * transaction.ts) is the only sanctioned way to open a transaction, which
 * keeps nested transactions a compile error rather than a runtime surprise —
 * expo-sqlite's transaction object is the only handle passed around, and it is
 * structurally compatible with this interface on purpose.
 *
 * Parameter values reuse expo-sqlite's own bind-value union so repository code
 * never has to widen/narrow types at the boundary.
 */
export type SqlValue = SQLite.SQLiteBindValue;

/** Result of a write (`runAsync`): rows affected + last inserted row id. */
export interface RunResult {
  changes: number;
  lastInsertRowId: number;
}

export interface DatabaseAdapter {
  /**
   * Execute one or more raw statements (DDL, PRAGMA, transaction control).
   * Exposed so import/export can set per-connection pragmas (e.g.
   * `defer_foreign_keys`) inside the sanctioned transaction; it is NOT a
   * second way to open transactions — `withTransaction` remains the only one.
   */
  execAsync(source: string): Promise<void>;
  getFirstAsync<T>(source: string, ...params: SqlValue[]): Promise<T | null>;
  getAllAsync<T>(source: string, ...params: SqlValue[]): Promise<T[]>;
  runAsync(source: string, ...params: SqlValue[]): Promise<RunResult>;
}
