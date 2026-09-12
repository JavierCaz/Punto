/**
 * Design tokens — single source of truth for the §7 Visual Design System.
 *
 * Everything visual derives from this module:
 *  - §7.1 raw color palette (exact hex values, light + dark)
 *  - §7.2 accent system (business-chosen primary recolor, default "royal")
 *  - semantic view colors derived from the raw palette + accent
 *  - §7.3 typography scale (display … micro) and native font families
 *  - §7.4 spacing grid, border radii and touch-target constants
 *
 * `ThemeColor` maps the legacy view keys (text/background/backgroundElement/
 * backgroundSelected/textSecondary) onto the semantic scale, and `Fonts`,
 * `Spacing`, `BottomTabInset`, `MaxContentWidth` keep their previous shape.
 *
 * §7.2 accent safety: a user-selectable accent only recolors `primary` and
 * `backgroundSelected`. `onPrimary` is derived from the active accent with the
 * WCAG contrast helper so button/icon foregrounds stay readable; the full
 * accent × scheme matrix is enforced by theme.test.ts.
 */

import { Platform } from 'react-native';

import { ACCENTS, DEFAULT_ACCENT, type Accent } from '@/constants/accents';
import { pickReadableForeground } from '@/lib/contrast';

/** System color schemes the app can render in. */
export type ColorScheme = 'light' | 'dark';

/**
 * §7.1 raw scale. Keys mirror the AGENTS.md token table
 * (`color-primary-500` → `primary500`, `color-neutral-0` → `neutral0`, …).
 */
export interface ColorScale {
  /** Primary action buttons, active tab states, focused inputs. */
  primary500: string;
  /** Selection highlights, soft badges. */
  primary100: string;
  /** Primary background. */
  neutral0: string;
  /** Secondary background, card fill. */
  neutral50: string;
  /** Borders, dividers, disabled states. */
  neutral200: string;
  /** Secondary body text, icons. */
  neutral600: string;
  /** Headings, primary body text. */
  neutral900: string;
  /** Completed payments, active status, in-stock badges. */
  success500: string;
  /** Low stock warnings, pending sync, held carts. */
  warning500: string;
  /** Refunds, deleted items, out-of-stock alerts. */
  danger500: string;
}

export type ColorScaleKey = keyof ColorScale;

/**
 * §7.1 palette with the EXACT hex values from AGENTS.md. Status colors are
 * identical in both modes so status is never ambiguous (§7.2).
 */
export const palette = {
  light: {
    primary500: '#2563EB', // Royal Blue
    primary100: '#DBEAFE',
    neutral0: '#FFFFFF',
    neutral50: '#F8FAFC',
    neutral200: '#E2E8F0',
    neutral600: '#475569',
    neutral900: '#0F172A',
    success500: '#10B981',
    warning500: '#F59E0B',
    danger500: '#EF4444',
  },
  dark: {
    primary500: '#3B82F6',
    primary100: '#1E3A8A',
    neutral0: '#0F172A',
    neutral50: '#1E293B',
    neutral200: '#334155',
    neutral600: '#94A3B8',
    neutral900: '#F8FAFC',
    success500: '#10B981',
    warning500: '#F59E0B',
    danger500: '#EF4444',
  },
} as const satisfies Record<ColorScheme, ColorScale>;

/**
 * §7.2 brand accents. Each accent recolors `color-primary-500` / `color-primary-100`
 * for both modes; every other semantic color stays fixed. Accents are
 * business-profile choices persisted with the profile (never hard-coded in UI).
 * The vocabulary lives in `@/constants/accents` so the DB CHECK constraint and
 * the palette keys cannot drift apart.
 */
export { ACCENTS, DEFAULT_ACCENT };
export type { Accent };

export interface AccentPalette {
  primary500: string;
  primary100: string;
}

/**
 * Accent override pairs. The default ("royal") pair matches §7.1 exactly.
 * Remaining pairs pick Tailwind-style scales tuned so dark-mode 100 values are
 * deep tints (readable light text) and light-mode 100 values are pale (readable
 * dark text); 500 values are saturated button colors.
 */
export const ACCENT_PALETTES: Record<Accent, Record<ColorScheme, AccentPalette>> = {
  royal: {
    light: { primary500: '#2563EB', primary100: '#DBEAFE' },
    dark: { primary500: '#3B82F6', primary100: '#1E3A8A' },
  },
  emerald: {
    light: { primary500: '#047857', primary100: '#D1FAE5' },
    dark: { primary500: '#34D399', primary100: '#064E3B' },
  },
  indigo: {
    light: { primary500: '#4F46E5', primary100: '#E0E7FF' },
    dark: { primary500: '#818CF8', primary100: '#3730A3' },
  },
  amber: {
    light: { primary500: '#B45309', primary100: '#FEF3C7' },
    dark: { primary500: '#FBBF24', primary100: '#78350F' },
  },
  slate: {
    light: { primary500: '#475569', primary100: '#E2E8F0' },
    dark: { primary500: '#94A3B8', primary100: '#334155' },
  },
  rose: {
    light: { primary500: '#E11D48', primary100: '#FFE4E6' },
    dark: { primary500: '#FB7185', primary100: '#881337' },
  },
};

/** Resolve the §7.2 primary pair for an accent + scheme. */
export function getAccentPalette(accent: Accent, scheme: ColorScheme): AccentPalette {
  return ACCENT_PALETTES[accent][scheme];
}

/**
 * Semantic view colors used by components. These are the only color keys that
 * should appear in component code; never reference the raw scale directly.
 */
export type ThemeColor =
  | 'text'
  | 'textSecondary'
  | 'background'
  | 'backgroundElement'
  | 'backgroundSelected'
  | 'border'
  | 'primary'
  | 'onPrimary'
  | 'success'
  | 'warning'
  | 'danger';

export type SemanticPalette = Record<ThemeColor, string>;

/**
 * Build the semantic palette for a scheme from the raw §7.1 scale, applying
 * the optional §7.2 accent to `primary` / `backgroundSelected` and deriving an
 * accessible `onPrimary` foreground for the accent.
 *
 * Legacy view names map onto the semantic scale as:
 *   text → neutral-900, textSecondary → neutral-600,
 *   background → neutral-0, backgroundElement → neutral-50,
 *   backgroundSelected → primary-100 (selection highlight).
 */
export function buildPalette(scheme: ColorScheme, accent: Accent = DEFAULT_ACCENT): SemanticPalette {
  const raw = palette[scheme];
  const accentPair = getAccentPalette(accent, scheme);

  return {
    text: raw.neutral900,
    textSecondary: raw.neutral600,
    background: raw.neutral0,
    backgroundElement: raw.neutral50,
    backgroundSelected: accentPair.primary100,
    border: raw.neutral200,
    primary: accentPair.primary500,
    // Derived per accent so text/icons on primary always stay readable.
    onPrimary: pickReadableForeground(accentPair.primary500),
    success: raw.success500,
    warning: raw.warning500,
    danger: raw.danger500,
  };
}

/**
 * Resolve the semantic palette for an active scheme + §7.2 accent. This is the
 * single runtime entry point; there is intentionally no static `Colors` map,
 * because a module-level palette pinned to the default accent would silently
 * fail to recolor when the business picks another accent.
 */
export function resolvePalette(scheme: ColorScheme, accent: Accent = DEFAULT_ACCENT): SemanticPalette {
  return buildPalette(scheme, accent);
}

/**
 * §7.3 typography scale. Sizes/weights/line-heights come from the AGENTS.md
 * table; weights are typed as RN `fontWeight` literals.
 */
export const Typography = {
  /** Dashboard stats, charge amount. */
  display: { fontSize: 32, fontWeight: '700', lineHeight: 40 },
  /** Screen titles. */
  heading1: { fontSize: 24, fontWeight: '700', lineHeight: 32 },
  /** Card titles, modals. */
  heading2: { fontSize: 18, fontWeight: '600', lineHeight: 24 },
  /** Primary text, inputs (min touch-target readable text). */
  body1: { fontSize: 16, fontWeight: '400', lineHeight: 22 },
  /** Labels, captions. */
  body2: { fontSize: 14, fontWeight: '400', lineHeight: 18 },
  /** Status indicators. */
  micro: { fontSize: 12, fontWeight: '500', lineHeight: 16 },
} as const;

export type TypographyStyle = (typeof Typography)[keyof typeof Typography];

/** Native system font families (iOS San Francisco, Android Roboto). */
export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

/**
 * §7.4 border radii. 6px badges/tags, 12px inputs/buttons/bottom sheets,
 * 16px main structural cards/modals.
 */
export const Radius = {
  sm: 6,
  md: 12,
  lg: 16,
} as const;

/**
 * §7.4 touch targets. Minimum 48×48dp for clickable items on mobile; POS
 * action triggers (Charge, Add to Cart) use `action` (56×56dp).
 */
export const TouchTarget = {
  min: 48,
  action: 56,
} as const;

/**
 * §7.4 strict 8pt spacing grid (4pt for micro-alignment).
 * half 2 · one 4 · two 8 · three 16 · four 24 · five 32 · six 64
 */
export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
