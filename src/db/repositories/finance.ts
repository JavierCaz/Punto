import { getDb } from '@/db';

import { getBusinessId } from '@/db/repositories/business-scope';
import { nowIso } from '@/db/repositories/clock';
import type { DatabaseAdapter, SqlValue } from '@/db/repositories/database';
import { REPO_ERROR, mapSqliteError, repoError } from '@/db/repositories/errors';
import { newId } from '@/db/repositories/ids';
import { boolFromInt, int, intBool, str, strOrNull } from '@/db/repositories/mappers';
import { DEFAULT_PAGE_LIMIT, encodeCursor, keysetWhere } from '@/db/repositories/pagination';
import type { Page, PageQuery } from '@/db/repositories/pagination';
import { buildUpdateAssignments } from '@/db/repositories/sql';
import { withTransaction } from '@/db/repositories/transaction';
import { FINANCE_TYPES } from '@/db/repositories/types';
import type { FinanceType, ListOptions, MoneyMinor, TimestampIso } from '@/db/repositories/types';

/**
 * Finance repository (migration 001, tables `financial_category` and
 * `financial_transaction`).
 *
 * Finance is where non-sale money lives (AGENTS §3.1): manual expenses and
 * non-sale income are recorded as `financial_transaction` rows against a
 * `financial_category` (e.g. "Rent", "Supplies", "Other income"). Sales and
 * purchases are NOT recorded here — they have their own ledgers.
 *
 * `financial_category` is a small lookup table with NO `archived_at` column;
 * categories are hidden by flipping `is_active` (like `payment_method`). A
 * category carries an immutable `type` (`INCOME` | `EXPENSE`) and a read-only
 * `is_system` flag (seed-owned rows the UI must not edit).
 *
 * `financial_transaction` is an APPEND-ONLY history row (AGENTS §6): there is
 * deliberately no update/delete surface here. Direction (in vs. out) is implied
 * by the category type, so `amount_minor` is stored POSITIVE (never signed) —
 * the sign is recovered from the category at read time. History rows are never
 * soft-deleted, so `listFinancialTransactions` has no `archived_at` predicate.
 *
 * Conventions (see AGENTS §9.3 / database.ts): reads resolve `getDb()`, writes
 * run inside `withTransaction`, every query is scoped `business_id = ?`, and
 * ids/timestamps come from `newId()`/`nowIso()`.
 */

// ===========================================================================
// Financial categories
// ===========================================================================

/** Raw `financial_category` row — snake_case, exact columns, 0/1 flags as number. */
interface FinancialCategoryRow {
  id: string;
  business_id: string;
  name: string;
  type: FinanceType;
  is_system: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

/** Column list shared by every `financial_category` SELECT (matches the row). */
const FINANCIAL_CATEGORY_COLUMNS = `
  id, business_id, name, type, is_system, is_active, created_at, updated_at`;

/** Runtime guard for the `financial_category.type` CHECK values. */
function isFinanceType(value: unknown): value is FinanceType {
  return typeof value === 'string' && (FINANCE_TYPES as readonly string[]).includes(value);
}

/** Coerce an untyped SQLite row into the typed snake_case `FinancialCategoryRow`. */
function mapFinancialCategoryRow(row: Record<string, unknown>): FinancialCategoryRow {
  // `type` must satisfy the CHECK constraint; guard at the boundary so a bad
  // value fails loudly rather than widening the public type.
  const type = row.type;
  if (!isFinanceType(type)) {
    throw repoError(REPO_ERROR.INVALID_STATE, `unexpected financial category type in DB: ${String(type)}`);
  }
  return {
    id: str(row.id),
    business_id: str(row.business_id),
    name: str(row.name),
    type,
    is_system: int(row.is_system),
    is_active: int(row.is_active),
    created_at: str(row.created_at),
    updated_at: str(row.updated_at),
  };
}

/** Map a typed row to the public camelCase shape (0/1 flags → booleans). */
const toFinancialCategory = (row: FinancialCategoryRow) => ({
  id: row.id,
  businessId: row.business_id,
  name: row.name,
  type: row.type,
  isSystem: boolFromInt(row.is_system),
  isActive: boolFromInt(row.is_active),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

/** Public financial category type — derived from the private mapper. */
export type FinancialCategory = ReturnType<typeof toFinancialCategory>;

/** Fields accepted when creating a financial category. `name`/`type` required. */
export interface CreateFinancialCategoryInput {
  /** Display name. Required; trimmed. */
  name: string;
  /** Direction this category records (`INCOME` | `EXPENSE`). Immutable after create. */
  type: FinanceType;
  /** Availability toggle (hide from forms without deleting). Defaults true. */
  isActive?: boolean;
}

/** Patch fields for updating a category (name / availability only). */
export interface UpdateFinancialCategoryInput {
  name?: string;
  isActive?: boolean;
}

/**
 * List financial categories for the business, active by default, ordered
 * `name ASC`. Pass `includeInactive: true` to also return inactive categories;
 * `type` narrows to a single direction (`INCOME` / `EXPENSE`).
 */
export async function listFinancialCategories(
  opts: ListOptions & { includeInactive?: boolean; type?: FinanceType } = {},
): Promise<FinancialCategory[]> {
  const db = await getDb();
  const businessId = await getBusinessId();

  // Base scope + optional filters, each bound as a parameter (never inlined).
  const clauses: string[] = ['business_id = ?'];
  const params: SqlValue[] = [businessId];

  // Active-only by default; includeInactive drops the filter (no archive here).
  if (!opts.includeInactive) {
    clauses.push('is_active = 1');
  }
  if (opts.type !== undefined) {
    clauses.push('type = ?');
    params.push(opts.type);
  }

  let pagination = '';
  if (opts.limit != null) {
    pagination += ' LIMIT ?';
    params.push(opts.limit);
  }
  if (opts.offset != null) {
    pagination += opts.limit != null ? ' OFFSET ?' : ' LIMIT -1 OFFSET ?';
    params.push(opts.offset);
  }

  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT ${FINANCIAL_CATEGORY_COLUMNS}
       FROM financial_category
      WHERE ${clauses.join(' AND ')}
      ORDER BY name ASC${pagination}`,
    ...params,
  );
  return rows.map((row) => toFinancialCategory(mapFinancialCategoryRow(row)));
}

/** Fetch a single financial category by id, or `null` when missing. */
export async function getFinancialCategoryById(id: string): Promise<FinancialCategory | null> {
  const db = await getDb();
  const businessId = await getBusinessId();

  const row = await db.getFirstAsync<Record<string, unknown>>(
    `SELECT ${FINANCIAL_CATEGORY_COLUMNS}
       FROM financial_category
      WHERE id = ? AND business_id = ?
      LIMIT 1`,
    id,
    businessId,
  );
  return row ? toFinancialCategory(mapFinancialCategoryRow(row)) : null;
}

/** Create a financial category and return the freshly-read mapped row. */
export async function createFinancialCategory(
  input: CreateFinancialCategoryInput,
): Promise<FinancialCategory> {
  // Fail fast on an invalid type before touching the DB.
  if (!isFinanceType(input.type)) {
    throw repoError(REPO_ERROR.INVALID_STATE, `invalid financial category type: ${String(input.type)}`);
  }
  const businessId = await getBusinessId();
  return withTransaction((txn) => createFinancialCategoryWithTxn(txn, businessId, input));
}

/** Transactional create: INSERT (is_system always 0) then select-back. */
async function createFinancialCategoryWithTxn(
  txn: DatabaseAdapter,
  businessId: string,
  input: CreateFinancialCategoryInput,
): Promise<FinancialCategory> {
  const id = newId();
  const timestamp = nowIso();

  try {
    await txn.runAsync(
      `INSERT INTO financial_category
         (id, business_id, name, type, is_system, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      businessId,
      input.name.trim(),
      input.type,
      0, // is_system is read-only: caller-created categories are never system rows.
      intBool(input.isActive ?? true),
      timestamp,
      timestamp,
    );
  } catch (error) {
    throw mapSqliteError(error);
  }

  const row = await txn.getFirstAsync<Record<string, unknown>>(
    `SELECT ${FINANCIAL_CATEGORY_COLUMNS} FROM financial_category WHERE id = ? LIMIT 1`,
    id,
  );
  if (!row) {
    throw repoError(REPO_ERROR.NOT_FOUND, `financial category not found after insert: ${id}`);
  }
  return toFinancialCategory(mapFinancialCategoryRow(row));
}

/** Update a financial category (name / availability only) and return the fresh row. */
export async function updateFinancialCategory(
  id: string,
  input: UpdateFinancialCategoryInput,
): Promise<FinancialCategory> {
  const businessId = await getBusinessId();
  return withTransaction((txn) => updateFinancialCategoryWithTxn(txn, businessId, id, input));
}

/** Transactional update: verify existence, patch mutable fields, select-back. */
async function updateFinancialCategoryWithTxn(
  txn: DatabaseAdapter,
  businessId: string,
  id: string,
  input: UpdateFinancialCategoryInput,
): Promise<FinancialCategory> {
  // Existence check first so a missing id throws NOT_FOUND (not a silent no-op).
  // It also guards `is_system`: seed-owned rows must never be edited.
  const existing = await txn.getFirstAsync<{ id: string; is_system: number }>(
    `SELECT id, is_system FROM financial_category WHERE id = ? AND business_id = ? LIMIT 1`,
    id,
    businessId,
  );
  if (!existing) {
    throw repoError(REPO_ERROR.NOT_FOUND, `financial category not found: ${id}`);
  }
  if (existing.is_system === 1) {
    throw repoError(
      REPO_ERROR.INVALID_STATE,
      `system financial category cannot be modified: ${id}`,
    );
  }

  // `type` and `is_system` are immutable: direction is semantic (flipping it
  // would silently re-sign existing transactions) and is_system is seed-owned.
  const { assignments, params } = buildUpdateAssignments({
    name: input.name?.trim(),
    is_active: input.isActive === undefined ? undefined : intBool(input.isActive),
  });

  // Always bump updated_at (a bare timestamp bump is a valid no-op update).
  assignments.push('updated_at = ?');
  params.push(nowIso());

  try {
    await txn.runAsync(
      `UPDATE financial_category SET ${assignments.join(', ')} WHERE id = ? AND business_id = ?`,
      ...params,
      id,
      businessId,
    );
  } catch (error) {
    throw mapSqliteError(error);
  }

  const row = await txn.getFirstAsync<Record<string, unknown>>(
    `SELECT ${FINANCIAL_CATEGORY_COLUMNS} FROM financial_category WHERE id = ? LIMIT 1`,
    id,
  );
  if (!row) {
    throw repoError(REPO_ERROR.NOT_FOUND, `financial category not found after update: ${id}`);
  }
  return toFinancialCategory(mapFinancialCategoryRow(row));
}

// ===========================================================================
// Financial transactions (append-only history)
// ===========================================================================

/** Raw `financial_transaction` row — snake_case, exact columns. No 0/1 flags. */
interface FinancialTransactionRow {
  id: string;
  business_id: string;
  category_id: string;
  amount_minor: number;
  payment_method_id: string | null;
  supplier_id: string | null;
  employee_id: string | null;
  description: string | null;
  reference_type: string | null;
  reference_id: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Column list shared by every `financial_transaction` SELECT. Alias-prefixed
 * (`ft.`) because `listFinancialTransactions` optionally joins
 * `financial_category` (aliased `c`), which shares `id`/`business_id`/
 * `created_at`/`updated_at` column names — qualification keeps every reference
 * unambiguous.
 */
const TRANSACTION_COLUMNS = `
  ft.id, ft.business_id, ft.category_id, ft.amount_minor, ft.payment_method_id,
  ft.supplier_id, ft.employee_id, ft.description, ft.reference_type,
  ft.reference_id, ft.created_at, ft.updated_at`;

/** Coerce an untyped SQLite row into the typed snake_case `FinancialTransactionRow`. */
function mapFinancialTransactionRow(row: Record<string, unknown>): FinancialTransactionRow {
  return {
    id: str(row.id),
    business_id: str(row.business_id),
    category_id: str(row.category_id),
    amount_minor: int(row.amount_minor),
    payment_method_id: strOrNull(row.payment_method_id),
    supplier_id: strOrNull(row.supplier_id),
    employee_id: strOrNull(row.employee_id),
    description: strOrNull(row.description),
    reference_type: strOrNull(row.reference_type),
    reference_id: strOrNull(row.reference_id),
    created_at: str(row.created_at),
    updated_at: str(row.updated_at),
  };
}

/** Map a typed row to the public camelCase shape (the single mapping surface). */
const toFinancialTransaction = (row: FinancialTransactionRow) => ({
  id: row.id,
  businessId: row.business_id,
  categoryId: row.category_id,
  amountMinor: row.amount_minor,
  paymentMethodId: row.payment_method_id,
  supplierId: row.supplier_id,
  employeeId: row.employee_id,
  description: row.description,
  referenceType: row.reference_type,
  referenceId: row.reference_id,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

/** Public financial transaction type — derived from the private mapper. */
export type FinancialTransaction = ReturnType<typeof toFinancialTransaction>;

/** Fields accepted when recording a financial transaction. */
export interface CreateFinancialTransactionInput {
  /** The category (and thus the direction) this transaction belongs to. */
  categoryId: string;
  /** POSITIVE minor currency units — never signed; direction comes from the category. */
  amountMinor: MoneyMinor;
  paymentMethodId?: string;
  supplierId?: string;
  employeeId?: string;
  description?: string;
  referenceType?: string;
  referenceId?: string;
}

/** Filters for listing transaction history (keyset-paginated, newest-first). */
export interface FinancialTransactionFilter extends PageQuery {
  categoryId?: string;
  type?: FinanceType;
  from?: TimestampIso;
  to?: TimestampIso;
}

/**
 * Record a financial transaction (append-only) and return the freshly-read row.
 *
 * Invariants enforced here:
 * - `amountMinor > 0` (else `REPO_INVALID_STATE`, before any DB work).
 * - the category must exist AND be active (else `REPO_NOT_FOUND`).
 * - direction is implied by the category type, so the amount is stored positive.
 */
export async function createFinancialTransaction(
  input: CreateFinancialTransactionInput,
): Promise<FinancialTransaction> {
  // Fail fast on a non-positive amount before touching the DB.
  if (input.amountMinor <= 0) {
    throw repoError(REPO_ERROR.INVALID_STATE, 'transaction amountMinor must be > 0');
  }
  const businessId = await getBusinessId();
  return withTransaction((txn) => createFinancialTransactionWithTxn(txn, businessId, input));
}

/** Transactional create: verify an active category, INSERT, select-back. */
async function createFinancialTransactionWithTxn(
  txn: DatabaseAdapter,
  businessId: string,
  input: CreateFinancialTransactionInput,
): Promise<FinancialTransaction> {
  // The category must exist AND be active — an inactive category can't receive
  // a transaction (and a missing one is a loud NOT_FOUND, not an FK error).
  const category = await txn.getFirstAsync<{ id: string }>(
    `SELECT id FROM financial_category
      WHERE id = ? AND business_id = ? AND is_active = 1
      LIMIT 1`,
    input.categoryId,
    businessId,
  );
  if (!category) {
    throw repoError(REPO_ERROR.NOT_FOUND, `financial category not found or inactive: ${input.categoryId}`);
  }

  const id = newId();
  const timestamp = nowIso();

  try {
    await txn.runAsync(
      `INSERT INTO financial_transaction
         (id, business_id, category_id, amount_minor, payment_method_id,
          supplier_id, employee_id, description, reference_type, reference_id,
          created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id,
      businessId,
      input.categoryId,
      input.amountMinor, // positive — direction is implied by the category type.
      input.paymentMethodId ?? null,
      input.supplierId ?? null,
      input.employeeId ?? null,
      input.description ?? null,
      input.referenceType ?? null,
      input.referenceId ?? null,
      timestamp,
      timestamp,
    );
  } catch (error) {
    throw mapSqliteError(error);
  }

  const row = await txn.getFirstAsync<Record<string, unknown>>(
    `SELECT ${TRANSACTION_COLUMNS} FROM financial_transaction ft WHERE ft.id = ? LIMIT 1`,
    id,
  );
  if (!row) {
    throw repoError(REPO_ERROR.NOT_FOUND, `financial transaction not found after insert: ${id}`);
  }
  return toFinancialTransaction(mapFinancialTransactionRow(row));
}

/** Fetch a single financial transaction by id, or `null` when missing. */
export async function getFinancialTransactionById(
  id: string,
): Promise<FinancialTransaction | null> {
  const db = await getDb();
  const businessId = await getBusinessId();

  const row = await db.getFirstAsync<Record<string, unknown>>(
    `SELECT ${TRANSACTION_COLUMNS}
       FROM financial_transaction ft
      WHERE ft.id = ? AND ft.business_id = ?
      LIMIT 1`,
    id,
    businessId,
  );
  return row ? toFinancialTransaction(mapFinancialTransactionRow(row)) : null;
}

/**
 * List financial transactions for the business, newest-first
 * (`created_at DESC, id DESC`), keyset-paginated. History rows are append-only,
 * so there is deliberately NO `archived_at` predicate.
 *
 * Optional filters: `categoryId` (`ft.category_id = ?`), `type` (requires a JOIN
 * on `financial_category` filtered by `c.type = ?`), and `from`/`to` on
 * `ft.created_at`. `nextCursor` is encoded from the last row of a full page.
 */
export async function listFinancialTransactions(
  filter: FinancialTransactionFilter = {},
): Promise<Page<FinancialTransaction>> {
  const db = await getDb();
  const businessId = await getBusinessId();

  // Base scope + optional filters, each bound as a parameter (never inlined).
  const clauses: string[] = ['ft.business_id = ?'];
  const params: SqlValue[] = [businessId];

  if (filter.categoryId !== undefined) {
    clauses.push('ft.category_id = ?');
    params.push(filter.categoryId);
  }

  // `type` reads the category, so it requires a JOIN on financial_category.
  let fromClause = 'FROM financial_transaction ft';
  if (filter.type !== undefined) {
    fromClause += ' JOIN financial_category c ON c.id = ft.category_id';
    clauses.push('c.type = ?');
    params.push(filter.type);
  }

  if (filter.from !== undefined) {
    clauses.push('ft.created_at >= ?');
    params.push(filter.from);
  }
  if (filter.to !== undefined) {
    clauses.push('ft.created_at <= ?');
    params.push(filter.to);
  }

  // Keyset page. `keysetWhere` qualifies the tuple to `ft.*` so the optional
  // category JOIN (which shares `created_at`/`id`) stays unambiguous.
  const { clause: keysetClause, params: keysetParams } = keysetWhere(filter.cursor, 'ft.');
  const limit = filter.limit ?? DEFAULT_PAGE_LIMIT;

  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT ${TRANSACTION_COLUMNS}
       ${fromClause}
      WHERE ${clauses.join(' AND ')}${keysetClause ? ` ${keysetClause}` : ''}
      ORDER BY ft.created_at DESC, ft.id DESC
      LIMIT ?`,
    ...params,
    ...keysetParams,
    limit,
  );

  const items = rows.map((row) => toFinancialTransaction(mapFinancialTransactionRow(row)));

  // A full page (rows.length === limit) implies more may follow; encode the
  // last row's keyset position as the next cursor. Otherwise there is no page 2.
  const last = items[items.length - 1];
  const nextCursor =
    rows.length === limit && last ? encodeCursor(last.createdAt, last.id) : null;

  return { items, nextCursor };
}
