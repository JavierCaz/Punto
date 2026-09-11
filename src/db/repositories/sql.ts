import type { SqlValue } from '@/db/repositories/database';

/**
 * Small SQL-building helpers shared by entity repositories.
 *
 * These exist so the ~15 repositories build `UPDATE` statements the same way
 * and never concatenate user-supplied values into SQL. Column names passed in
 * are developer-authored literals from a repository's own patch mapping (never
 * end-user input), while every value is always bound as a parameter.
 */

/**
 * Build a parameterized `SET` clause from a column→value patch map.
 *
 * Only entries whose value is not `undefined` are emitted, so a caller can pass
 * the whole patch object straight through:
 *
 *   const { assignments, params } = buildUpdateAssignments({
 *     name: patch.name,
 *     price_minor: patch.priceMinor,
 *   });
 *   await txn.runAsync(
 *     `UPDATE product SET ${assignments.join(', ')}, updated_at = ? WHERE id = ?`,
 *     ...params, nowIso(), id,
 *   );
 *
 * Returns empty `assignments` when nothing is set — callers should treat that
 * as a no-op (or still bump `updated_at`, per their semantics).
 */
export function buildUpdateAssignments(
  patch: Record<string, SqlValue | undefined>,
): { assignments: string[]; params: SqlValue[] } {
  const assignments: string[] = [];
  const params: SqlValue[] = [];

  for (const [column, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    assignments.push(`${column} = ?`);
    params.push(value);
  }

  return { assignments, params };
}
