import { getDb } from '@/db';

import { getBusinessId } from '@/db/repositories/business-scope';
import { nowIso } from '@/db/repositories/clock';
import type { DatabaseAdapter, SqlValue } from '@/db/repositories/database';
import { REPO_ERROR, mapSqliteError, repoError } from '@/db/repositories/errors';
import { newId } from '@/db/repositories/ids';
import {
  archiveSoftWhere,
  boolFromInt,
  int,
  intBool,
  str,
  strOrNull,
} from '@/db/repositories/mappers';
import { buildUpdateAssignments } from '@/db/repositories/sql';
import { withTransaction } from '@/db/repositories/transaction';
import type { ListOptions } from '@/db/repositories/types';

/**
 * Category data access (migration 001, `category` table).
 *
 * Categories group products in the catalog. They support soft-delete via
 * `archived_at`; the partial unique index `uq_category_name (business_id, name)
 * WHERE archived_at IS NULL` enforces unique live names per business, so a
 * duplicate create maps to `REPO_DUPLICATE` (see errors.ts).
 *
 * Follows the repository conventions (see AGENTS §9.3 / database.ts):
 * - reads resolve `getDb()` directly; writes go through `withTransaction`.
 * - every query is scoped with `business_id = ?`; business id is resolved
 *   internally (never a public parameter).
 * - ids/timestamps come from `newId()`/`nowIso()`.
 */

/** Raw `category` row shape — snake_case, exact DB columns, 0/1 flag as number. */
interface CategoryRow {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  image_uri: string | null;
  sort_order: number;
  is_active: number;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

/** Column list shared by every category SELECT (matches CategoryRow fields). */
const CATEGORY_COLUMNS = `
  id, business_id, name, description, image_uri, sort_order, is_active,
  created_at, updated_at, archived_at`;

/** Coerce an untyped SQLite row into the typed snake_case `CategoryRow`. */
function mapCategoryRow(row: Record<string, unknown>): CategoryRow {
  return {
    id: str(row.id),
    business_id: str(row.business_id),
    name: str(row.name),
    description: strOrNull(row.description),
    image_uri: strOrNull(row.image_uri),
    sort_order: int(row.sort_order),
    is_active: int(row.is_active),
    created_at: str(row.created_at),
    updated_at: str(row.updated_at),
    archived_at: strOrNull(row.archived_at),
  };
}

/** Map a typed row to the public camelCase shape (0/1 flag → boolean). */
const toCategory = (row: CategoryRow) => ({
  id: row.id,
  businessId: row.business_id,
  name: row.name,
  description: row.description,
  imageUri: row.image_uri,
  sortOrder: row.sort_order,
  isActive: boolFromInt(row.is_active),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  archivedAt: row.archived_at,
});

/** Public category type — derived from the private mapper (see auth-repository). */
export type Category = ReturnType<typeof toCategory>;

/** Fields accepted when creating a category. `name` is required and trimmed. */
export interface CreateCategoryInput {
  name: string;
  description?: string;
  imageUri?: string;
  sortOrder?: number;
  isActive?: boolean;
}

/** Patch fields for updating a category (only provided keys are changed). */
export interface UpdateCategoryInput {
  name?: string;
  description?: string;
  imageUri?: string;
  sortOrder?: number;
  isActive?: boolean;
}

/**
 * List categories for the business, live rows by default, ordered
 * `sort_order ASC, name ASC`. Pass `includeArchived` to also return archived
 * rows; `limit`/`offset` provide simple pagination for small catalog tables.
 */
export async function listCategories(opts: ListOptions = {}): Promise<Category[]> {
  const db = await getDb();
  const businessId = await getBusinessId();

  const where = opts.includeArchived ? '' : `AND ${archiveSoftWhere}`;
  let pagination = '';
  const params: SqlValue[] = [businessId];
  if (opts.limit != null) {
    pagination += ' LIMIT ?';
    params.push(opts.limit);
  }
  if (opts.offset != null) {
    pagination += opts.limit != null ? ' OFFSET ?' : ' LIMIT -1 OFFSET ?';
    params.push(opts.offset);
  }

  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT ${CATEGORY_COLUMNS}
       FROM category
      WHERE business_id = ? ${where}
      ORDER BY sort_order ASC, name ASC${pagination}`,
    ...params,
  );
  return rows.map((row) => toCategory(mapCategoryRow(row)));
}

/** Fetch a single live (non-archived) category by id, or `null` when missing. */
export async function getCategoryById(id: string): Promise<Category | null> {
  const db = await getDb();
  const businessId = await getBusinessId();

  const row = await db.getFirstAsync<Record<string, unknown>>(
    `SELECT ${CATEGORY_COLUMNS}
       FROM category
      WHERE id = ? AND business_id = ? AND ${archiveSoftWhere}
      LIMIT 1`,
    id,
    businessId,
  );
  return row ? toCategory(mapCategoryRow(row)) : null;
}

/** Create a category and return the freshly-read mapped row. */
export async function createCategory(input: CreateCategoryInput): Promise<Category> {
  const businessId = await getBusinessId();
  return withTransaction((txn) => createCategoryWithTxn(txn, businessId, input));
}

/** Transactional create: INSERT then select-back the persisted row. */
async function createCategoryWithTxn(
  txn: DatabaseAdapter,
  businessId: string,
  input: CreateCategoryInput,
): Promise<Category> {
  const id = newId();
  const timestamp = nowIso();

  try {
    await txn.runAsync(
      `INSERT INTO category
         (id, business_id, name, description, image_uri, sort_order, is_active,
          created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      businessId,
      input.name.trim(),
      input.description ?? null,
      input.imageUri ?? null,
      input.sortOrder ?? 0,
      intBool(input.isActive ?? true),
      timestamp,
      timestamp,
    );
  } catch (error) {
    // Duplicate live name → REPO_DUPLICATE (partial unique index).
    throw mapSqliteError(error);
  }

  const row = await txn.getFirstAsync<Record<string, unknown>>(
    `SELECT ${CATEGORY_COLUMNS} FROM category WHERE id = ? LIMIT 1`,
    id,
  );
  if (!row) {
    throw repoError(REPO_ERROR.NOT_FOUND, `category not found after insert: ${id}`);
  }
  return toCategory(mapCategoryRow(row));
}

/** Update a category (only provided fields) and return the fresh mapped row. */
export async function updateCategory(
  id: string,
  input: UpdateCategoryInput,
): Promise<Category> {
  const businessId = await getBusinessId();
  return withTransaction((txn) => updateCategoryWithTxn(txn, businessId, id, input));
}

/** Transactional update: verify existence, apply patch, select-back fresh row. */
async function updateCategoryWithTxn(
  txn: DatabaseAdapter,
  businessId: string,
  id: string,
  input: UpdateCategoryInput,
): Promise<Category> {
  // Existence check first so a missing id throws NOT_FOUND (rather than the
  // UPDATE silently affecting 0 rows).
  const existing = await txn.getFirstAsync<{ id: string }>(
    `SELECT id FROM category WHERE id = ? AND business_id = ? LIMIT 1`,
    id,
    businessId,
  );
  if (!existing) {
    throw repoError(REPO_ERROR.NOT_FOUND, `category not found: ${id}`);
  }

  const { assignments, params } = buildUpdateAssignments({
    name: input.name?.trim(),
    description: input.description,
    image_uri: input.imageUri,
    sort_order: input.sortOrder,
    is_active: input.isActive === undefined ? undefined : intBool(input.isActive),
  });

  // Always bump updated_at (a bare timestamp bump is a valid no-op update).
  assignments.push('updated_at = ?');
  params.push(nowIso());

  try {
    await txn.runAsync(
      `UPDATE category SET ${assignments.join(', ')} WHERE id = ? AND business_id = ?`,
      ...params,
      id,
      businessId,
    );
  } catch (error) {
    throw mapSqliteError(error);
  }

  const row = await txn.getFirstAsync<Record<string, unknown>>(
    `SELECT ${CATEGORY_COLUMNS} FROM category WHERE id = ? LIMIT 1`,
    id,
  );
  if (!row) {
    throw repoError(REPO_ERROR.NOT_FOUND, `category not found after update: ${id}`);
  }
  return toCategory(mapCategoryRow(row));
}

/** Soft-delete a category by setting `archived_at`. Throws NOT_FOUND if absent. */
export async function archiveCategory(id: string): Promise<void> {
  const businessId = await getBusinessId();
  await withTransaction((txn) => archiveCategoryWithTxn(txn, businessId, id));
}

/** Transactional archive: verify a live row exists, then soft-delete it. */
async function archiveCategoryWithTxn(
  txn: DatabaseAdapter,
  businessId: string,
  id: string,
): Promise<void> {
  // Live rows only — archiving an already-archived (or missing) row is NOT_FOUND.
  const existing = await txn.getFirstAsync<{ id: string }>(
    `SELECT id FROM category
      WHERE id = ? AND business_id = ? AND ${archiveSoftWhere}
      LIMIT 1`,
    id,
    businessId,
  );
  if (!existing) {
    throw repoError(REPO_ERROR.NOT_FOUND, `category not found: ${id}`);
  }

  const timestamp = nowIso();
  await txn.runAsync(
    `UPDATE category SET archived_at = ?, updated_at = ? WHERE id = ? AND business_id = ?`,
    timestamp,
    timestamp,
    id,
    businessId,
  );
}
