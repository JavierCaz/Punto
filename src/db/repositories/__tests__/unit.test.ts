/**
 * @jest-environment node
 *
 * Unit-of-measure repository tests — driven by the scripted `RecordingAdapter`
 * fake (no native SQLite). These pin the exact SQL shape, parameter order,
 * active/inactive semantics, the `type` validation, and mapper 0/1 + null
 * coercions the repository relies on.
 *
 * Note: the `unit` table has no `archived_at` column (reference data), so
 * "removal" is expressed as `is_active = 0` rather than soft-delete.
 */

import { getDb } from '@/db/client';
import { resetBusinessIdForTesting } from '@/db/repositories/business-scope';
import { REPO_ERROR, isRepoError } from '@/db/repositories/errors';
import {
  createUnit,
  ensureDefaultUnits,
  getUnitById,
  listUnits,
  updateUnit,
} from '@/db/repositories/unit';
import { makeFakeDb } from '@/db/repositories/__tests__/fakes/fake-db';
import { RecordingAdapter } from '@/db/repositories/__tests__/fakes/recording-adapter';
import type { UnitType } from '@/db/repositories/types';

jest.mock('@/db/client', () => ({ getDb: jest.fn() }));

// A full, active unit row as SQLite would surface it (snake_case).
const unitRow = {
  id: 'unit-1',
  business_id: 'biz-1',
  name: 'gramo',
  symbol: 'g',
  type: 'weight',
  is_active: 1,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

describe('unit repository', () => {
  let adapter: RecordingAdapter;

  beforeEach(() => {
    adapter = new RecordingAdapter();
    (getDb as jest.Mock).mockResolvedValue(makeFakeDb(adapter));
    resetBusinessIdForTesting();
  });

  describe('listUnits', () => {
    it('scopes by business id and excludes inactive rows by default', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueAll('FROM unit', [unitRow]);

      const result = await listUnits();

      const listCall = adapter.calls.find((c) => c.sql.includes('FROM unit'));
      expect(listCall).toBeDefined();
      expect(listCall!.params).toEqual(['biz-1']);
      expect(listCall!.sql).toContain('is_active = 1');
      expect(listCall!.sql).not.toContain('archived_at');
      expect(listCall!.sql).toContain('ORDER BY name ASC');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('unit-1');
      expect(result[0].name).toBe('gramo');
      expect(result[0].type).toBe('weight');
    });

    it('includes inactive rows when includeInactive is set', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueAll('FROM unit', []);

      await listUnits({ includeInactive: true });

      const listCall = adapter.calls.find((c) => c.sql.includes('FROM unit'));
      expect(listCall).toBeDefined();
      expect(listCall!.sql).not.toContain('is_active = 1');
    });

    it('applies limit and offset in order', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueAll('FROM unit', []);

      await listUnits({ limit: 5, offset: 10 });

      const listCall = adapter.calls.find((c) => c.sql.includes('FROM unit'));
      expect(listCall).toBeDefined();
      expect(listCall!.params).toEqual(['biz-1', 5, 10]);
      expect(listCall!.sql).toContain('LIMIT ?');
      expect(listCall!.sql).toContain('OFFSET ?');
    });
  });

  describe('getUnitById', () => {
    it('maps 0/1 flags to booleans', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('FROM unit', { ...unitRow, is_active: 0 });

      const result = await getUnitById('unit-1');

      expect(result).not.toBeNull();
      expect(result!.isActive).toBe(false);
      expect(result!.businessId).toBe('biz-1');
      expect(result!.type).toBe('weight');
    });

    it('maps is_active = 1 to true', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('FROM unit', unitRow);

      const result = await getUnitById('unit-1');

      expect(result!.isActive).toBe(true);
    });

    it('returns null when the row is absent', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('FROM unit', null);

      const result = await getUnitById('missing');

      expect(result).toBeNull();
    });

    it('throws REPO_INVALID_STATE on an unexpected type in the DB', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('FROM unit', { ...unitRow, type: 'bogus' });

      const error = await getUnitById('unit-1').catch((e: unknown) => e);
      expect(isRepoError(error, REPO_ERROR.INVALID_STATE)).toBe(true);
    });
  });

  describe('createUnit', () => {
    it('inserts a business-scoped row with timestamps and returns the mapped row', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('FROM unit', unitRow);

      const result = await createUnit({
        name: '  gramo  ',
        symbol: ' g ',
        type: 'weight',
      });

      const insertCall = adapter.calls.find((c) => c.sql.includes('INSERT INTO unit'));
      expect(insertCall).toBeDefined();
      const params = insertCall!.params;
      // id, business_id, name, symbol, type, is_active, created_at, updated_at
      expect(params).toHaveLength(8);
      expect(params[1]).toBe('biz-1');
      expect(params[2]).toBe('gramo'); // trimmed
      expect(params[3]).toBe('g'); // trimmed
      expect(params[4]).toBe('weight');
      expect(params[5]).toBe(1); // is_active defaults to 1
      expect(typeof params[6]).toBe('string'); // created_at
      expect(params[6]).toBe(params[7]); // created_at === updated_at

      expect(result.id).toBe('unit-1');
      expect(result.businessId).toBe('biz-1');
      expect(result.type).toBe('weight');
      expect(result.isActive).toBe(true);
    });

    it('maps isActive: false to the integer 0', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('FROM unit', { ...unitRow, is_active: 0 });

      await createUnit({ name: 'pieza', symbol: 'pza', type: 'count', isActive: false });

      const insertCall = adapter.calls.find((c) => c.sql.includes('INSERT INTO unit'));
      expect(insertCall!.params[5]).toBe(0);
    });

    it('maps a UNIQUE constraint failure to REPO_DUPLICATE', async () => {
      const throwingAdapter = new RecordingAdapter();
      throwingAdapter.runAsync = async () => {
        throw new Error('UNIQUE constraint failed: unit.business_id, unit.symbol');
      };
      (getDb as jest.Mock).mockResolvedValue(makeFakeDb(throwingAdapter));
      resetBusinessIdForTesting();
      throwingAdapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });

      const error = await createUnit({ name: 'gramo', symbol: 'g', type: 'weight' }).catch(
        (e: unknown) => e,
      );
      expect(isRepoError(error, REPO_ERROR.DUPLICATE)).toBe(true);
    });

    it('throws REPO_INVALID_STATE on an invalid type at create time', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });

      const error = await createUnit({
        name: 'x',
        symbol: 'x',
        type: 'bogus' as UnitType,
      }).catch((e: unknown) => e);
      expect(isRepoError(error, REPO_ERROR.INVALID_STATE)).toBe(true);
    });
  });

  describe('updateUnit', () => {
    it('builds SET from the patch and bumps updated_at', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('SELECT id FROM unit', { id: 'unit-1' });
      adapter.queueFirst('FROM unit', { ...unitRow, symbol: 'gr' });

      const result = await updateUnit('unit-1', { symbol: 'gr' });

      const updateCall = adapter.calls.find((c) => c.sql.includes('UPDATE unit'));
      expect(updateCall).toBeDefined();
      expect(updateCall!.sql).toContain('symbol = ?');
      expect(updateCall!.sql).toContain('updated_at = ?');
      expect(updateCall!.sql).not.toContain('name = ?');
      // params: [symbol value, updated_at, id, business_id]
      const params = updateCall!.params;
      expect(params[0]).toBe('gr');
      expect(params[params.length - 2]).toBe('unit-1');
      expect(params[params.length - 1]).toBe('biz-1');

      expect(result.symbol).toBe('gr');
    });

    it('deactivates a unit via isActive: false', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('SELECT id FROM unit', { id: 'unit-1' });
      adapter.queueFirst('FROM unit', { ...unitRow, is_active: 0 });

      const result = await updateUnit('unit-1', { isActive: false });

      const updateCall = adapter.calls.find((c) => c.sql.includes('UPDATE unit'));
      expect(updateCall!.sql).toContain('is_active = ?');
      expect(updateCall!.params[0]).toBe(0);
      expect(result.isActive).toBe(false);
    });

    it('throws REPO_INVALID_STATE on an invalid type at update time', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });

      const error = await updateUnit('unit-1', { type: 'bogus' as UnitType }).catch(
        (e: unknown) => e,
      );
      expect(isRepoError(error, REPO_ERROR.INVALID_STATE)).toBe(true);
    });

    it('throws REPO_NOT_FOUND when updating an absent row', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('SELECT id FROM unit', null);

      const error = await updateUnit('missing', { name: 'X' }).catch((e: unknown) => e);
      expect(isRepoError(error, REPO_ERROR.NOT_FOUND)).toBe(true);
    });
  });

  describe('ensureDefaultUnits', () => {
    const gramRow = { ...unitRow, id: 'unit-g', name: 'Gramo', symbol: 'g', type: 'weight' };
    const mlRow = { ...unitRow, id: 'unit-ml', name: 'Mililitro', symbol: 'ml', type: 'volume' };
    const countRow = { ...unitRow, id: 'unit-count', name: 'Unidad', symbol: 'unit', type: 'count' };

    it('seeds the three default units when none exist', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      // g / ml / unit existence checks all miss.
      adapter.queueFirst('SELECT id FROM unit', null);
      adapter.queueFirst('FROM unit WHERE id', gramRow); // g select-back
      adapter.queueFirst('SELECT id FROM unit', null);
      adapter.queueFirst('FROM unit WHERE id', mlRow); // ml select-back
      adapter.queueFirst('SELECT id FROM unit', null);
      adapter.queueFirst('FROM unit WHERE id', countRow); // unit select-back
      adapter.queueAll('FROM unit', [gramRow, mlRow, countRow]); // final listUnits

      const result = await ensureDefaultUnits();

      const inserts = adapter.calls.filter((c) => c.sql.includes('INSERT INTO unit'));
      expect(inserts).toHaveLength(3);
      // params: [id, business_id, name, symbol, type, is_active, created_at, updated_at]
      expect(inserts.map((c) => c.params[3])).toEqual(['g', 'ml', 'unit']);
      expect(inserts.map((c) => c.params[4])).toEqual(['weight', 'volume', 'count']);
      for (const ins of inserts) {
        expect(ins.params[1]).toBe('biz-1');
        expect(ins.params[5]).toBe(1); // is_active defaults true
      }

      expect(result).toHaveLength(3);
      expect(result.map((u) => u.symbol)).toEqual(['g', 'ml', 'unit']);
    });

    it('is idempotent: existing defaults issue no INSERT', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('SELECT id FROM unit', { id: 'unit-g' });
      adapter.queueFirst('SELECT id FROM unit', { id: 'unit-ml' });
      adapter.queueFirst('SELECT id FROM unit', { id: 'unit-count' });
      adapter.queueAll('FROM unit', [gramRow, mlRow, countRow]);

      const result = await ensureDefaultUnits();

      expect(adapter.calls.some((c) => c.sql.includes('INSERT INTO unit'))).toBe(false);
      expect(result).toHaveLength(3);
    });
  });
});
