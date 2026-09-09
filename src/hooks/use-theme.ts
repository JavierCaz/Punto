/**
 * Theme hooks — resolved color scheme + semantic palette.
 *
 * `useTheme()` returns the active semantic palette (the resolved scheme after
 * applying the user's stored override, falling back to the OS scheme for
 * 'system'). Components read semantic keys only — `theme.background`,
 * `theme.text`, `theme.backgroundElement`, `theme.backgroundSelected`,
 * `theme.textSecondary`, `theme.border`, `theme.primary`, …
 */

import { Colors, type ColorScheme, type SemanticPalette } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { resolveEffectiveScheme, useThemeStore } from '@/theme/theme-store';

/**
 * Resolve the currently active scheme: the persisted override wins, and
 * 'system' defers to the normalized OS color scheme. Reactive to both the
 * override store and OS appearance changes.
 */
export function useEffectiveColorScheme(): ColorScheme {
  const mode = useThemeStore((state) => state.mode);
  const systemScheme = useColorScheme();
  return resolveEffectiveScheme(mode, systemScheme);
}

/** Semantic palette (§7.1 + accent) for the currently active scheme. */
export function useTheme(): SemanticPalette {
  return Colors[useEffectiveColorScheme()];
}
