/**
 * Locale-aware formatting helpers.
 *
 * Money is stored as INTEGER minor units (cents) everywhere in the database
 * (AGENTS.md §6). These helpers are the ONLY place money becomes a formatted
 * string — always feed them integer minor values, never floats.
 *
 * Quantities are stored as INTEGER × 1000 milli-units of the item's unit
 * (0.5 g = 500). Display always converts through formatQuantity().
 */

import type { SupportedLanguage } from '@/i18n';
import { dayjs } from '@/lib/dayjs';

/**
 * Active formatting locale, kept in sync with i18n.language by @/i18n.
 * Local module state avoids a circular import between format helpers and the
 * i18n bootstrap.
 */
let activeLocale: SupportedLanguage = 'es';

/** Called by the i18n bootstrap whenever the UI language changes. */
export function setFormatLocale(language: SupportedLanguage): void {
  activeLocale = language;
}

function resolveLocale(locale?: string): string {
  return locale ?? activeLocale;
}

function buildNumberFormat(
  locale: string,
  options: Intl.NumberFormatOptions,
): Intl.NumberFormat {
  try {
    return new Intl.NumberFormat(locale, options);
  } catch {
    return new Intl.NumberFormat('en-US', options);
  }
}

/**
 * Format an integer minor (cents) amount with the given currency.
 * `minorUnits` defaults to 2 (USD/MXN style cent precision).
 * `trimZeroFraction` drops the decimals on whole amounts ("$1,230" instead of
 * "$1,230.00") — used for compact chart labels; cents are kept otherwise.
 */
export function formatMoney(
  minor: number,
  currency: string,
  opts: { minorUnits?: number; locale?: string; trimZeroFraction?: boolean } = {},
): string {
  const minorUnits = opts.minorUnits ?? 2;
  const locale = resolveLocale(opts.locale);

  // Split minor into major + fraction with integer math so the value handed
  // to Intl has exact significant digits (no float drift from division).
  const scale = 10 ** minorUnits;
  const major = Math.trunc(minor / scale);
  const fraction = Math.abs(minor % scale);
  const value = major + fraction / scale;

  const digits = opts.trimZeroFraction === true && fraction === 0 ? 0 : minorUnits;
  const formatter = buildNumberFormat(locale, {
    style: 'currency',
    currency,
    currencyDisplay: 'symbol',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

  return formatter.format(value);
}

/**
 * Format an integer milli-unit quantity for display (1 unit = 1000 milli).
 * `maxDecimals` clamps trailing digits (0 for count-type units like pieces).
 */
export function formatQuantity(
  milliQuantity: number,
  opts: { maxDecimals?: number; locale?: string } = {},
): string {
  const maxDecimals = opts.maxDecimals ?? 3;
  const locale = resolveLocale(opts.locale);
  const formatter = buildNumberFormat(locale, {
    maximumFractionDigits: maxDecimals,
  });

  if (maxDecimals === 0) {
    return formatter.format(Math.round(milliQuantity / 1000));
  }

  // Integer round to the requested number of decimals.
  const factor = 10 ** maxDecimals;
  const scaled = Math.round((milliQuantity * factor) / 1000);
  return formatter.format(scaled / factor);
}

/** Format an ISO-8601 UTC timestamp as a localized date (e.g. 8 sep 2026). */
export function formatDate(iso: string, opts: { locale?: string } = {}): string {
  const locale = resolveLocale(opts.locale);
  const format = locale === 'es' ? 'D MMM YYYY' : 'MMM D, YYYY';
  return dayjs(iso).locale(locale).format(format);
}

/** Format an ISO-8601 UTC timestamp as a localized time (e.g. 14:05). */
export function formatTime(iso: string, opts: { locale?: string } = {}): string {
  const locale = resolveLocale(opts.locale);
  const format = locale === 'es' ? 'HH:mm' : 'h:mm A';
  return dayjs(iso).locale(locale).format(format);
}

/** Format an ISO-8601 UTC timestamp as a localized date + time. */
export function formatDateTime(iso: string, opts: { locale?: string } = {}): string {
  const locale = opts.locale ?? activeLocale;
  return `${formatDate(iso, { locale })} · ${formatTime(iso, { locale })}`;
}
