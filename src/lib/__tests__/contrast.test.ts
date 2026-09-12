/**
 * @jest-environment node
 *
 * Unit tests for the WCAG contrast utilities backing §7.2 accent enforcement.
 * Reference values come from the WCAG 2.x relative-luminance formula.
 */

import {
  contrastRatio,
  meetsContrast,
  minContrastRatio,
  pickReadableForeground,
  relativeLuminance,
} from '@/lib/contrast';

describe('relativeLuminance', () => {
  it('is 0 for black and 1 for white', () => {
    expect(relativeLuminance('#000000')).toBe(0);
    expect(relativeLuminance('#FFFFFF')).toBeCloseTo(1, 5);
  });

  it('accepts hex with or without the leading #', () => {
    expect(relativeLuminance('2563EB')).toBe(relativeLuminance('#2563EB'));
  });

  it('throws on malformed input', () => {
    expect(() => relativeLuminance('#12345')).toThrow(RangeError);
    expect(() => relativeLuminance('not-a-color')).toThrow(RangeError);
  });
});

describe('contrastRatio', () => {
  it('is 21:1 for black on white', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
  });

  it('is 1:1 for a color against itself', () => {
    expect(contrastRatio('#2563EB', '#2563EB')).toBeCloseTo(1, 5);
  });

  it('is symmetric', () => {
    expect(contrastRatio('#2563EB', '#FFFFFF')).toBeCloseTo(
      contrastRatio('#FFFFFF', '#2563EB'),
      10,
    );
  });
});

describe('minContrastRatio / meetsContrast', () => {
  it('uses the WCAG thresholds for normal and large text', () => {
    expect(minContrastRatio('AAA', 'normal')).toBe(7);
    expect(minContrastRatio('AAA', 'large')).toBe(4.5);
    expect(minContrastRatio('AA', 'normal')).toBe(4.5);
    expect(minContrastRatio('AA', 'large')).toBe(3);
  });

  it('classifies a borderline pair by text size', () => {
    expect(meetsContrast('#FFFFFF', '#B45309', 'AAA', 'large')).toBe(true);
    expect(meetsContrast('#FFFFFF', '#B45309', 'AAA', 'normal')).toBe(false);
  });
});

describe('pickReadableForeground', () => {
  it('picks white on dark fills and ink on light fills', () => {
    expect(pickReadableForeground('#2563EB')).toBe('#FFFFFF');
    expect(pickReadableForeground('#FBBF24')).toBe('#0F172A');
  });

  it('picks the higher-contrast candidate regardless of order', () => {
    expect(pickReadableForeground('#FBBF24', ['#0F172A', '#FFFFFF'])).toBe('#0F172A');
  });

  it('throws when no candidates are provided', () => {
    expect(() => pickReadableForeground('#FFFFFF', [])).toThrow(RangeError);
  });
});
