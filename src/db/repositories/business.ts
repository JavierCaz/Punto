import { getDb } from '@/db';

import { nowIso } from '@/db/repositories/clock';
import type { DatabaseAdapter } from '@/db/repositories/database';
import { REPO_ERROR, mapSqliteError, repoError } from '@/db/repositories/errors';
import { boolFromInt, int, intBool, str, strOrNull } from '@/db/repositories/mappers';
import { buildUpdateAssignments } from '@/db/repositories/sql';
import { withTransaction } from '@/db/repositories/transaction';

/**
 * Business profile entity repository (migration 001, table `business`).
 *
 * Punto's database holds exactly ONE business row (AGENTS §3.3); this table IS
 * the root entity, so there is no `business_id` scoping and no `archived_at`
 * column. It is only read (`getBusinessProfile`) and partially updated
 * (`updateBusinessProfile`) — creation happens during first-run onboarding
 * (see src/auth/auth-repository.ts `onboardBusiness`).
 *
 * Two CHECK-constrained presentation columns are validated at the DB boundary:
 *   - `locale`       ∈ { 'es', 'en' }
 *   - `accent_color` ∈ { 'royal', 'emerald', 'indigo', 'amber', 'slate', 'rose' }
 * An unexpected value throws `REPO_INVALID_STATE` (mirroring `isAuthRole`
 * handling in auth-repository) rather than silently corrupting the UI, which
 * would break every money/date formatter and the brand accent.
 */

// ---------------------------------------------------------------------------
// Locale / accent vocabulary (the exact strings of the migration 001 CHECK
// constraints). Defined here — not in types.ts — because they are only
// meaningful to the business profile.
// ---------------------------------------------------------------------------
export const LOCALE_CODES = ['es', 'en'] as const;
export type LocaleCode = (typeof LOCALE_CODES)[number];

export const ACCENT_COLORS = ['royal', 'emerald', 'indigo', 'amber', 'slate', 'rose'] as const;
export type AccentColor = (typeof ACCENT_COLORS)[number];

export function isLocaleCode(value: unknown): value is LocaleCode {
  return typeof value === 'string' && (LOCALE_CODES as readonly string[]).includes(value);
}

export function isAccentColor(value: unknown): value is AccentColor {
  return typeof value === 'string' && (ACCENT_COLORS as readonly string[]).includes(value);
}

// ---------------------------------------------------------------------------
// Row shape (snake_case — the exact `business` columns from migration 001).
// INTEGER 0/1 flags stay `number` here and become booleans in
// `toBusinessProfile`; the CHECK-constrained enums are validated (and narrowed)
// in `mapBusinessRow`.
// ---------------------------------------------------------------------------
interface BusinessRow {
  id: string;
  name: string;
  legal_name: string | null;
  description: string | null;
  logo_uri: string | null;
  phone: string | null;
  email: string | null;
  address_line1: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country_code: string | null;
  currency_code: string;
  locale: LocaleCode;
  accent_color: AccentColor;
  tax_enabled: number;
  default_tax_rate_bp: number;
  inventory_enabled: number;
  allow_negative_inventory: number;
  low_stock_alerts_enabled: number;
  receipt_enabled: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

// Coerce a raw SQLite row into the typed snake_case row, validating the two
// CHECK-constrained enums (an unexpected value is a corrupt-state error, not a
// silent fallback).
function mapBusinessRow(row: Record<string, unknown>): BusinessRow {
  const locale = row.locale;
  if (!isLocaleCode(locale)) {
    throw repoError(REPO_ERROR.INVALID_STATE, `unexpected locale in business row: ${String(locale)}`);
  }
  const accentColor = row.accent_color;
  if (!isAccentColor(accentColor)) {
    throw repoError(
      REPO_ERROR.INVALID_STATE,
      `unexpected accent_color in business row: ${String(accentColor)}`,
    );
  }

  return {
    id: str(row.id),
    name: str(row.name),
    legal_name: strOrNull(row.legal_name),
    description: strOrNull(row.description),
    logo_uri: strOrNull(row.logo_uri),
    phone: strOrNull(row.phone),
    email: strOrNull(row.email),
    address_line1: strOrNull(row.address_line1),
    city: strOrNull(row.city),
    state: strOrNull(row.state),
    postal_code: strOrNull(row.postal_code),
    country_code: strOrNull(row.country_code),
    currency_code: str(row.currency_code),
    locale,
    accent_color: accentColor,
    tax_enabled: int(row.tax_enabled),
    default_tax_rate_bp: int(row.default_tax_rate_bp),
    inventory_enabled: int(row.inventory_enabled),
    allow_negative_inventory: int(row.allow_negative_inventory),
    low_stock_alerts_enabled: int(row.low_stock_alerts_enabled),
    receipt_enabled: int(row.receipt_enabled),
    is_active: int(row.is_active),
    created_at: str(row.created_at),
    updated_at: str(row.updated_at),
  };
}

// snake_case row → camelCase public object. The single mapping surface so every
// read (profile fetch + update select-back) returns the identical shape.
const toBusinessProfile = (row: BusinessRow) => ({
  id: row.id,
  name: row.name,
  legalName: row.legal_name,
  description: row.description,
  logoUri: row.logo_uri,
  phone: row.phone,
  email: row.email,
  addressLine1: row.address_line1,
  city: row.city,
  state: row.state,
  postalCode: row.postal_code,
  countryCode: row.country_code,
  currencyCode: row.currency_code,
  locale: row.locale,
  accentColor: row.accent_color,
  taxEnabled: boolFromInt(row.tax_enabled),
  defaultTaxRateBp: row.default_tax_rate_bp,
  inventoryEnabled: boolFromInt(row.inventory_enabled),
  allowNegativeInventory: boolFromInt(row.allow_negative_inventory),
  lowStockAlertsEnabled: boolFromInt(row.low_stock_alerts_enabled),
  receiptEnabled: boolFromInt(row.receipt_enabled),
  isActive: boolFromInt(row.is_active),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export type BusinessProfile = ReturnType<typeof toBusinessProfile>;

const BUSINESS_COLUMNS = `
  id, name, legal_name, description, logo_uri,
  phone, email, address_line1, city, state, postal_code, country_code,
  currency_code, locale, accent_color,
  tax_enabled, default_tax_rate_bp, inventory_enabled, allow_negative_inventory,
  low_stock_alerts_enabled, receipt_enabled, is_active,
  created_at, updated_at`;

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/** Fetch the single business profile, or `null` before onboarding completes. */
export async function getBusinessProfile(): Promise<BusinessProfile | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Record<string, unknown>>(
    `SELECT ${BUSINESS_COLUMNS} FROM business LIMIT 1`,
  );
  return row ? toBusinessProfile(mapBusinessRow(row)) : null;
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export interface BusinessProfilePatch {
  /** Display name (required column — present only when changing it). */
  name?: string;
  legalName?: string | null;
  description?: string | null;
  logoUri?: string | null;
  phone?: string | null;
  email?: string | null;
  addressLine1?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  countryCode?: string | null;
  /** ISO-4217 code, e.g. 'USD' / 'MXN'. */
  currencyCode?: string;
  locale?: LocaleCode;
  accentColor?: AccentColor;
  taxEnabled?: boolean;
  /** Default tax rate in integer basis points (1600 = 16.00%). */
  defaultTaxRateBp?: number;
  inventoryEnabled?: boolean;
  allowNegativeInventory?: boolean;
  lowStockAlertsEnabled?: boolean;
  receiptEnabled?: boolean;
  isActive?: boolean;
}

export async function updateBusinessProfile(patch: BusinessProfilePatch): Promise<BusinessProfile> {
  return withTransaction((txn) => updateBusinessProfileWithTxn(txn, patch));
}

async function updateBusinessProfileWithTxn(
  txn: DatabaseAdapter,
  patch: BusinessProfilePatch,
): Promise<BusinessProfile> {
  // Mirror the read mapper's CHECK validation on the two presentation enums
  // BEFORE building assignments, so a bad value is a loud domain error (not a
  // raw SQLITE_CONSTRAINT mislabeled as a duplicate, nor a corrupt UI state).
  if (patch.locale !== undefined && !isLocaleCode(patch.locale)) {
    throw repoError(REPO_ERROR.INVALID_STATE, `invalid locale: ${String(patch.locale)}`);
  }
  if (patch.accentColor !== undefined && !isAccentColor(patch.accentColor)) {
    throw repoError(REPO_ERROR.INVALID_STATE, `invalid accentColor: ${String(patch.accentColor)}`);
  }

  // Only present (non-undefined) fields become SET assignments. Nullable text
  // fields distinguish "absent" (undefined → skip) from "clear" (null → bind
  // NULL); booleans collapse to INTEGER 0/1 via `intBool`.
  const { assignments, params } = buildUpdateAssignments({
    name: patch.name?.trim(),
    legal_name: patch.legalName == null ? patch.legalName : patch.legalName.trim(),
    description: patch.description == null ? patch.description : patch.description.trim(),
    logo_uri: patch.logoUri == null ? patch.logoUri : patch.logoUri.trim(),
    phone: patch.phone == null ? patch.phone : patch.phone.trim(),
    email: patch.email == null ? patch.email : patch.email.trim(),
    address_line1: patch.addressLine1 == null ? patch.addressLine1 : patch.addressLine1.trim(),
    city: patch.city == null ? patch.city : patch.city.trim(),
    state: patch.state == null ? patch.state : patch.state.trim(),
    postal_code: patch.postalCode == null ? patch.postalCode : patch.postalCode.trim(),
    country_code: patch.countryCode == null ? patch.countryCode : patch.countryCode.trim(),
    currency_code: patch.currencyCode,
    locale: patch.locale,
    accent_color: patch.accentColor,
    tax_enabled: patch.taxEnabled === undefined ? undefined : intBool(patch.taxEnabled),
    default_tax_rate_bp: patch.defaultTaxRateBp,
    inventory_enabled:
      patch.inventoryEnabled === undefined ? undefined : intBool(patch.inventoryEnabled),
    allow_negative_inventory:
      patch.allowNegativeInventory === undefined ? undefined : intBool(patch.allowNegativeInventory),
    low_stock_alerts_enabled:
      patch.lowStockAlertsEnabled === undefined ? undefined : intBool(patch.lowStockAlertsEnabled),
    receipt_enabled: patch.receiptEnabled === undefined ? undefined : intBool(patch.receiptEnabled),
    is_active: patch.isActive === undefined ? undefined : intBool(patch.isActive),
  });

  if (assignments.length > 0) {
    try {
      // Single-row table: the WHERE-less UPDATE targets the one row (or none).
      await txn.runAsync(
        `UPDATE business SET ${assignments.join(', ')}, updated_at = ?`,
        ...params,
        nowIso(),
      );
    } catch (error) {
      throw mapSqliteError(error);
    }
  }

  // Select-back inside the transaction so the caller receives the canonical
  // freshly-mapped row; a missing row is a loud NOT_FOUND (no business yet).
  const row = await txn.getFirstAsync<Record<string, unknown>>(
    `SELECT ${BUSINESS_COLUMNS} FROM business LIMIT 1`,
  );
  if (!row) {
    throw repoError(REPO_ERROR.NOT_FOUND);
  }
  return toBusinessProfile(mapBusinessRow(row));
}
