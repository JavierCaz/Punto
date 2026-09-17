/// <reference types="jest" />

/**
 * @jest-environment node
 */

import { formatDate, formatDateTime, formatMoney, formatQuantity, formatTime } from '@/i18n/format';
import { dayjs } from '@/lib/dayjs';

describe('formatMoney', () => {
  it('formats integer minor units as currency (es locale)', () => {
    expect(formatMoney(0, 'MXN', { locale: 'es-MX' })).toBe('$0.00');
    expect(formatMoney(123456, 'MXN', { locale: 'es-MX' })).toBe('$1,234.56');
    expect(formatMoney(-500, 'MXN', { locale: 'es-MX' })).toBe('-$5.00');
  });

  it('honors explicit minorUnits (e.g. 0-decimal currencies)', () => {
    expect(formatMoney(1234, 'JPY', { minorUnits: 0, locale: 'en-US' })).toBe('¥1,234');
  });

  it('never requires a float input and stays exact on cents', () => {
    // 99999999 cents → $999,999.99 exactly.
    expect(formatMoney(99999999, 'USD', { locale: 'en-US' })).toBe('$999,999.99');
  });

  it('trims zero cents on whole amounts for compact labels', () => {
    expect(formatMoney(123000, 'MXN', { trimZeroFraction: true, locale: 'es-MX' })).toBe(
      '$1,230',
    );
    expect(formatMoney(123050, 'MXN', { trimZeroFraction: true, locale: 'es-MX' })).toBe(
      '$1,230.50',
    );
    // Unchanged when the option is off.
    expect(formatMoney(123000, 'MXN', { locale: 'es-MX' })).toBe('$1,230.00');
  });
});

describe('formatQuantity', () => {
  it('converts milli-units to display units', () => {
    // 150 g stored as 150000 milli.
    expect(formatQuantity(150000, { maxDecimals: 1, locale: 'en-US' })).toBe('150');
    // 0.5 stored as 500.
    expect(formatQuantity(500, { maxDecimals: 2, locale: 'en-US' })).toBe('0.5');
  });

  it('rounds to integer for count units', () => {
    expect(formatQuantity(3000, { maxDecimals: 0, locale: 'en-US' })).toBe('3');
    expect(formatQuantity(3500, { maxDecimals: 0, locale: 'en-US' })).toBe('4');
  });

  it('supports es thousands separators', () => {
    expect(formatQuantity(1500000, { maxDecimals: 0, locale: 'es-MX' })).toBe('1,500');
  });
});

describe('date/time formatting', () => {
  const iso = '2026-09-08T14:05:00.000Z';

  it('formats dates in es and en (device-local timezone)', () => {
    const expectedEs = dayjs(iso).locale('es').format('D MMM YYYY');
    const expectedEn = dayjs(iso).locale('en').format('MMM D, YYYY');

    expect(formatDate(iso, { locale: 'es' })).toBe(expectedEs);
    expect(formatDate(iso, { locale: 'en' })).toBe(expectedEn);
    // Month abbreviation differs between languages for the same date.
    expect(formatDate(iso, { locale: 'es' })).toContain('sep');
    expect(formatDate(iso, { locale: 'en' })).toContain('Sep');
  });

  it('formats times with 24h in es and 12h in en', () => {
    const expectedEs = dayjs(iso).locale('es').format('HH:mm');
    const expectedEn = dayjs(iso).locale('en').format('h:mm A');

    expect(formatTime(iso, { locale: 'es' })).toBe(expectedEs);
    expect(formatTime(iso, { locale: 'en' })).toBe(expectedEn);
  });

  it('formats combined date + time', () => {
    expect(formatDateTime(iso, { locale: 'es' })).toContain('·');
  });
});
