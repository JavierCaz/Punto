/**
 * Language preference store — user override of the UI language.
 *
 * Mirrors src/theme/theme-store.ts exactly:
 * - Persists the choice with expo-sqlite's kv-store (`Storage`) so it survives
 *   restarts.
 * - `hydrate()` is idempotent and flags `hasHydrated`.
 * - `hasPersisted` records whether a user-chosen language actually exists in
 *   storage, so startup only overrides i18n's device-language detection when
 *   there is something real to restore.
 *
 * The store is plain zustand (no React dependency). It deliberately does NOT
 * import the i18n singleton: applying the language to i18next/dayjs is owned
 * by callers (`src/app/_layout.tsx` on hydrate, the Settings screen on change)
 * so the pure store stays unit-testable in the node jest environment.
 */

import Storage from 'expo-sqlite/kv-store';
import { create } from 'zustand';

import type { SupportedLanguage } from '@/i18n';

export const LANGUAGE_STORAGE_KEY = 'punto.language';

const SUPPORTED_LANGUAGES: readonly string[] = ['es', 'en'];

export function isSupportedLanguage(value: unknown): value is SupportedLanguage {
  return typeof value === 'string' && SUPPORTED_LANGUAGES.includes(value);
}

interface LanguageStoreState {
  /** Effective language; only meaningful once a persisted value was read. */
  language: SupportedLanguage;
  /** True once a user-chosen language has been persisted (or read from storage). */
  hasPersisted: boolean;
  /** True once the persisted choice has been read from kv-store. */
  hasHydrated: boolean;
  /** Set the language immediately and persist it asynchronously. */
  setLanguage: (language: SupportedLanguage) => void;
  /** Load the persisted choice (idempotent; resolves after hydration). */
  hydrate: () => Promise<void>;
}

export const useLanguageStore = create<LanguageStoreState>()((set, get) => ({
  language: 'es',
  hasPersisted: false,
  hasHydrated: false,

  setLanguage: (language) => {
    set({ language, hasPersisted: true });
    // Fire-and-forget persistence: a failed write must never block the UI
    // override from applying for the current session.
    void Storage.setItemAsync(LANGUAGE_STORAGE_KEY, language).catch(() => {
      // Noop — persistence is best-effort; the in-memory value stays applied.
    });
  },

  hydrate: async () => {
    if (get().hasHydrated) {
      return;
    }
    try {
      const stored = await Storage.getItemAsync(LANGUAGE_STORAGE_KEY);
      if (isSupportedLanguage(stored)) {
        set({ language: stored, hasPersisted: true });
      }
    } finally {
      set({ hasHydrated: true });
    }
  },
}));
