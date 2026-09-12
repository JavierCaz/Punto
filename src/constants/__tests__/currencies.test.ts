import {
  CURRENCY_CODES,
  DEFAULT_CURRENCY,
  isCurrencyCode,
  resolveDefaultCurrency,
} from '@/constants/currencies';

describe('currency vocabulary', () => {
  it('offers MXN and USD only (v1 curated list)', () => {
    expect(CURRENCY_CODES).toEqual(['MXN', 'USD']);
  });

  it('validates supported codes and rejects everything else', () => {
    expect(isCurrencyCode('MXN')).toBe(true);
    expect(isCurrencyCode('USD')).toBe(true);
    expect(isCurrencyCode('EUR')).toBe(false);
    expect(isCurrencyCode('mxn')).toBe(false);
    expect(isCurrencyCode(null)).toBe(false);
    expect(isCurrencyCode(undefined)).toBe(false);
    expect(isCurrencyCode(123)).toBe(false);
  });

  it('prefers a supported device currency and otherwise falls back to the default', () => {
    expect(resolveDefaultCurrency('USD')).toBe('USD');
    expect(resolveDefaultCurrency('MXN')).toBe('MXN');
    expect(resolveDefaultCurrency('EUR')).toBe(DEFAULT_CURRENCY);
    expect(resolveDefaultCurrency(undefined)).toBe(DEFAULT_CURRENCY);
    expect(resolveDefaultCurrency(null)).toBe(DEFAULT_CURRENCY);
  });
});
