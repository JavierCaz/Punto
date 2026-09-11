/**
 * Shared coercion helpers for mapping SQLite rows to domain types.
 *
 * SQLite returns rows typed as `Record<string, unknown>` when the generic is
 * not specified; repositories map those rows explicitly (snake_case columns →
 * camelCase fields) and use these helpers for the repeated, mechanical
 * coercions (INTEGER 0/1 flags, nullable TEXT/INTEGER, required scalars).
 *
 * `Number` / `String` are the coercion primitive (never `parseInt`/`as any`)
 * so mapping is total and type-safe: a `NULL` becomes `null`, a value becomes
 * its canonical string/number form.
 */

/** SQLite INTEGER 0/1 flag → boolean (`is_active === 1` etc.). */
export function boolFromInt(value: number): boolean {
  return value === 1;
}

/** boolean → SQLite INTEGER 0/1 flag. */
export function intBool(value: boolean): number {
  return value ? 1 : 0;
}

/** Nullable TEXT → `string | null` (SQL NULL and JS undefined both map to null). */
export function strOrNull(value: unknown): string | null {
  return value == null ? null : String(value);
}

/** Nullable INTEGER → `number | null` (SQL NULL and JS undefined both map to null). */
export function intOrNull(value: unknown): number | null {
  return value == null ? null : Number(value);
}

/** Required TEXT column → `string`. */
export function str(value: unknown): string {
  return String(value);
}

/** Required INTEGER column → `number`. */
export function int(value: unknown): number {
  return Number(value);
}

/**
 * Canonical soft-delete predicate: rows with a NULL `archived_at` are "live".
 * Embedded into list/detail queries so soft-deleted rows are excluded
 * consistently across every repository.
 */
export const archiveSoftWhere = 'archived_at IS NULL';
