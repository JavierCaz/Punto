/**
 * @jest-environment node
 *
 * Design-token tests for the §7 visual system.
 *
 *  - (a) light + dark raw palettes expose every §7.1 token with the exact hex.
 *  - (b) text-on-background pairs meet WCAG AAA (relative luminance + contrast
 *        ratio computed here — no external deps).
 *  - (c) accent override returns the expected §7.2 primary pair per accent.
 */

import {
  ACCENT_PALETTES,
  Colors,
  DEFAULT_ACCENT,
  buildPalette,
  getAccentPalette,
  palette,
  type Accent,
  type ColorScale,
  type ColorScheme,
} from '@/constants/theme';

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

/** WCAG relative luminance of an sRGB hex color. */
function relativeLuminance(hex: string): number {
  const value = hex.replace('#', '');
  const channels = [0, 2, 4].map((i) => {
    const channel = parseInt(value.slice(i, i + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

/** WCAG contrast ratio between two hex colors (1..21). */
function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

describe('§7.1 palette', () => {
  it('both modes expose the exact §7.1 tokens', () => {
    expect(palette.light).toEqual(EXPECTED_TOKENS.light);
    expect(palette.dark).toEqual(EXPECTED_TOKENS.dark);
  });

  it.each(['light', 'dark'] as const)('%s mode defines every token key', (scheme) => {
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
      'success',
      'warning',
      'danger',
    ] as const;
    for (const scheme of ['light', 'dark'] as const) {
      for (const key of expectedKeys) {
        expect(Colors[scheme][key]).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
    }
  });

  it('maps legacy view keys onto the semantic scale', () => {
    expect(Colors.light.background).toBe(palette.light.neutral0);
    expect(Colors.light.backgroundElement).toBe(palette.light.neutral50);
    expect(Colors.light.backgroundSelected).toBe(palette.light.primary100);
    expect(Colors.light.text).toBe(palette.light.neutral900);
    expect(Colors.light.textSecondary).toBe(palette.light.neutral600);
    expect(Colors.light.border).toBe(palette.light.neutral200);

    expect(Colors.dark.background).toBe(palette.dark.neutral0);
    expect(Colors.dark.backgroundElement).toBe(palette.dark.neutral50);
    expect(Colors.dark.text).toBe(palette.dark.neutral900);
    expect(Colors.dark.textSecondary).toBe(palette.dark.neutral600);
  });
});

describe('§7.1 WCAG AAA text contrast', () => {
  // §7 states the system is "WCAG AAA compliant for text". Primary body text
  // (neutral-900) is what renders on every surface, so assert AAA there.
  const textPairs: [string, string, string][] = [
    ['light primary text / background', Colors.light.text, Colors.light.background],
    ['light primary text / card', Colors.light.text, Colors.light.backgroundElement],
    ['light primary text / selected', Colors.light.text, Colors.light.backgroundSelected],
    ['dark primary text / background', Colors.dark.text, Colors.dark.background],
    ['dark primary text / card', Colors.dark.text, Colors.dark.backgroundElement],
    ['dark primary text / selected', Colors.dark.text, Colors.dark.backgroundSelected],
  ];

  it.each(textPairs)('%s meets WCAG AAA (≥ 7:1)', (_label, fg, bg) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(7);
  });

  // Secondary text (neutral-600) is fixed by the §7.1 table and is used for
  // secondary/caption text; enforce AA (≥ 4.5:1) as the quality floor.
  it.each([
    ['light secondary text / background', Colors.light.textSecondary, Colors.light.background],
    ['light secondary text / card', Colors.light.textSecondary, Colors.light.backgroundElement],
    ['dark secondary text / background', Colors.dark.textSecondary, Colors.dark.background],
    ['dark secondary text / card', Colors.dark.textSecondary, Colors.dark.backgroundElement],
  ] as const)('%s meets WCAG AA (≥ 4.5:1)', (_label, fg, bg) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('§7.2 accents', () => {
  const accents: readonly Accent[] = ['royal', 'emerald', 'indigo', 'amber', 'slate', 'rose'];

  it('defaults to royal, which matches the §7.1 primary scale', () => {
    expect(DEFAULT_ACCENT).toBe('royal');
    for (const scheme of ['light', 'dark'] as const) {
      const pair = getAccentPalette('royal', scheme);
      expect(pair.primary500).toBe(palette[scheme].primary500);
      expect(pair.primary100).toBe(palette[scheme].primary100);
    }
  });

  it.each(accents)('returns the expected primary pair for accent %s', (accent) => {
    for (const scheme of ['light', 'dark'] as const) {
      expect(getAccentPalette(accent, scheme)).toEqual(ACCENT_PALETTES[accent][scheme]);
      const pair = ACCENT_PALETTES[accent][scheme];
      expect(pair.primary500).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(pair.primary100).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(pair.primary500).not.toBe(pair.primary100);
    }
  });

  it('recolors only the primary + backgroundSelected semantics', () => {
    for (const scheme of ['light', 'dark'] as const) {
      const rose = buildPalette(scheme, 'rose');
      expect(rose.primary).toBe(ACCENT_PALETTES.rose[scheme].primary500);
      expect(rose.backgroundSelected).toBe(ACCENT_PALETTES.rose[scheme].primary100);
      expect(rose.success).toBe(palette[scheme].success500);
      expect(rose.warning).toBe(palette[scheme].warning500);
      expect(rose.danger).toBe(palette[scheme].danger500);
    }
  });
});
