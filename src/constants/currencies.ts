/**
 * Currency vocabulary for the business profile.
 *
 * Punto is Spanish-first and targets LATAM + US small businesses, so v1 offers
 * a deliberately short, curated list (MXN / USD) instead of free-text ISO codes
 * — fast to pick and impossible to mistype (AGENTS §5.1, §6).
 *
 * NOTE: this is a PRODUCT/UI choice, not a schema constraint. The `business`
 * table's `currency_code` column is plain `TEXT`, so widening the list later is
 * a pure UI change (add a code + its `currencies.<CODE>` i18n label).
 */

export const CURRENCY_CODES = ['MXN', 'USD'] as const;

export type CurrencyCode = (typeof CURRENCY_CODES)[number];

/** Fallback when the device currency is outside the supported list. */
export const DEFAULT_CURRENCY: CurrencyCode = 'MXN';

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return typeof value === 'string' && (CURRENCY_CODES as readonly string[]).includes(value);
}

/**
 * Pick the initial currency: the device currency when it is supported,
 * otherwise the Spanish-first default (MXN).
 */
export function resolveDefaultCurrency(deviceCurrency: string | null | undefined): CurrencyCode {
  return isCurrencyCode(deviceCurrency) ? deviceCurrency : DEFAULT_CURRENCY;
}
