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
import type { ListOptions, MoneyMinor, QuantityMilli } from '@/db/repositories/types';

/**
 * Inventory item / ingredient entity repository (migration 001, table
 * `inventory_item`).
 *
 * Stockable raw materials with a unit of measure (g, ml, unit …). Every query
 * is scoped to the single business row; reads run against `getDb()`, writes run
 * inside `withTransaction`, and rows are soft-deleted via `archived_at`.
 *
 * ⚠️ CRITICAL INVARIANT — `current_quantity` IS A CACHE, NOT A FIELD YOU EDIT:
 *
 * `current_quantity` is owned EXCLUSIVELY by the inventory movement ledger
 * (Phase 3). It is a denormalized snapshot of `SUM(inventory_movement.quantity)`
 * maintained inside the same transaction as each movement. Any other writer
 * that mutates `current_quantity` will silently drift the cache away from the
 * ledger and corrupt stock counts.
 *
 * Concretely, this repository enforces the invariant by construction:
 *   - `createInventoryItem` always inserts `current_quantity = 0` (a brand-new
 *     item has no movements yet; initial stock is posted as a ledger movement).
 *   - `updateInventoryItem` does NOT accept — and never writes — a
 *     `currentQuantity` field. There is no input property for it, so a
 *     `current_quantity` column can never appear in its UPDATE statement.
 *
 * Duplicate live names are rejected by the partial unique index
 * `uq_inventory_item_name (business_id, name) WHERE archived_at IS NULL`.
 */

// ---------------------------------------------------------------------------
// Row shape (snake_case — the exact `inventory_item` columns from migration
// 001). INTEGER 0/1 flags are kept as `number`; quantities/costs are integer
// milli-units / minor-units (never floats — AGENTS §6).
// ---------------------------------------------------------------------------
interface InventoryItemRow {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  image_uri: string | null;
  unit_id: string;
  current_quantity: number;
  minimum_quantity: number;
  unit_cost_minor: number;
  is_active: number;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

// Coerce a raw SQLite row into the typed snake_case row (total, type-safe).
function mapInventoryItemRow(row: Record<string, unknown>): InventoryItemRow {
  return {
    id: str(row.id),
    business_id: str(row.business_id),
    name: str(row.name),
    description: strOrNull(row.description),
    image_uri: strOrNull(row.image_uri),
    unit_id: str(row.unit_id),
    current_quantity: int(row.current_quantity),
    minimum_quantity: int(row.minimum_quantity),
    unit_cost_minor: int(row.unit_cost_minor),
    is_active: int(row.is_active),
    created_at: str(row.created_at),
    updated_at: str(row.updated_at),
    archived_at: strOrNull(row.archived_at),
  };
}

// snake_case row → camelCase public object (the single mapping surface).
const toInventoryItem = (row: InventoryItemRow) => ({
  id: row.id,
  businessId: row.business_id,
  name: row.name,
  description: row.description,
  imageUri: row.image_uri,
  unitId: row.unit_id,
  currentQuantity: row.current_quantity,
  minimumQuantity: row.minimum_quantity,
  unitCostMinor: row.unit_cost_minor,
  isActive: boolFromInt(row.is_active),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  archivedAt: row.archived_at,
});

export type InventoryItem = ReturnType<typeof toInventoryItem>;

const INVENTORY_ITEM_COLUMNS = `
  id, business_id, name, description, image_uri, unit_id,
  current_quantity, minimum_quantity, unit_cost_minor, is_active,
  created_at, updated_at, archived_at`;

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/**
 * List inventory items for the business, ordered by `name ASC`.
 * Soft-deleted (archived) rows are excluded unless `opts.includeArchived`.
 */
export async function listInventoryItems(opts: ListOptions = {}): Promise<InventoryItem[]> {
  const businessId = await getBusinessId();
  const db = await getDb();

  // Dynamic archive/pagination clauses (see AGENTS §9.3 dynamic list pattern).
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
    `SELECT ${INVENTORY_ITEM_COLUMNS} FROM inventory_item
      WHERE business_id = ? ${where}
      ORDER BY name ASC${pagination}`,
    ...params,
  );
  return rows.map((row) => toInventoryItem(mapInventoryItemRow(row)));
}

/** Fetch a single live inventory item by id (archived rows return `null`). */
export async function getInventoryItemById(id: string): Promise<InventoryItem | null> {
  const businessId = await getBusinessId();
  const db = await getDb();

  const row = await db.getFirstAsync<Record<string, unknown>>(
    `SELECT ${INVENTORY_ITEM_COLUMNS} FROM inventory_item
      WHERE id = ? AND business_id = ? AND ${archiveSoftWhere}
      LIMIT 1`,
    id,
    businessId,
  );
  return row ? toInventoryItem(mapInventoryItemRow(row)) : null;
}

/**
 * Live items that have hit their low-stock threshold: `is_active = 1` AND
 * `minimum_quantity > 0` AND `current_quantity <= minimum_quantity`, ordered by
 * the most-critical (lowest) quantity first. Reads the `current_quantity` cache
 * that the ledger maintains (never written here — see the module invariant).
 *
 * This is a broad "needs attention" list: it INCLUDES out-of-stock rows
 * (`current_quantity <= 0`). Callers that must distinguish amber (low) from
 * red (out) should classify each row with `getStockStatus`.
 */
export async function listLowStockItems(): Promise<InventoryItem[]> {
  const businessId = await getBusinessId();
  const db = await getDb();

  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT ${INVENTORY_ITEM_COLUMNS} FROM inventory_item
      WHERE business_id = ? AND ${archiveSoftWhere} AND is_active = 1
        AND minimum_quantity > 0 AND current_quantity <= minimum_quantity
      ORDER BY current_quantity ASC`,
    businessId,
  );
  return rows.map((row) => toInventoryItem(mapInventoryItemRow(row)));
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export interface CreateInventoryItemInput {
  /** Display name. Required; trimmed. */
  name: string;
  description?: string;
  imageUri?: string;
  /** Unit of measure (references `unit.id`). Required. */
  unitId: string;
  /** Low-stock warning threshold in milli-units. Defaults to 0 (disabled). */
  minimumQuantity?: QuantityMilli;
  /** Estimated cost per display unit, minor currency. Defaults to 0. */
  unitCostMinor?: MoneyMinor;
  /** Availability toggle (hide from POS without deleting). Defaults true. */
  isActive?: boolean;
}

export async function createInventoryItem(
  input: CreateInventoryItemInput,
): Promise<InventoryItem> {
  const businessId = await getBusinessId();
  return withTransaction((txn) => createInventoryItemWithTxn(txn, businessId, input));
}

export async function createInventoryItemWithTxn(
  txn: DatabaseAdapter,
  businessId: string,
  input: CreateInventoryItemInput,
): Promise<InventoryItem> {
  const id = newId();
  const timestamp = nowIso();

  try {
    // `current_quantity` is bound as the literal integer `0`: a new item has no
    // ledger movements yet, so its cache starts empty by definition. It is the
    // ONLY place this repository ever touches the cache.
    await txn.runAsync(
      `INSERT INTO inventory_item
         (id, business_id, name, description, image_uri, unit_id,
          current_quantity, minimum_quantity, unit_cost_minor, is_active,
          created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      businessId,
      input.name.trim(),
      input.description ?? null,
      input.imageUri ?? null,
      input.unitId,
      0,
      input.minimumQuantity ?? 0,
      input.unitCostMinor ?? 0,
      intBool(input.isActive ?? true),
      timestamp,
      timestamp,
    );
  } catch (error) {
    throw mapSqliteError(error);
  }

  const row = await txn.getFirstAsync<Record<string, unknown>>(
    `SELECT ${INVENTORY_ITEM_COLUMNS} FROM inventory_item
      WHERE id = ? AND business_id = ? LIMIT 1`,
    id,
    businessId,
  );
  if (!row) {
    throw repoError(REPO_ERROR.NOT_FOUND);
  }
  return toInventoryItem(mapInventoryItemRow(row));
}

export interface UpdateInventoryItemInput {
  name?: string;
  description?: string;
  imageUri?: string;
  unitId?: string;
  /** Low-stock warning threshold in milli-units. */
  minimumQuantity?: QuantityMilli;
  /** Estimated cost per display unit, minor currency. */
  unitCostMinor?: MoneyMinor;
  isActive?: boolean;
  // NOTE: there is intentionally NO `currentQuantity` field here — the cache is
  // owned by the movement ledger and must never be written through this API.
}

export async function updateInventoryItem(
  id: string,
  input: UpdateInventoryItemInput,
): Promise<InventoryItem> {
  const businessId = await getBusinessId();
  return withTransaction((txn) => updateInventoryItemWithTxn(txn, businessId, id, input));
}

async function updateInventoryItemWithTxn(
  txn: DatabaseAdapter,
  businessId: string,
  id: string,
  input: UpdateInventoryItemInput,
): Promise<InventoryItem> {
  // Only present (non-undefined) fields become SET assignments. The patch map
  // deliberately contains no `current_quantity` column, so this UPDATE can
  // never drift the ledger-maintained cache.
  const { assignments, params } = buildUpdateAssignments({
    name: input.name?.trim(),
    description: input.description,
    image_uri: input.imageUri,
    unit_id: input.unitId,
    minimum_quantity: input.minimumQuantity,
    unit_cost_minor: input.unitCostMinor,
    is_active: input.isActive === undefined ? undefined : intBool(input.isActive),
  });

  if (assignments.length > 0) {
    try {
      await txn.runAsync(
        `UPDATE inventory_item SET ${assignments.join(', ')}, updated_at = ?
          WHERE id = ? AND business_id = ?`,
        ...params,
        nowIso(),
        id,
        businessId,
      );
    } catch (error) {
      throw mapSqliteError(error);
    }
  }

  const row = await txn.getFirstAsync<Record<string, unknown>>(
    `SELECT ${INVENTORY_ITEM_COLUMNS} FROM inventory_item
      WHERE id = ? AND business_id = ? LIMIT 1`,
    id,
    businessId,
  );
  if (!row) {
    throw repoError(REPO_ERROR.NOT_FOUND);
  }
  return toInventoryItem(mapInventoryItemRow(row));
}

/** Soft-delete an inventory item. Throws `REPO_NOT_FOUND` when absent or already archived. */
export async function archiveInventoryItem(id: string): Promise<void> {
  const businessId = await getBusinessId();
  await withTransaction((txn) => archiveInventoryItemWithTxn(txn, businessId, id));
}

async function archiveInventoryItemWithTxn(
  txn: DatabaseAdapter,
  businessId: string,
  id: string,
): Promise<void> {
  // Existence guard (live rows only) so archiving a missing/archived item is a
  // loud NOT_FOUND rather than a silent 0-row update.
  const existing = await txn.getFirstAsync<{ id: string }>(
    `SELECT id FROM inventory_item WHERE id = ? AND business_id = ? AND ${archiveSoftWhere} LIMIT 1`,
    id,
    businessId,
  );
  if (!existing) {
    throw repoError(REPO_ERROR.NOT_FOUND);
  }

  const timestamp = nowIso();
  try {
    await txn.runAsync(
      `UPDATE inventory_item SET archived_at = ?, updated_at = ? WHERE id = ? AND business_id = ?`,
      timestamp,
      timestamp,
      id,
      businessId,
    );
  } catch (error) {
    throw mapSqliteError(error);
  }
}
