/**
 * @jest-environment node
 *
 * Language-store tests: guard + hydration + persistence against an
 * in-memory mock of 'expo-sqlite/kv-store' (mirrors theme-store tests).
 */

import {
  LANGUAGE_STORAGE_KEY,
  isSupportedLanguage,
  useLanguageStore,
} from '@/i18n/language-store';

const mockMemory = new Map<string, string>();

jest.mock('expo-sqlite/kv-store', () => ({
  __esModule: true,
  default: {
    getItemAsync: jest.fn(async (key: string) => mockMemory.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      mockMemory.set(key, value);
    }),
  },
}));

beforeEach(() => {
  mockMemory.clear();
  useLanguageStore.setState({ language: 'es', hasPersisted: false, hasHydrated: false });
});

describe('isSupportedLanguage', () => {
  it('accepts only es and en', () => {
    expect(isSupportedLanguage('es')).toBe(true);
    expect(isSupportedLanguage('en')).toBe(true);
    expect(isSupportedLanguage('fr')).toBe(false);
    expect(isSupportedLanguage(null)).toBe(false);
    expect(isSupportedLanguage(undefined)).toBe(false);
  });
});

describe('language store', () => {
  it('hydrates a persisted language (en) and flags hydration complete', async () => {
    mockMemory.set(LANGUAGE_STORAGE_KEY, 'en');

    await useLanguageStore.getState().hydrate();

    expect(useLanguageStore.getState().language).toBe('en');
    expect(useLanguageStore.getState().hasPersisted).toBe(true);
    expect(useLanguageStore.getState().hasHydrated).toBe(true);
  });

  it('keeps the default when nothing is stored (device detection wins)', async () => {
    await useLanguageStore.getState().hydrate();

    expect(useLanguageStore.getState().language).toBe('es');
    expect(useLanguageStore.getState().hasPersisted).toBe(false);
    expect(useLanguageStore.getState().hasHydrated).toBe(true);
  });

  it('falls back to the default when the stored value is not supported', async () => {
    mockMemory.set(LANGUAGE_STORAGE_KEY, 'de');

    await useLanguageStore.getState().hydrate();

    expect(useLanguageStore.getState().language).toBe('es');
    expect(useLanguageStore.getState().hasPersisted).toBe(false);
  });

  it('hydrate is idempotent', async () => {
    mockMemory.set(LANGUAGE_STORAGE_KEY, 'es');

    await useLanguageStore.getState().hydrate();
    await useLanguageStore.getState().hydrate();

    expect(useLanguageStore.getState().language).toBe('es');
    expect(useLanguageStore.getState().hasHydrated).toBe(true);
  });

  it('setLanguage updates state and persists to kv-store', async () => {
    useLanguageStore.getState().setLanguage('en');

    expect(useLanguageStore.getState().language).toBe('en');
    expect(useLanguageStore.getState().hasPersisted).toBe(true);
    expect(mockMemory.get(LANGUAGE_STORAGE_KEY)).toBe('en');
  });
});
