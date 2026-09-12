/**
 * @jest-environment node
 *
 * Design-token tests for the §7 visual system.
 *
 *  - (a) light + dark raw palettes expose every §7.1 token with the exact hex.
 *  - (b) text-on-surface pairs meet WCAG AAA across every §7.2 accent.
 *  - (c) accent override returns the expected primary pair and derives an
 *        accessible `onPrimary` foreground (the full matrix is enforced here).
 */

import {
  ACCENT_PALETTES,
  ACCENTS,
  DEFAULT_ACCENT,
  buildPalette,
  getAccentPalette,
  palette,
  resolvePalette,
  type Accent,
  type ColorScale,
  type ColorScheme,
} from '@/constants/theme';
import { contrastRatio } from '@/lib/contrast';

const COLOR_SCALE_KEYS: readonly (keyof ColorScale)[] = [
  'primary500',
  'primary100',
  'neutral0',
  'neutral50',
  'neutral200',
  'neutral600',
  'neutral900',
  'success500',
  'warning500',
  'danger500',
];

/** §7.1 exact hex table from AGENTS.md. */
const EXPECTED_TOKENS: Record<ColorScheme, ColorScale> = {
  light: {
    primary500: '#2563EB',
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
};

const SCHEMES = ['light', 'dark'] as const;

describe('§7.1 palette', () => {
  it('both modes expose the exact §7.1 tokens', () => {
    expect(palette.light).toEqual(EXPECTED_TOKENS.light);
    expect(palette.dark).toEqual(EXPECTED_TOKENS.dark);
  });

  it.each(SCHEMES)('%s mode defines every token key', (scheme) => {
    for (const key of COLOR_SCALE_KEYS) {
      expect(palette[scheme]).toHaveProperty(key);
    }
    expect(Object.keys(palette[scheme])).toHaveLength(COLOR_SCALE_KEYS.length);
  });

  it('status colors are identical across modes so status is never ambiguous', () => {
    for (const key of ['success500', 'warning500', 'danger500'] as const) {
      expect(palette.light[key]).toBe(palette.dark[key]);
    }
  });

  it('both modes define every semantic key', () => {
    const expectedKeys = [
      'text',
      'textSecondary',
      'background',
      'backgroundElement',
      'backgroundSelected',
      'border',
      'primary',
      'onPrimary',
      'success',
      'warning',
      'danger',
    ] as const;
    for (const scheme of SCHEMES) {
      const theme = resolvePalette(scheme);
      for (const key of expectedKeys) {
        expect(theme[key]).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
    }
  });

  it('maps legacy view keys onto the semantic scale', () => {
    const light = resolvePalette('light');
    expect(light.background).toBe(palette.light.neutral0);
    expect(light.backgroundElement).toBe(palette.light.neutral50);
    expect(light.backgroundSelected).toBe(palette.light.primary100);
    expect(light.text).toBe(palette.light.neutral900);
    expect(light.textSecondary).toBe(palette.light.neutral600);
    expect(light.border).toBe(palette.light.neutral200);

    const dark = resolvePalette('dark');
    expect(dark.background).toBe(palette.dark.neutral0);
    expect(dark.backgroundElement).toBe(palette.dark.neutral50);
    expect(dark.text).toBe(palette.dark.neutral900);
    expect(dark.textSecondary).toBe(palette.dark.neutral600);
  });
});

describe('§7.1 WCAG AAA text contrast', () => {
  // §7 states the system is "WCAG AAA compliant for text" regardless of accent.
  // Body text (neutral-900) renders on every surface, so assert AAA for the
  // full accent × scheme matrix — not just the default royal accent.
  it.each(SCHEMES)('%s primary text meets WCAG AAA (≥ 7:1) on every surface', (scheme) => {
    for (const accent of ACCENTS) {
      const theme = resolvePalette(scheme, accent);
      expect(contrastRatio(theme.text, theme.background)).toBeGreaterThanOrEqual(7);
      expect(contrastRatio(theme.text, theme.backgroundElement)).toBeGreaterThanOrEqual(7);
      expect(contrastRatio(theme.text, theme.backgroundSelected)).toBeGreaterThanOrEqual(7);
    }
  });

  // Secondary text (neutral-600) is fixed by the §7.1 table and is used for
  // secondary/caption text; enforce AA (≥ 4.5:1) as the quality floor.
  it.each(SCHEMES)('%s secondary text meets WCAG AA (≥ 4.5:1) on every surface', (scheme) => {
    const theme = resolvePalette(scheme);
    expect(contrastRatio(theme.textSecondary, theme.background)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(theme.textSecondary, theme.backgroundElement)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('§7.2 accents', () => {
  it('defaults to royal, which matches the §7.1 primary scale', () => {
    expect(DEFAULT_ACCENT).toBe('royal');
    for (const scheme of SCHEMES) {
      const pair = getAccentPalette('royal', scheme);
      expect(pair.primary500).toBe(palette[scheme].primary500);
      expect(pair.primary100).toBe(palette[scheme].primary100);
    }
  });

  it.each(ACCENTS)('returns the expected primary pair for accent %s', (accent) => {
    for (const scheme of SCHEMES) {
      expect(getAccentPalette(accent, scheme)).toEqual(ACCENT_PALETTES[accent][scheme]);
      const pair = ACCENT_PALETTES[accent][scheme];
      expect(pair.primary500).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(pair.primary100).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(pair.primary500).not.toBe(pair.primary100);
    }
  });

  it('recolors only the primary + backgroundSelected semantics', () => {
    for (const scheme of SCHEMES) {
      const rose = buildPalette(scheme, 'rose');
      expect(rose.primary).toBe(ACCENT_PALETTES.rose[scheme].primary500);
      expect(rose.backgroundSelected).toBe(ACCENT_PALETTES.rose[scheme].primary100);
      expect(rose.success).toBe(palette[scheme].success500);
      expect(rose.warning).toBe(palette[scheme].warning500);
      expect(rose.danger).toBe(palette[scheme].danger500);
    }
  });

  // The primary action button label is ≥16pt bold, i.e. WCAG "large text", so
  // AAA allows 4.5:1. `onPrimary` is auto-derived from the accent, which makes
  // this hold for every accent in both schemes.
  it.each(SCHEMES)('%s onPrimary meets WCAG AAA large text (≥ 4.5:1) for every accent', (scheme) => {
    for (const accent of ACCENTS) {
      const theme = resolvePalette(scheme, accent);
      expect(contrastRatio(theme.onPrimary, theme.primary)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('lists the six persisted accents in picker order', () => {
    const expected: readonly Accent[] = ['royal', 'emerald', 'indigo', 'amber', 'slate', 'rose'];
    expect([...ACCENTS]).toEqual([...expected]);
  });
});
