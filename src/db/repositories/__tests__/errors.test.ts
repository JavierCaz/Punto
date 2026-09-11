/**
 * @jest-environment node
 *
 * Pure error-module tests — repoError/isRepoError and SQLite error remapping.
 */

import { REPO_ERROR, isRepoError, mapSqliteError, repoError } from '@/db/repositories/errors';

describe('repoError', () => {
  it('sets the message to the code', () => {
    const error = repoError(REPO_ERROR.NOT_FOUND);
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('REPO_NOT_FOUND');
  });

  it('attaches an optional detail', () => {
    const error = repoError(REPO_ERROR.DUPLICATE, 'product name already exists');
    expect(error.detail).toBe('product name already exists');
  });

  it('leaves detail undefined when omitted', () => {
    const error = repoError(REPO_ERROR.NOT_FOUND);
    expect(error.detail).toBeUndefined();
  });
});

describe('isRepoError', () => {
  it('matches the exact code', () => {
    const error = repoError(REPO_ERROR.NO_BUSINESS);
    expect(isRepoError(error, REPO_ERROR.NO_BUSINESS)).toBe(true);
    expect(isRepoError(error, REPO_ERROR.NOT_FOUND)).toBe(false);
  });

  it('matches any repository error when no code is given', () => {
    expect(isRepoError(repoError(REPO_ERROR.NOT_FOUND))).toBe(true);
  });

  it('rejects non-repository errors and non-errors', () => {
    expect(isRepoError(new Error('random'), REPO_ERROR.NOT_FOUND)).toBe(false);
    expect(isRepoError(new Error('random'))).toBe(false);
    expect(isRepoError(null, REPO_ERROR.NOT_FOUND)).toBe(false);
    expect(isRepoError(undefined)).toBe(false);
    expect(isRepoError('REPO_NOT_FOUND', REPO_ERROR.NOT_FOUND)).toBe(false);
    expect(isRepoError({ message: 'REPO_NOT_FOUND' }, REPO_ERROR.NOT_FOUND)).toBe(false);
  });
});

describe('mapSqliteError', () => {
  it('remaps a UNIQUE constraint failure to REPO_DUPLICATE', () => {
    const error = mapSqliteError(new Error('UNIQUE constraint failed: product.name'));
    expect(isRepoError(error, REPO_ERROR.DUPLICATE)).toBe(true);
    expect(error.detail).toContain('UNIQUE constraint failed');
  });

  it('remaps SQLITE_CONSTRAINT_UNIQUE / PRIMARYKEY to REPO_DUPLICATE', () => {
    for (const message of ['SQLITE_CONSTRAINT_UNIQUE', 'SQLITE_CONSTRAINT_PRIMARYKEY']) {
      const error = mapSqliteError(new Error(`${message}: index violated`));
      expect(isRepoError(error, REPO_ERROR.DUPLICATE)).toBe(true);
      expect(error.detail).toContain(message);
    }
  });

  it('remaps a generic SQLITE_CONSTRAINT to REPO_CONSTRAINT (not DUPLICATE)', () => {
    const error = mapSqliteError(new Error('SQLITE_CONSTRAINT: something failed'));
    expect(isRepoError(error, REPO_ERROR.CONSTRAINT)).toBe(true);
    expect(error.detail).toContain('SQLITE_CONSTRAINT');
  });

  it('remaps CHECK / NOT NULL / FOREIGN KEY constraint failures to REPO_CONSTRAINT', () => {
    for (const message of [
      'SQLITE_CONSTRAINT_CHECK: price_minor >= 0',
      'SQLITE_CONSTRAINT_NOTNULL: name',
      'SQLITE_CONSTRAINT_FOREIGNKEY: category_id',
    ]) {
      const error = mapSqliteError(new Error(message));
      expect(isRepoError(error, REPO_ERROR.CONSTRAINT)).toBe(true);
      expect(isRepoError(error, REPO_ERROR.DUPLICATE)).toBe(false);
      expect(error.detail).toBe(message);
    }
  });

  it('remaps real expo-sqlite "Error code N: … constraint failed" messages', () => {
    const foreignKey = mapSqliteError(new Error('Error code 19: FOREIGN KEY constraint failed'));
    expect(isRepoError(foreignKey, REPO_ERROR.CONSTRAINT)).toBe(true);

    const check = mapSqliteError(
      new Error('Error code 19: CHECK constraint failed: price_minor >= 0'),
    );
    expect(isRepoError(check, REPO_ERROR.CONSTRAINT)).toBe(true);

    const notNull = mapSqliteError(
      new Error('Error code 19: NOT NULL constraint failed: product.name'),
    );
    expect(isRepoError(notNull, REPO_ERROR.CONSTRAINT)).toBe(true);

    const unique = mapSqliteError(new Error('Error code 19: UNIQUE constraint failed: product.name'));
    expect(isRepoError(unique, REPO_ERROR.DUPLICATE)).toBe(true);
  });

  it('rethrows non-constraint errors unchanged', () => {
    const original = new Error('database is locked');
    expect(() => mapSqliteError(original)).toThrow(original);
  });
});
