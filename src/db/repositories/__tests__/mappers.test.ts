/**
 * @jest-environment node
 *
 * Pure mapper tests — SQLite row coercion helpers. No database required.
 */

import {
  archiveSoftWhere,
  boolFromInt,
  int,
  intBool,
  intOrNull,
  str,
  strOrNull,
} from '@/db/repositories/mappers';

describe('boolFromInt / intBool', () => {
  it('maps 1/0 integer flags to booleans', () => {
    expect(boolFromInt(1)).toBe(true);
    expect(boolFromInt(0)).toBe(false);
  });

  it('maps booleans to 1/0 integer flags', () => {
    expect(intBool(true)).toBe(1);
    expect(intBool(false)).toBe(0);
  });
});

describe('strOrNull / intOrNull', () => {
  it('maps SQL NULL and JS undefined to null', () => {
    expect(strOrNull(null)).toBeNull();
    expect(strOrNull(undefined)).toBeNull();
    expect(intOrNull(null)).toBeNull();
    expect(intOrNull(undefined)).toBeNull();
  });

  it('coerces non-null values to their canonical forms', () => {
    expect(strOrNull('abc')).toBe('abc');
    expect(strOrNull(42)).toBe('42');
    expect(intOrNull('7')).toBe(7);
    expect(intOrNull(3)).toBe(3);
  });

  it('distinguishes an empty string from null', () => {
    expect(strOrNull('')).toBe('');
  });
});

describe('str / int', () => {
  it('coerces required columns', () => {
    expect(str('hello')).toBe('hello');
    expect(str(123)).toBe('123');
    expect(int('42')).toBe(42);
    expect(int(42)).toBe(42);
  });
});

describe('archiveSoftWhere', () => {
  it('is the canonical soft-delete predicate', () => {
    expect(archiveSoftWhere).toBe('archived_at IS NULL');
  });
});
