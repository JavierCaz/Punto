/**
 * @jest-environment node
 *
 * Theme-store tests: effective-scheme resolution (pure part) plus hydration
 * and persistence against an in-memory mock of 'expo-sqlite/kv-store'.
 */

import {
  THEME_MODE_STORAGE_KEY,
  isThemeMode,
  resolveEffectiveScheme,
  useThemeStore,
  type ColorScheme,
  type ThemeMode,
} from '@/theme/theme-store';

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
  useThemeStore.setState({ mode: 'system', hasHydrated: false });
});

describe('resolveEffectiveScheme', () => {
  it('an explicit override wins regardless of the system scheme', () => {
    expect(resolveEffectiveScheme('light', 'dark')).toBe('light');
    expect(resolveEffectiveScheme('dark', 'light')).toBe('dark');
  });

  it('system mode defers to the OS scheme', () => {
    expect(resolveEffectiveScheme('system', 'light')).toBe('light');
    expect(resolveEffectiveScheme('system', 'dark')).toBe('dark');
  });
});

describe('isThemeMode', () => {
  it('accepts only valid modes', () => {
    for (const mode of ['system', 'light', 'dark'] as const) {
      expect(isThemeMode(mode)).toBe(true);
    }
    expect(isThemeMode('blue')).toBe(false);
    expect(isThemeMode(null)).toBe(false);
    expect(isThemeMode(undefined)).toBe(false);
  });
});

describe('theme store', () => {
  it('hydrates a persisted override (dark) and flags hydration complete', async () => {
    mockMemory.set(THEME_MODE_STORAGE_KEY, 'dark');

    await useThemeStore.getState().hydrate();

    expect(useThemeStore.getState().mode).toBe('dark');
    expect(useThemeStore.getState().hasHydrated).toBe(true);
  });

  it('falls back to system when the stored value is not a ThemeMode', async () => {
    mockMemory.set(THEME_MODE_STORAGE_KEY, 'blue');

    await useThemeStore.getState().hydrate();

    expect(useThemeStore.getState().mode).toBe('system');
    expect(useThemeStore.getState().hasHydrated).toBe(true);
  });

  it('hydrate is idempotent', async () => {
    mockMemory.set(THEME_MODE_STORAGE_KEY, 'light');

    await useThemeStore.getState().hydrate();
    await useThemeStore.getState().hydrate();

    expect(useThemeStore.getState().mode).toBe('light');
  });

  it('setMode updates state and persists to kv-store', async () => {
    useThemeStore.getState().setMode('light');

    expect(useThemeStore.getState().mode).toBe('light');
    expect(mockMemory.get(THEME_MODE_STORAGE_KEY)).toBe('light');
  });

  it('composes with the resolution logic for the stored override', async () => {
    mockMemory.set(THEME_MODE_STORAGE_KEY, 'dark');
    await useThemeStore.getState().hydrate();

    const mode: ThemeMode = useThemeStore.getState().mode;
    const systemScheme: ColorScheme = 'light';
    expect(resolveEffectiveScheme(mode, systemScheme)).toBe('dark');
  });
});
