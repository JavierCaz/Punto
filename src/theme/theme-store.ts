/**
 * Theme-mode store — user override of the light/dark scheme.
 *
 * - Persists the override with expo-sqlite's kv-store (`Storage`, an
 *   AsyncStorage-compatible SQLite singleton) so the choice survives restarts.
 * - `resolveEffectiveScheme` is the pure resolution core: an explicit override
 *   wins; 'system' defers to the OS color scheme.
 *
 * The store is plain zustand (no React dependency) so the pure logic is
 * unit-testable in the node jest environment with a mocked kv-store.
 */

import Storage from 'expo-sqlite/kv-store';
import { create } from 'zustand';

/** User-selectable theme modes. */
export type ThemeMode = 'system' | 'light' | 'dark';

/** Normalized color schemes the app actually renders. */
export type ColorScheme = 'light' | 'dark';

export const THEME_MODE_STORAGE_KEY = 'punto.theme-mode';

const THEME_MODES: readonly ThemeMode[] = ['system', 'light', 'dark'];

export function isThemeMode(value: unknown): value is ThemeMode {
  return typeof value === 'string' && (THEME_MODES as readonly string[]).includes(value);
}

/**
 * Resolve the effective color scheme from the stored override and the current
 * system scheme. Pure — no I/O, no hooks — so it is trivially testable.
 */
export function resolveEffectiveScheme(mode: ThemeMode, systemScheme: ColorScheme): ColorScheme {
  return mode === 'system' ? systemScheme : mode;
}

interface ThemeStoreState {
  /** User override; 'system' means "follow the OS". */
  mode: ThemeMode;
  /** True once the persisted override has been read from kv-store. */
  hasHydrated: boolean;
  /** Set the override immediately and persist it asynchronously. */
  setMode: (mode: ThemeMode) => void;
  /** Load the persisted override (idempotent; resolves after hydration). */
  hydrate: () => Promise<void>;
}

export const useThemeStore = create<ThemeStoreState>()((set, get) => ({
  mode: 'system',
  hasHydrated: false,

  setMode: (mode) => {
    set({ mode });
    // Fire-and-forget persistence: a failed write must never block the UI
    // override from applying for the current session.
    void Storage.setItemAsync(THEME_MODE_STORAGE_KEY, mode).catch(() => {
      // Noop — persistence is best-effort; the in-memory value stays applied.
    });
  },

  hydrate: async () => {
    if (get().hasHydrated) {
      return;
    }
    try {
      const stored = await Storage.getItemAsync(THEME_MODE_STORAGE_KEY);
      if (isThemeMode(stored)) {
        set({ mode: stored });
      }
    } finally {
      set({ hasHydrated: true });
    }
  },
}));
