import { getDb } from '@/db/client';

import { getBusinessId } from '@/db/repositories/business-scope';
import { nowIso } from '@/db/repositories/clock';
import type { DatabaseAdapter } from '@/db/repositories/database';
import { REPO_ERROR, mapSqliteError, repoError } from '@/db/repositories/errors';
import { newId } from '@/db/repositories/ids';
import {
  boolFromInt,
  int,
  intBool,
  str,
  strOrNull,
} from '@/db/repositories/mappers';
import { buildUpdateAssignments } from '@/db/repositories/sql';
import { withTransaction } from '@/db/repositories/transaction';
import type { QuantityMilli } from '@/db/repositories/types';

/**
 * Recipe entity repository (migration 001, tables `recipe` + `recipe_item`).
 *
 * A recipe is product-bound: selling the product consumes its ingredients
 * (AGENTS §3.1). `recipe.product_id` carries a UNIQUE constraint so there is at
 * most one recipe per product. A product is tracked EITHER by a direct 1:1
 * stock bridge (`product.inventory_item_id`) OR by a recipe — never both, so
 * `upsertRecipe` rejects a directly-stocked product with `REPO_INVALID_STATE`
 * (mirroring the reverse check in product.ts).
 *
 * Unlike catalog/supplier/employee tables, `recipe` has NO `archived_at` — its
 * availability is toggled via `is_active` only. `recipe_item` has no
 * `business_id` column; children are scoped implicitly through their parent
 * recipe, which is itself scoped by `business_id = ?`.
 *
 * Follows the repository conventions (see AGENTS §9.3 / database.ts):
 * - reads resolve `getDb()` directly; writes go through `withTransaction`.
 * - every recipe query is scoped with `business_id = ?`; business id is
 *   resolved internally (never a public parameter).
 * - ids/timestamps come from `newId()`/`nowIso()`; quantities are integer
 *   milli-units (`QuantityMilli`) — never floats (AGENTS §6).
 */

// ---------------------------------------------------------------------------
// Row shapes (snake_case — the exact `recipe` / `recipe_item` columns from
// migration 001). INTEGER 0/1 flags stay `number` here and are coerced to
// booleans in the mappers so mapping stays a pure, total transformation.
// ---------------------------------------------------------------------------
interface RecipeRow {
  id: string;
  business_id: string;
  product_id: string;
  name: string;
  description: string | null;
  notes: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

interface RecipeItemRow {
  id: string;
  recipe_id: string;
  inventory_item_id: string;
  quantity: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// Coerce a raw SQLite row (`Record<string, unknown>`) into the typed snake_case
// row. Total and type-safe: NULL → null, values → canonical string/number form.
function mapRecipeRow(row: Record<string, unknown>): RecipeRow {
  return {
    id: str(row.id),
    business_id: str(row.business_id),
    product_id: str(row.product_id),
    name: str(row.name),
    description: strOrNull(row.description),
    notes: strOrNull(row.notes),
    is_active: int(row.is_active),
    created_at: str(row.created_at),
    updated_at: str(row.updated_at),
  };
}

function mapRecipeItemRow(row: Record<string, unknown>): RecipeItemRow {
  return {
    id: str(row.id),
    recipe_id: str(row.recipe_id),
    inventory_item_id: str(row.inventory_item_id),
    quantity: int(row.quantity),
    sort_order: int(row.sort_order),
    created_at: str(row.created_at),
    updated_at: str(row.updated_at),
  };
}

// snake_case row → camelCase public object. The single mapping surface so every
// read (getByProductId, list, select-back after write) returns the identical
// shape. Nullable columns stay null; the 0/1 `is_active` flag becomes boolean.
const toRecipe = (row: RecipeRow) => ({
  id: row.id,
  businessId: row.business_id,
  productId: row.product_id,
  name: row.name,
  description: row.description,
  notes: row.notes,
  isActive: boolFromInt(row.is_active),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export type Recipe = ReturnType<typeof toRecipe>;

const toRecipeItem = (row: RecipeItemRow) => ({
  id: row.id,
  recipeId: row.recipe_id,
  inventoryItemId: row.inventory_item_id,
  quantity: row.quantity,
  sortOrder: row.sort_order,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export type RecipeItem = ReturnType<typeof toRecipeItem>;

/** A recipe together with its ordered ingredient lines. */
export type RecipeDetail = Recipe & { items: RecipeItem[] };

/** One ingredient line supplied to `upsertRecipe`. `quantity` is milli-units. */
export interface RecipeItemInput {
  inventoryItemId: string;
  quantity: QuantityMilli;
  sortOrder?: number;
}

/** Full upsert payload. `items` REPLACES the existing ingredient lines. */
export interface UpsertRecipeInput {
  /** Existing recipe id. When omitted, the upsert is keyed by `productId`. */
  id?: string;
  productId: string;
  name?: string;
  description?: string;
  notes?: string;
  isActive?: boolean;
  items: RecipeItemInput[];
}

/** Column list shared by every recipe SELECT (matches RecipeRow fields). */
const RECIPE_COLUMNS = `
  id, business_id, product_id, name, description, notes, is_active,
  created_at, updated_at`;

/** Column list shared by every recipe_item SELECT (matches RecipeItemRow fields). */
const RECIPE_ITEM_COLUMNS = `
  id, recipe_id, inventory_item_id, quantity, sort_order, created_at, updated_at`;

/** Map an array of raw rows to public `RecipeItem`s (pure, no I/O). */
function mapRecipeItems(rows: Record<string, unknown>[]): RecipeItem[] {
  return rows.map((row) => toRecipeItem(mapRecipeItemRow(row)));
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/**
 * Fetch the recipe (with its ingredient lines, `sort_order ASC`) bound to the
 * given product, or `null` when the product has no recipe.
 */
export async function getRecipeByProductId(productId: string): Promise<RecipeDetail | null> {
  const db = await getDb();
  const businessId = await getBusinessId();

  const row = await db.getFirstAsync<Record<string, unknown>>(
    `SELECT ${RECIPE_COLUMNS} FROM recipe
      WHERE product_id = ? AND business_id = ?
      LIMIT 1`,
    productId,
    businessId,
  );
  if (!row) {
    return null;
  }

  const recipe = toRecipe(mapRecipeRow(row));
  const itemRows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT ${RECIPE_ITEM_COLUMNS} FROM recipe_item
      WHERE recipe_id = ?
      ORDER BY sort_order ASC`,
    recipe.id,
  );
  return { ...recipe, items: mapRecipeItems(itemRows) };
}

/**
 * List every recipe for the business, `name ASC`, each with its ingredient
 * lines attached.
 *
 * N+1 avoidance: instead of issuing one `SELECT … FROM recipe_item` per recipe,
 * the children are fetched in a SINGLE `WHERE recipe_id IN (…, …, …)` query and
 * grouped in memory by `recipe_id`. Catalog recipes are small, so the id list
 * stays comfortably within SQLite's bind-variable limit.
 */
export async function listRecipes(): Promise<RecipeDetail[]> {
  const db = await getDb();
  const businessId = await getBusinessId();

  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT ${RECIPE_COLUMNS} FROM recipe
      WHERE business_id = ?
      ORDER BY name ASC`,
    businessId,
  );
  if (rows.length === 0) {
    return [];
  }

  const recipes = rows.map((row) => toRecipe(mapRecipeRow(row)));

  // Single batched fetch of every child, then a JS-side group by recipe_id.
  const placeholders = recipes.map(() => '?').join(', ');
  const itemRows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT ${RECIPE_ITEM_COLUMNS} FROM recipe_item
      WHERE recipe_id IN (${placeholders})
      ORDER BY sort_order ASC`,
    ...recipes.map((recipe) => recipe.id),
  );

  // Preserve the `sort_order ASC` order within each recipe while grouping.
  const itemsByRecipe = new Map<string, RecipeItem[]>();
  for (const row of itemRows) {
    const item = toRecipeItem(mapRecipeItemRow(row));
    const bucket = itemsByRecipe.get(item.recipeId);
    if (bucket) {
      bucket.push(item);
    } else {
      itemsByRecipe.set(item.recipeId, [item]);
    }
  }

  return recipes.map((recipe) => ({ ...recipe, items: itemsByRecipe.get(recipe.id) ?? [] }));
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

/**
 * Create or update a recipe (keyed by product) and replace its ingredient
 * lines atomically. Returns the persisted `RecipeDetail`.
 *
 * Semantics:
 * - validates every item `quantity > 0` and rejects duplicate ingredient ids;
 * - verifies the product exists and is NOT directly stocked (bridge XOR recipe);
 * - when `id` is given it must already exist (`REPO_NOT_FOUND` otherwise);
 *   otherwise the recipe is looked up by `product_id` and updated if found, or
 *   inserted when absent;
 * - `recipe_item` children are replaced via DELETE-then-INSERT inside the same
 *   transaction so the caller never observes a half-written recipe.
 */
export async function upsertRecipe(input: UpsertRecipeInput): Promise<RecipeDetail> {
  const businessId = await getBusinessId();
  return withTransaction((txn) => upsertRecipeWithTxn(txn, businessId, input));
}

export async function upsertRecipeWithTxn(
  txn: DatabaseAdapter,
  businessId: string,
  input: UpsertRecipeInput,
): Promise<RecipeDetail> {
  // Validate BEFORE any read/write: a recipe line must consume a positive
  // quantity and reference each inventory item at most once.
  validateRecipeItems(input.items);

  // Verify the target product exists and has NO direct-stock bridge. A bridged
  // product sells by decrementing a single stock item, so it cannot also have a
  // recipe (bridge XOR recipe — see product.ts).
  const product = await txn.getFirstAsync<{ id: string; inventory_item_id: string | null }>(
    `SELECT id, inventory_item_id FROM product
      WHERE id = ? AND business_id = ?
      LIMIT 1`,
    input.productId,
    businessId,
  );
  if (!product) {
    throw repoError(REPO_ERROR.NOT_FOUND, `product not found: ${input.productId}`);
  }
  if (product.inventory_item_id != null) {
    throw repoError(
      REPO_ERROR.INVALID_STATE,
      `product is directly stocked; cannot also have a recipe: ${input.productId}`,
    );
  }

  // Resolve the target recipe id. An explicit `id` must already exist; without
  // it the upsert is keyed by `product_id` (UNIQUE) and falls back to insert.
  let recipeId: string;
  if (input.id != null) {
    const existing = await txn.getFirstAsync<{ id: string; product_id: string }>(
      `SELECT id, product_id FROM recipe WHERE id = ? AND business_id = ? LIMIT 1`,
      input.id,
      businessId,
    );
    if (!existing) {
      throw repoError(REPO_ERROR.NOT_FOUND, `recipe not found: ${input.id}`);
    }
    // A recipe is permanently bound to its product (recipe.product_id is the
    // product key). Reject an explicit id that targets a DIFFERENT product
    // rather than silently moving the recipe (which would orphan its items and
    // violate the UNIQUE product key).
    if (existing.product_id !== input.productId) {
      throw repoError(
        REPO_ERROR.INVALID_STATE,
        `recipe ${input.id} is bound to product ${existing.product_id}; cannot reassign to ${input.productId}`,
      );
    }
    recipeId = existing.id;
    await updateRecipeRow(txn, businessId, recipeId, input);
  } else {
    const existing = await txn.getFirstAsync<{ id: string }>(
      `SELECT id FROM recipe WHERE product_id = ? AND business_id = ? LIMIT 1`,
      input.productId,
      businessId,
    );
    if (existing) {
      recipeId = existing.id;
      await updateRecipeRow(txn, businessId, recipeId, input);
    } else {
      recipeId = await insertRecipeRow(txn, businessId, input);
    }
  }

  // Atomically replace the ingredient lines (DELETE all, then re-INSERT).
  await replaceRecipeItems(txn, recipeId, input.items);

  // Select-back inside the transaction so the caller receives the canonical
  // freshly-mapped recipe and its ordered items.
  const recipeRow = await txn.getFirstAsync<Record<string, unknown>>(
    `SELECT ${RECIPE_COLUMNS} FROM recipe WHERE id = ? AND business_id = ? LIMIT 1`,
    recipeId,
    businessId,
  );
  if (!recipeRow) {
    throw repoError(REPO_ERROR.NOT_FOUND, `recipe not found after upsert: ${recipeId}`);
  }
  const itemRows = await txn.getAllAsync<Record<string, unknown>>(
    `SELECT ${RECIPE_ITEM_COLUMNS} FROM recipe_item
      WHERE recipe_id = ?
      ORDER BY sort_order ASC`,
    recipeId,
  );
  return { ...toRecipe(mapRecipeRow(recipeRow)), items: mapRecipeItems(itemRows) };
}

/** Domain validation for recipe ingredient lines (thrown before any I/O). */
function validateRecipeItems(items: RecipeItemInput[]): void {
  const seen = new Set<string>();
  for (const item of items) {
    if (!(item.quantity > 0)) {
      throw repoError(REPO_ERROR.INVALID_STATE, 'recipe item quantity must be > 0');
    }
    if (seen.has(item.inventoryItemId)) {
      throw repoError(
        REPO_ERROR.INVALID_STATE,
        `duplicate inventory item in recipe: ${item.inventoryItemId}`,
      );
    }
    seen.add(item.inventoryItemId);
  }
}

/** Patch the scalar recipe fields; unset fields are preserved. Always bumps `updated_at`. */
async function updateRecipeRow(
  txn: DatabaseAdapter,
  businessId: string,
  recipeId: string,
  input: UpsertRecipeInput,
): Promise<void> {
  const { assignments, params } = buildUpdateAssignments({
    product_id: input.productId,
    name: input.name?.trim(),
    description: input.description,
    notes: input.notes,
    is_active: input.isActive === undefined ? undefined : intBool(input.isActive),
  });

  // Always bump updated_at (a bare timestamp bump is a valid no-op update).
  assignments.push('updated_at = ?');
  params.push(nowIso());

  try {
    await txn.runAsync(
      `UPDATE recipe SET ${assignments.join(', ')} WHERE id = ? AND business_id = ?`,
      ...params,
      recipeId,
      businessId,
    );
  } catch (error) {
    throw mapSqliteError(error);
  }
}

/** Insert a fresh recipe row and return its new id. */
async function insertRecipeRow(
  txn: DatabaseAdapter,
  businessId: string,
  input: UpsertRecipeInput,
): Promise<string> {
  const id = newId();
  const timestamp = nowIso();

  try {
    await txn.runAsync(
      `INSERT INTO recipe
         (id, business_id, product_id, name, description, notes, is_active,
          created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      businessId,
      input.productId,
      input.name?.trim() ?? '',
      input.description ?? null,
      input.notes ?? null,
      intBool(input.isActive ?? true),
      timestamp,
      timestamp,
    );
  } catch (error) {
    // A duplicate product_id (UNIQUE) maps to REPO_DUPLICATE.
    throw mapSqliteError(error);
  }

  return id;
}

/** Delete the existing children then insert the new set (atomic replace). */
async function replaceRecipeItems(
  txn: DatabaseAdapter,
  recipeId: string,
  items: RecipeItemInput[],
): Promise<void> {
  await txn.runAsync(`DELETE FROM recipe_item WHERE recipe_id = ?`, recipeId);

  for (let index = 0; index < items.length; index++) {
    const item = items[index];
    const id = newId();
    const timestamp = nowIso();
    try {
      await txn.runAsync(
        `INSERT INTO recipe_item
           (id, recipe_id, inventory_item_id, quantity, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        id,
        recipeId,
        item.inventoryItemId,
        item.quantity,
        item.sortOrder ?? index,
        timestamp,
        timestamp,
      );
    } catch (error) {
      // Duplicate (recipe_id, inventory_item_id) → REPO_DUPLICATE.
      throw mapSqliteError(error);
    }
  }
}

/**
 * Toggle a recipe's availability (`is_active`) without deleting it. Returns the
 * refreshed `RecipeDetail`. Throws `REPO_NOT_FOUND` when the recipe is absent.
 */
export async function setRecipeActive(id: string, isActive: boolean): Promise<RecipeDetail> {
  const businessId = await getBusinessId();
  return withTransaction((txn) => setRecipeActiveWithTxn(txn, businessId, id, isActive));
}

async function setRecipeActiveWithTxn(
  txn: DatabaseAdapter,
  businessId: string,
  id: string,
  isActive: boolean,
): Promise<RecipeDetail> {
  // Existence check first so a missing id throws NOT_FOUND (rather than the
  // UPDATE silently affecting 0 rows).
  const existing = await txn.getFirstAsync<{ id: string }>(
    `SELECT id FROM recipe WHERE id = ? AND business_id = ? LIMIT 1`,
    id,
    businessId,
  );
  if (!existing) {
    throw repoError(REPO_ERROR.NOT_FOUND, `recipe not found: ${id}`);
  }

  try {
    await txn.runAsync(
      `UPDATE recipe SET is_active = ?, updated_at = ? WHERE id = ? AND business_id = ?`,
      intBool(isActive),
      nowIso(),
      id,
      businessId,
    );
  } catch (error) {
    throw mapSqliteError(error);
  }

  // Select-back the fresh recipe + items so the caller gets the canonical shape.
  const recipeRow = await txn.getFirstAsync<Record<string, unknown>>(
    `SELECT ${RECIPE_COLUMNS} FROM recipe WHERE id = ? AND business_id = ? LIMIT 1`,
    id,
    businessId,
  );
  if (!recipeRow) {
    throw repoError(REPO_ERROR.NOT_FOUND, `recipe not found after update: ${id}`);
  }
  const itemRows = await txn.getAllAsync<Record<string, unknown>>(
    `SELECT ${RECIPE_ITEM_COLUMNS} FROM recipe_item
      WHERE recipe_id = ?
      ORDER BY sort_order ASC`,
    id,
  );
  return { ...toRecipe(mapRecipeRow(recipeRow)), items: mapRecipeItems(itemRows) };
}
