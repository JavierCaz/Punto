/**
 * Accent store — reactive mirror of the persisted `business.accent_color`.
 *
 * SQLite is the source of truth (§7.2); this store keeps the resolved accent in
 * memory so `useTheme()` recolors without a database read per render. `hydrate()`
 * receives the profile loader as an argument (dependency inversion) so this
 * module stays free of `expo-sqlite` and is trivial to test in node.
 */

import { create } from 'zustand';

import { DEFAULT_ACCENT, isAccent, type Accent } from '@/constants/accents';

/** Minimal shape the store needs from the business profile. */
export interface BusinessProfileSnapshot {
  accentColor: unknown;
}

export type BusinessProfileLoader = () => Promise<BusinessProfileSnapshot | null>;

interface AccentStoreState {
  accent: Accent;
  hasHydrated: boolean;
  setAccent: (accent: Accent) => void;
  hydrate: (loadProfile: BusinessProfileLoader) => Promise<void>;
}

export const useAccentStore = create<AccentStoreState>()((set, get) => ({
  accent: DEFAULT_ACCENT,
  hasHydrated: false,

  setAccent: (accent) => {
    set({ accent });
  },

  hydrate: async (loadProfile) => {
    if (get().hasHydrated) {
      return;
    }
    try {
      const profile = await loadProfile();
      if (profile && isAccent(profile.accentColor)) {
        set({ accent: profile.accentColor });
      }
    } catch {
      // No business row yet (onboarding) or DB unavailable: keep the default.
    } finally {
      set({ hasHydrated: true });
    }
  },
}));
