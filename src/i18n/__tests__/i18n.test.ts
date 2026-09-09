/// <reference types="jest" />

/**
 * @jest-environment node
 */

import { i18n, resolveLanguage } from '@/i18n';
import en from '@/i18n/locales/en';
import es from '@/i18n/locales/es';

// expo-localization calls into native code; provide a deterministic stub.
// jest hoists this above the imports, so mock placement here is safe.
jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'es' }],
}));

type TranslationResource = Record<string, unknown>;

/** Flatten a nested resource into dotted keys → string leaf values. */
function flattenKeys(obj: TranslationResource, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object') {
      Object.assign(out, flattenKeys(value as TranslationResource, path));
    } else {
      out[path] = String(value);
    }
  }
  return out;
}

describe('translation resources', () => {
  it('es and en have identical key sets (parity)', () => {
    const esKeys = Object.keys(flattenKeys(es));
    const enKeys = Object.keys(flattenKeys(en));

    expect(enKeys).toEqual(esKeys);
  });

  it('every leaf value is a non-empty string', () => {
    for (const value of Object.values(flattenKeys(es))) {
      expect(value.trim().length).toBeGreaterThan(0);
    }
    for (const value of Object.values(flattenKeys(en))) {
      expect(value.trim().length).toBeGreaterThan(0);
    }
  });

  it('i18next resolves every key for both es and en', () => {
    const allKeys = Object.keys(flattenKeys(es));

    for (const key of allKeys) {
      for (const lng of ['es', 'en'] as const) {
        expect(i18n.exists(key, { lng })).toBe(true);
      }
    }
  });

  it('detects supported languages and falls back to Spanish', () => {
    expect(resolveLanguage('es-MX')).toBe('es');
    expect(resolveLanguage('en-US')).toBe('en');
    expect(resolveLanguage('fr-FR')).toBe('es');
    expect(resolveLanguage(undefined)).toBe('es');
  });
});
