/**
 * @jest-environment node
 */

import {
  normalizeUsername,
  validatePassword,
  validatePin,
  validateUsername,
} from '@/auth/validation';

describe('normalizeUsername', () => {
  it('trims and lowercases', () => {
    expect(normalizeUsername('  Ana.Dueña  ')).toBe('ana.dueña');
    expect(normalizeUsername('Luis')).toBe('luis');
  });
});

describe('validateUsername', () => {
  it('accepts valid lowercase usernames with allowed separators', () => {
    for (const name of ['ana', 'ana.owner', 'luis_garcia', 'cafe-1', 'a.b_c-d']) {
      expect(validateUsername(name)).toBeNull();
    }
  });

  it('rejects empty / whitespace', () => {
    expect(validateUsername('')).toBe('empty');
    expect(validateUsername('   ')).toBe('empty');
  });

  it('rejects too-short and too-long', () => {
    expect(validateUsername('ab')).toBe('too-short');
    expect(validateUsername('a'.repeat(33))).toBe('too-long');
  });

  it('accepts uppercase (normalized to lowercase) for case-insensitive login', () => {
    expect(validateUsername('Ana')).toBeNull();
    expect(validateUsername('LUIS.Garcia')).toBeNull();
  });

  it('rejects accents, spaces and symbols', () => {
    expect(validateUsername('aná')).toBe('invalid-chars');
    expect(validateUsername('ana dueña')).toBe('invalid-chars');
    expect(validateUsername('ana!')).toBe('invalid-chars');
  });
});

describe('validatePassword', () => {
  it('accepts 8+ characters', () => {
    expect(validatePassword('12345678')).toBeNull();
    expect(validatePassword('a-very-long-password')).toBeNull();
  });

  it('rejects empty and short passwords', () => {
    expect(validatePassword('')).toBe('empty');
    expect(validatePassword('1234567')).toBe('too-short');
  });
});

describe('validatePin', () => {
  it('accepts 4-6 digit numeric pins', () => {
    for (const pin of ['1234', '12345', '123456']) {
      expect(validatePin(pin)).toBeNull();
    }
  });

  it('rejects empty', () => {
    expect(validatePin('')).toBe('empty');
  });

  it('rejects non-numeric characters', () => {
    expect(validatePin('12a4')).toBe('invalid-chars');
    expect(validatePin('12.4')).toBe('invalid-chars');
    expect(validatePin('-123')).toBe('invalid-chars');
  });

  it('rejects too-short and too-long pins', () => {
    expect(validatePin('123')).toBe('too-short');
    expect(validatePin('1234567')).toBe('too-long');
  });
});
