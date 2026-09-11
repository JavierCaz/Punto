/**
 * Shared domain vocabulary for the data-access layer.
 *
 * Every entity repository shares these scalars and status unions so that column
 * names, CHECK constraints (migrations 001/002), and TypeScript types stay in
 * lockstep. Status unions are derived from `as const` arrays (mirroring
 * `src/auth/types.ts`) and validated with `is*` guards at the DB boundary.
 *
 * The values below are the exact strings enforced by the schema CHECK
 * constraints — do not reorder or rename without a migration.
 */

// ---------------------------------------------------------------------------
// Branded scalars (documented aliases, NOT opaque brands)
//
// Rationale: intersection brands (`number & { __brand: ... }`) buy compile-time
// unit safety but are NOT assignable from plain `number`, which forces a cast at
// every SQLite row boundary (rows surface as `number`/`string`) and adds
// ceremony with no runtime benefit. Money/quantity math is already isolated in
// calc.ts and covered by tests, so we use plain aliases that document intent at
// the type level while remaining assignable everywhere.
// ---------------------------------------------------------------------------

/** INTEGER minor currency units (cents). Never a float. */
export type MoneyMinor = number;

/** INTEGER × 1000 milli-units of the row's unit (0.5 g = 500). Never a float. */
export type QuantityMilli = number;

/** ISO-8601 UTC `TEXT` timestamp (sortable lexicographically). */
export type TimestampIso = string;

/** Integer basis points for a tax rate (1600 = 16.00%). */
export type TaxBasisPoints = number;

// ---------------------------------------------------------------------------
// Status unions + guards
// ---------------------------------------------------------------------------

/** Sale lifecycle statuses (sale.status CHECK constraint). */
export const SALE_STATUSES = ['HELD', 'COMPLETED', 'CANCELLED', 'REFUNDED'] as const;
export type SaleStatus = (typeof SALE_STATUSES)[number];

export function isSaleStatus(value: unknown): value is SaleStatus {
  return typeof value === 'string' && (SALE_STATUSES as readonly string[]).includes(value);
}

/** Inventory ledger movement types (inventory_movement.type CHECK constraint). */
export const MOVEMENT_TYPES = [
  'INITIAL_STOCK',
  'PURCHASE',
  'SALE',
  'WASTE',
  'ADJUSTMENT',
  'RETURN',
] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];

export function isMovementType(value: unknown): value is MovementType {
  return typeof value === 'string' && (MOVEMENT_TYPES as readonly string[]).includes(value);
}

/** Payment method types (payment_method.type CHECK constraint). */
export const PAYMENT_TYPES = ['CASH', 'CARD', 'TRANSFER', 'OTHER'] as const;
export type PaymentType = (typeof PAYMENT_TYPES)[number];

/** Purchase statuses (purchase.status CHECK constraint). */
export const PURCHASE_STATUSES = ['COMPLETED', 'CANCELLED'] as const;
export type PurchaseStatus = (typeof PURCHASE_STATUSES)[number];

/** Unit-of-measure types (unit.type CHECK constraint). */
export const UNIT_TYPES = ['weight', 'volume', 'count'] as const;
export type UnitType = (typeof UNIT_TYPES)[number];

/** Financial category types (financial_category.type CHECK constraint). */
export const FINANCE_TYPES = ['INCOME', 'EXPENSE'] as const;
export type FinanceType = (typeof FINANCE_TYPES)[number];


// ---------------------------------------------------------------------------
// Shared query shapes
// ---------------------------------------------------------------------------

/**
 * Common options for non-paginated catalog lists (categories, products, …).
 * Ledger/history tables use keyset pagination instead (see pagination.ts).
 */
export interface ListOptions {
  /** Include soft-deleted (archived) rows. Defaults to false. */
  includeArchived?: boolean;
  /** Optional max rows (catalog tables are small). */
  limit?: number;
  /** Optional offset. */
  offset?: number;
}