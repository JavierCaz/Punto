/**
 * @jest-environment node
 *
 * Pure pagination tests — cursor encode/decode and keyset WHERE generation.
 */

import {
  DEFAULT_PAGE_LIMIT,
  decodeCursor,
  encodeCursor,
  keysetWhere,
} from '@/db/repositories/pagination';
import { REPO_ERROR, isRepoError } from '@/db/repositories/errors';

describe('encodeCursor / decodeCursor', () => {
  it('round-trips a timestamp + id', () => {
    const createdAt = '2026-09-11T10:00:00.000Z';
    const id = 'abc-123';
    expect(decodeCursor(encodeCursor(createdAt, id))).toEqual({ createdAt, id });
  });

  it('preserves ids containing hyphens (UUIDs)', () => {
    const createdAt = '2026-09-11T10:00:00.000Z';
    const id = '8f14e45f-ceea-4c0c-9a6a-000000000001';
    expect(decodeCursor(encodeCursor(createdAt, id))).toEqual({ createdAt, id });
  });
});

describe('decodeCursor', () => {
  it('throws REPO_INVALID_STATE on malformed cursors', () => {
    for (const bad of ['', 'no-separator', '|id', 'createdAt|', '|']) {
      try {
        decodeCursor(bad);
        throw new Error('expected throw');
      } catch (error) {
        expect(isRepoError(error, REPO_ERROR.INVALID_STATE)).toBe(true);
      }
    }
  });
});

describe('keysetWhere', () => {
  it('emits an empty clause with no params for the first page', () => {
    expect(keysetWhere()).toEqual({ clause: '', params: [] });
    expect(keysetWhere(undefined)).toEqual({ clause: '', params: [] });
    expect(keysetWhere(null)).toEqual({ clause: '', params: [] });
  });

  it('emits the row-value keyset predicate with decoded params', () => {
    const result = keysetWhere(encodeCursor('2026-09-11T10:00:00.000Z', 'id-1'));
    expect(result.clause).toBe('AND (created_at, id) < (?, ?)');
    expect(result.params).toEqual(['2026-09-11T10:00:00.000Z', 'id-1']);
  });

  it('qualifies the tuple columns when a qualifier is passed', () => {
    const result = keysetWhere(encodeCursor('2026-09-11T10:00:00.000Z', 'id-1'), 'ft.');
    expect(result.clause).toBe('AND (ft.created_at, ft.id) < (?, ?)');
    expect(result.params).toEqual(['2026-09-11T10:00:00.000Z', 'id-1']);
  });

  it('treats a blank qualifier like the unqualified form', () => {
    const result = keysetWhere(encodeCursor('2026-09-11T10:00:00.000Z', 'id-1'), '');
    expect(result.clause).toBe('AND (created_at, id) < (?, ?)');
  });
});

describe('DEFAULT_PAGE_LIMIT', () => {
  it('defaults to 50', () => {
    expect(DEFAULT_PAGE_LIMIT).toBe(50);
  });
});
