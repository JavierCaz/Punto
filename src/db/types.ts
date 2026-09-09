export interface Migration {
  /** Monotonic schema version. Must be 1-based, strictly increasing. */
  version: number;
  /** Short human-readable identifier (used in logs/tests). */
  name: string;
  /**
   * SQL statements executed in order inside a single exclusive transaction.
   * Statements must be idempotent-safe in the sense that they only run when
   * the database is at `version - 1`.
   */
  up: string[];
}
