/**
 * WCAG 2.x contrast utilities (pure, dependency-free).
 *
 * These are the enforcement primitives behind §7.2's "text contrast must remain
 * WCAG AAA regardless of chosen accent": the theme tokens declare their colors
 * and `src/theme/__tests__/theme.test.ts` asserts that every accent × scheme
 * pair clears the thresholds computed here.
 *
 * Keep this module free of React Native imports so it runs in the node jest
 * environment and can be reused anywhere without pulling in native code.
 */

/** WCAG conformance levels used by the design system. */
export type WcagLevel = 'AA' | 'AAA';

/**
 * Text size class. WCAG treats text as "large" at ≥18pt, or ≥14pt when bold;
 * large text is allowed a lower contrast threshold.
 */
export type TextSize = 'normal' | 'large';

/**
 * Parse an `#RRGGBB` (with or without leading `#`) sRGB hex color into its
 * channel values (0..255). Throws on malformed input so a bad token fails
 * loudly instead of silently producing a bogus contrast ratio.
 */
function parseHex(hex: string): [number, number, number] {
  const match = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
  const value = match?.[1];
  if (value === undefined) {
    throw new RangeError(`Invalid hex color: ${hex}`);
  }
  const parsed = parseInt(value, 16);
  return [(parsed >> 16) & 0xff, (parsed >> 8) & 0xff, parsed & 0xff];
}

/** WCAG relative luminance of an sRGB hex color (0..1). */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = parseHex(hex).map((channel) => {
    const c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two hex colors (1..21). */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Minimum contrast ratio required by WCAG for a level + text size. */
export function minContrastRatio(level: WcagLevel, size: TextSize = 'normal'): number {
  if (level === 'AAA') {
    return size === 'large' ? 4.5 : 7;
  }
  return size === 'large' ? 3 : 4.5;
}

/** True when `foreground` on `background` meets the WCAG threshold. */
export function meetsContrast(
  foreground: string,
  background: string,
  level: WcagLevel,
  size: TextSize = 'normal',
): boolean {
  return contrastRatio(foreground, background) >= minContrastRatio(level, size);
}

/**
 * Pick the candidate that maximizes contrast against `background`.
 *
 * Used to derive `onPrimary` for a user-selectable accent: whichever of the
 * light/dark foregrounds reads best wins. Ties keep the earlier candidate, so
 * the default candidate order (`white`, then ink) is preserved.
 */
export function pickReadableForeground(
  background: string,
  candidates: readonly string[] = ['#FFFFFF', '#0F172A'],
): string {
  const first = candidates[0];
  if (first === undefined) {
    throw new RangeError('pickReadableForeground requires at least one candidate');
  }
  let best = first;
  let bestRatio = contrastRatio(best, background);
  for (const candidate of candidates.slice(1)) {
    const ratio = contrastRatio(candidate, background);
    if (ratio > bestRatio) {
      best = candidate;
      bestRatio = ratio;
    }
  }
  return best;
}
