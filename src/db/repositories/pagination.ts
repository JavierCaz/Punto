import { REPO_ERROR, repoError } from '@/db/repositories/errors';

import type { SqlValue } from '@/db/repositories/database';

/**
 * Keyset (cursor) pagination shared by every list endpoint.
 *
 * Rows are ordered by `(created_at, id)` and paged via a "row value" comparison
 * (`(created_at, id) < (?, ?)`) rather than `OFFSET`, which stays stable when
 * rows are inserted/archived between pages and avoids deep offset scans.
 *
 * Cursor format is `${createdAt}|${id}`. Both parts are guaranteed free of the
 * `|` separator (ISO-8601 timestamps and UUIDs never contain it), so the first
 * `|` unambiguously splits them.
 */

/** Default page size when a caller omits `limit`. */
export const DEFAULT_PAGE_LIMIT = 50;

export interface PageQuery {
  /** Max items per page. Defaults to `DEFAULT_PAGE_LIMIT`. */
  limit?: number;
  /** Opaque cursor returned as `nextCursor` by the previous page. */
  cursor?: string;
}

export interface Page<T> {
  items: T[];
  /** Cursor for the next page, or `null` when there are no more rows. */
  nextCursor: string | null;
}

/** Encode a keyset position into an opaque cursor string. */
export function encodeCursor(createdAt: string, id: string): string {
  return `${createdAt}|${id}`;
}

/** Decode a cursor string back into its `{ createdAt, id }` position. */
export function decodeCursor(cursor: string): { createdAt: string; id: string } {
  const separator = cursor.indexOf('|');
  if (separator <= 0 || separator === cursor.length - 1) {
    throw repoError(REPO_ERROR.INVALID_STATE, `malformed cursor: ${cursor}`);
  }
  return {
    createdAt: cursor.slice(0, separator),
    id: cursor.slice(separator + 1),
  };
}

/**
 * `after` is the cursor from the previous page (or `undefined`/`null` for the
 * first page). The returned `clause` is meant to be appended after an existing
 * `WHERE ...` in a query ordered by `created_at DESC, id DESC` (it begins with
 * `AND`), or used standalone when it is the only predicate. Unqualified column
 * names are emitted by default; passing a `qualifier` (e.g. `'ft.'`) prefixes
 * each column so callers that join another table sharing `created_at`/`id`
 * (finance's category join) get an unambiguous tuple.
 */
export function keysetWhere(
  after?: string | null,
  qualifier?: string,
): { clause: string; params: SqlValue[] } {
  if (after == null) {
    return { clause: '', params: [] };
  }
  const { createdAt, id } = decodeCursor(after);
  const q = qualifier ?? '';
  return { clause: `AND (${q}created_at, ${q}id) < (?, ?)`, params: [createdAt, id] };
}
