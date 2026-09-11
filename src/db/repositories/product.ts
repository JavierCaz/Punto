import { getDb } from '@/db/client';

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
import type { ListOptions, MoneyMinor } from '@/db/repositories/types';

/**
 * Product entity repository (migration 001, table `product`).
 *
 * Products are the sellable catalog items. A product is either tracked via a
 * direct 1:1 stock bridge (`inventory_item_id`, retail: selling decrements that
 * item directly) OR via a recipe that consumes ingredients (restaurant) — never
 * both (AGENTS §3.1, migration 001 comment block). When `inventory_item_id` is
 * NULL and there is no recipe, the product is untracked.
 *
 * Every query is scoped to the single business row; reads run against `getDb()`,
 * writes run inside `withTransaction`, and rows are soft-deleted via
 * `archived_at` (live rows satisfy `archived_at IS NULL`).
 *
 * Uniqueness is enforced by three partial unique indexes (all scoped to live
 * rows): `uq_product_name (business_id, name)`, `uq_product_sku (business_id,
 * sku) WHERE sku IS NOT NULL`, `uq_product_barcode (business_id, barcode)
 * WHERE barcode IS NOT NULL` — a UNIQUE violation maps to `REPO_DUPLICATE`
 * via `mapSqliteError`. `inventory_item_id` itself carries a column UNIQUE
 * constraint (a stock item can bridge to at most one product), so a duplicate
 * bridge also maps to `REPO_DUPLICATE`.
 */

// ---------------------------------------------------------------------------
// Row shape (snake_case — the exact `product` columns from migration 001).
// INTEGER 0/1 flags are kept as `number`; money stays in integer minor units
// (never floats — AGENTS §6).
// ---------------------------------------------------------------------------
interface ProductRow {
  id: string;
  business_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  image_uri: string | null;
  sku: string | null;
  barcode: string | null;
  price_minor: number;
  inventory_item_id: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

// Coerce a raw SQLite row (`Record<string, unknown>`) into the typed snake_case
// row. Total and type-safe: NULL → null, values → canonical string/number form.
function mapProductRow(row: Record<string, unknown>): ProductRow {
  return {
    id: str(row.id),
    business_id: str(row.business_id),
    category_id: strOrNull(row.category_id),
    name: str(row.name),
    description: strOrNull(row.description),
    image_uri: strOrNull(row.image_uri),
    sku: strOrNull(row.sku),
    barcode: strOrNull(row.barcode),
    price_minor: int(row.price_minor),
    inventory_item_id: strOrNull(row.inventory_item_id),
    is_active: int(row.is_active),
    created_at: str(row.created_at),
    updated_at: str(row.updated_at),
    archived_at: strOrNull(row.archived_at),
  };
}

// snake_case row → camelCase public object. The single mapping surface so every
// read (list, getById, create/update select-back) returns the identical shape.
// Nullable columns stay null; the 0/1 `is_active` flag becomes a boolean.
const toProduct = (row: ProductRow) => ({
  id: row.id,
  businessId: row.business_id,
  categoryId: row.category_id,
  name: row.name,
  description: row.description,
  imageUri: row.image_uri,
  sku: row.sku,
  barcode: row.barcode,
  priceMinor: row.price_minor,
  inventoryItemId: row.inventory_item_id,
  isActive: boolFromInt(row.is_active),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  archivedAt: row.archived_at,
});

export type Product = ReturnType<typeof toProduct>;

/** Column list shared by every product SELECT (matches ProductRow fields). */
const PRODUCT_COLUMNS = `
  id, business_id, category_id, name, description, image_uri, sku, barcode,
  price_minor, inventory_item_id, is_active, created_at, updated_at,
  archived_at`;

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/** Extra list filters on top of the shared `ListOptions`. */
export interface ListProductsOptions extends ListOptions {
  /** Only products in this category (FK to `category.id`). */
  categoryId?: string;
  /** Case-insensitive `name LIKE %term%` substring search. */
  search?: string;
}

/**
 * List products for the business, ordered by `name ASC`.
 *
 * Soft-deleted (archived) rows are excluded unless `opts.includeArchived`.
 * Optional `categoryId` narrows to a single category; optional `search` does a
 * case-insensitive substring match on `name` (SQLite `LIKE` is ASCII case-
 * insensitive by default).
 */
export async function listProducts(opts: ListProductsOptions = {}): Promise<Product[]> {
  const businessId = await getBusinessId();
  const db = await getDb();

  // Build the dynamic WHERE tail. Every optional predicate is appended in the
  // exact order its parameter is pushed onto `params`, so `?` placeholders line
  // up 1:1. `archiveSoftWhere` is a bare predicate (`archived_at IS NULL`), the
  // others are `column = ?` / `name LIKE ?`.
  const conditions: string[] = [];
  const params: SqlValue[] = [businessId];

  if (!opts.includeArchived) {
    conditions.push(archiveSoftWhere);
  }
  if (opts.categoryId != null) {
    conditions.push('category_id = ?');
    params.push(opts.categoryId);
  }
  const term = opts.search?.trim();
  if (term) {
    conditions.push('name LIKE ?');
    params.push(`%${term}%`);
  }

  // Dynamic pagination (see AGENTS §9.3): only the fields the caller set.
  let pagination = '';
  if (opts.limit != null) {
    pagination += ' LIMIT ?';
    params.push(opts.limit);
  }
  if (opts.offset != null) {
    pagination += opts.limit != null ? ' OFFSET ?' : ' LIMIT -1 OFFSET ?';
    params.push(opts.offset);
  }

  const where = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : '';

  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT ${PRODUCT_COLUMNS} FROM product
      WHERE business_id = ? ${where}
      ORDER BY name ASC${pagination}`,
    ...params,
  );
  return rows.map((row) => toProduct(mapProductRow(row)));
}

/** Fetch a single live product by id (archived rows return `null`). */
export async function getProductById(id: string): Promise<Product | null> {
  const businessId = await getBusinessId();
  const db = await getDb();

  const row = await db.getFirstAsync<Record<string, unknown>>(
    `SELECT ${PRODUCT_COLUMNS} FROM product
      WHERE id = ? AND business_id = ? AND ${archiveSoftWhere}
      LIMIT 1`,
    id,
    businessId,
  );
  return row ? toProduct(mapProductRow(row)) : null;
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

/** Fields accepted when creating a product. `name` and `priceMinor` required. */
export interface CreateProductInput {
  /** Display name. Required; trimmed. */
  name: string;
  /** Category FK (`category.id`); nullable, no over-validation. */
  categoryId?: string;
  description?: string;
  imageUri?: string;
  sku?: string;
  barcode?: string;
  /** Base/default selling price, integer minor currency. Must be `>= 0`. */
  priceMinor: MoneyMinor;
  /** Optional 1:1 direct-stock bridge (retail). Mutually exclusive with a recipe. */
  inventoryItemId?: string;
  /** Availability toggle (hide from POS without deleting). Defaults true. */
  isActive?: boolean;
}

export async function createProduct(input: CreateProductInput): Promise<Product> {
  const businessId = await getBusinessId();
  return withTransaction((txn) => createProductWithTxn(txn, businessId, input));
}

async function createProductWithTxn(
  txn: DatabaseAdapter,
  businessId: string,
  input: CreateProductInput,
): Promise<Product> {
  // Validate BEFORE any write: the schema CHECK (price_minor >= 0) is mirrored
  // here so a negative price is a loud domain error, not a raw SQLite failure.
  if (input.priceMinor < 0) {
    throw repoError(REPO_ERROR.INVALID_STATE, 'price_minor must be >= 0');
  }

  const id = newId();
  const timestamp = nowIso();

  // XOR invariant: a product sells EITHER by decrementing a direct stock item
  // (`inventory_item_id`) OR via a recipe — never both. Bridging to a stock
  // item is only legal when no recipe exists for this product. A fresh id can
  // never have a recipe yet, but the check stays here (mirroring the update
  // path) so the invariant is enforced uniformly.
  if (input.inventoryItemId != null) {
    const recipe = await txn.getFirstAsync<{ id: string }>(
      `SELECT id FROM recipe WHERE product_id = ? AND business_id = ? LIMIT 1`,
      id,
      businessId,
    );
    if (recipe) {
      throw repoError(
        REPO_ERROR.INVALID_STATE,
        `product has a recipe; cannot also bridge inventory_item_id`,
      );
    }
  }

  try {
    await txn.runAsync(
      `INSERT INTO product
         (id, business_id, category_id, name, description, image_uri, sku, barcode,
          price_minor, inventory_item_id, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      businessId,
      input.categoryId ?? null,
      input.name.trim(),
      input.description ?? null,
      input.imageUri ?? null,
      input.sku ?? null,
      input.barcode ?? null,
      input.priceMinor,
      input.inventoryItemId ?? null,
      intBool(input.isActive ?? true),
      timestamp,
      timestamp,
    );
  } catch (error) {
    // Duplicate name/sku/barcode (partial unique indexes) or duplicate
    // inventory_item_id (column UNIQUE) → REPO_DUPLICATE.
    throw mapSqliteError(error);
  }

  // Select-back inside the transaction so the caller receives the canonical
  // freshly-mapped row.
  const row = await txn.getFirstAsync<Record<string, unknown>>(
    `SELECT ${PRODUCT_COLUMNS} FROM product WHERE id = ? AND business_id = ? LIMIT 1`,
    id,
    businessId,
  );
  if (!row) {
    throw repoError(REPO_ERROR.NOT_FOUND, `product not found after insert: ${id}`);
  }
  return toProduct(mapProductRow(row));
}

/** Patch fields for updating a product (only provided keys are changed). */
export interface UpdateProductInput {
  name?: string;
  categoryId?: string;
  description?: string;
  imageUri?: string;
  sku?: string;
  barcode?: string;
  priceMinor?: MoneyMinor;
  /** Optional 1:1 direct-stock bridge. `null` clears it; `undefined` leaves it unchanged. */
  inventoryItemId?: string | null;
  isActive?: boolean;
}

export async function updateProduct(id: string, input: UpdateProductInput): Promise<Product> {
  const businessId = await getBusinessId();
  return withTransaction((txn) => updateProductWithTxn(txn, businessId, id, input));
}

async function updateProductWithTxn(
  txn: DatabaseAdapter,
  businessId: string,
  id: string,
  input: UpdateProductInput,
): Promise<Product> {
  // Validate BEFORE any write if the price is being patched (schema CHECK).
  if (input.priceMinor !== undefined && input.priceMinor < 0) {
    throw repoError(REPO_ERROR.INVALID_STATE, 'price_minor must be >= 0');
  }

  // Existence check first so a missing id throws NOT_FOUND (rather than the
  // UPDATE silently affecting 0 rows).
  const existing = await txn.getFirstAsync<{ id: string }>(
    `SELECT id FROM product WHERE id = ? AND business_id = ? LIMIT 1`,
    id,
    businessId,
  );
  if (!existing) {
    throw repoError(REPO_ERROR.NOT_FOUND, `product not found: ${id}`);
  }

  // XOR invariant (see create): bridging to a direct stock item is illegal when
  // this product already has a recipe.
  if (input.inventoryItemId != null) {
    const recipe = await txn.getFirstAsync<{ id: string }>(
      `SELECT id FROM recipe WHERE product_id = ? AND business_id = ? LIMIT 1`,
      id,
      businessId,
    );
    if (recipe) {
      throw repoError(
        REPO_ERROR.INVALID_STATE,
        `product has a recipe; cannot also bridge inventory_item_id`,
      );
    }
  }

  // Only present (non-undefined) fields become SET assignments; values are
  // always bound as parameters, never inlined into the SQL string.
  const { assignments, params } = buildUpdateAssignments({
    category_id: input.categoryId,
    name: input.name?.trim(),
    description: input.description,
    image_uri: input.imageUri,
    sku: input.sku,
    barcode: input.barcode,
    price_minor: input.priceMinor,
    inventory_item_id: input.inventoryItemId,
    is_active: input.isActive === undefined ? undefined : intBool(input.isActive),
  });

  // Always bump updated_at (a bare timestamp bump is a valid no-op update).
  assignments.push('updated_at = ?');
  params.push(nowIso());

  try {
    await txn.runAsync(
      `UPDATE product SET ${assignments.join(', ')} WHERE id = ? AND business_id = ?`,
      ...params,
      id,
      businessId,
    );
  } catch (error) {
    throw mapSqliteError(error);
  }

  const row = await txn.getFirstAsync<Record<string, unknown>>(
    `SELECT ${PRODUCT_COLUMNS} FROM product WHERE id = ? AND business_id = ? LIMIT 1`,
    id,
    businessId,
  );
  if (!row) {
    throw repoError(REPO_ERROR.NOT_FOUND, `product not found after update: ${id}`);
  }
  return toProduct(mapProductRow(row));
}

/** Soft-delete a product. Throws `REPO_NOT_FOUND` when absent or already archived. */
export async function archiveProduct(id: string): Promise<void> {
  const businessId = await getBusinessId();
  await withTransaction((txn) => archiveProductWithTxn(txn, businessId, id));
}

async function archiveProductWithTxn(
  txn: DatabaseAdapter,
  businessId: string,
  id: string,
): Promise<void> {
  // Existence guard (live rows only) so archiving a missing/archived product is
  // a loud NOT_FOUND rather than a silent 0-row update.
  const existing = await txn.getFirstAsync<{ id: string }>(
    `SELECT id FROM product WHERE id = ? AND business_id = ? AND ${archiveSoftWhere} LIMIT 1`,
    id,
    businessId,
  );
  if (!existing) {
    throw repoError(REPO_ERROR.NOT_FOUND, `product not found: ${id}`);
  }

  const timestamp = nowIso();
  try {
    await txn.runAsync(
      `UPDATE product SET archived_at = ?, updated_at = ? WHERE id = ? AND business_id = ?`,
      timestamp,
      timestamp,
      id,
      businessId,
    );
  } catch (error) {
    throw mapSqliteError(error);
  }
}
