/**
 * @jest-environment node
 *
 * Supplier repository tests — driven by the scripted `RecordingAdapter` fake
 * (no native SQLite). These pin the exact SQL shape, parameter order, soft-
 * delete semantics, and mapper 0/1 + null coercions the repository relies on.
 */


import { getDb } from '@/db';
import { resetBusinessIdForTesting } from '@/db/repositories/business-scope';
import { REPO_ERROR, isRepoError } from '@/db/repositories/errors';
import {
  archiveSupplier,
  createSupplier,
  getSupplierById,
  listSuppliers,
  updateSupplier,
} from '@/db/repositories/supplier';
import { makeFakeDb } from '@/db/repositories/__tests__/fakes/fake-db';
import { RecordingAdapter } from '@/db/repositories/__tests__/fakes/recording-adapter';

jest.mock('@/db', () => ({ getDb: jest.fn() }));

// A full, live supplier row as SQLite would surface it (snake_case).
const supplierRow = {
  id: 'sup-1',
  business_id: 'biz-1',
  name: 'Acme Foods',
  business_name: 'Acme Foods S.A.',
  phone: '555-0100',
  email: 'orders@acme.test',
  tax_id: 'TAX-123',
  notes: 'preferred vendor',
  is_active: 1,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  archived_at: null,
};

describe('supplier repository', () => {
  let adapter: RecordingAdapter;

  beforeEach(() => {
    adapter = new RecordingAdapter();
    (getDb as jest.Mock).mockResolvedValue(makeFakeDb(adapter));
    resetBusinessIdForTesting();
  });

  describe('listSuppliers', () => {
    it('scopes by business id and excludes archived rows by default', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueAll('FROM supplier', [supplierRow]);

      const result = await listSuppliers();

      const listCall = adapter.calls.find((c) => c.sql.includes('FROM supplier'));
      expect(listCall).toBeDefined();
      expect(listCall!.params).toEqual(['biz-1']);
      expect(listCall!.sql).toContain('archived_at IS NULL');
      expect(listCall!.sql).toContain('ORDER BY name ASC');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('sup-1');
      expect(result[0].name).toBe('Acme Foods');
    });

    it('includes archived rows when includeArchived is set', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueAll('FROM supplier', []);

      await listSuppliers({ includeArchived: true });

      const listCall = adapter.calls.find((c) => c.sql.includes('FROM supplier'));
      expect(listCall).toBeDefined();
      expect(listCall!.sql).not.toContain('archived_at IS NULL');
    });

    it('applies limit and offset in order', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueAll('FROM supplier', []);

      await listSuppliers({ limit: 5, offset: 10 });

      const listCall = adapter.calls.find((c) => c.sql.includes('FROM supplier'));
      expect(listCall).toBeDefined();
      expect(listCall!.params).toEqual(['biz-1', 5, 10]);
      expect(listCall!.sql).toContain('LIMIT ?');
      expect(listCall!.sql).toContain('OFFSET ?');
    });
  });

  describe('getSupplierById', () => {
    it('maps 0/1 flags to booleans and preserves nulls', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('FROM supplier', {
        ...supplierRow,
        is_active: 0,
        business_name: null,
        phone: null,
        notes: null,
      });

      const result = await getSupplierById('sup-1');

      expect(result).not.toBeNull();
      expect(result!.isActive).toBe(false);
      expect(result!.businessName).toBeNull();
      expect(result!.phone).toBeNull();
      expect(result!.notes).toBeNull();
      expect(result!.taxId).toBe('TAX-123');
      expect(result!.businessId).toBe('biz-1');
    });

    it('maps is_active = 1 to true', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('FROM supplier', supplierRow);

      const result = await getSupplierById('sup-1');

      expect(result!.isActive).toBe(true);
    });

    it('returns null when the row is absent', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('FROM supplier', null);

      const result = await getSupplierById('missing');

      expect(result).toBeNull();
    });
  });

  describe('createSupplier', () => {
    it('inserts a business-scoped row with timestamps and returns the mapped row', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('FROM supplier', supplierRow);

      const result = await createSupplier({
        name: '  Acme Foods  ',
        businessName: 'Acme Foods S.A.',
        email: 'orders@acme.test',
      });

      const insertCall = adapter.calls.find((c) => c.sql.includes('INSERT INTO supplier'));
      expect(insertCall).toBeDefined();
      const params = insertCall!.params;
      // id, business_id, name, business_name, phone, email, tax_id, notes,
      // is_active, created_at, updated_at
      expect(params).toHaveLength(11);
      expect(params[1]).toBe('biz-1');
      expect(params[2]).toBe('Acme Foods'); // trimmed
      expect(params[3]).toBe('Acme Foods S.A.');
      expect(params[4]).toBeNull(); // phone omitted → null
      expect(params[5]).toBe('orders@acme.test');
      expect(params[6]).toBeNull(); // tax_id omitted → null
      expect(params[7]).toBeNull(); // notes omitted → null
      expect(params[8]).toBe(1); // is_active defaults to 1
      expect(typeof params[9]).toBe('string'); // created_at
      expect(params[9]).toBe(params[10]); // created_at === updated_at

      expect(result.id).toBe('sup-1');
      expect(result.businessId).toBe('biz-1');
      expect(result.isActive).toBe(true);
    });

    it('maps isActive: false to the integer 0', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('FROM supplier', { ...supplierRow, is_active: 0 });

      await createSupplier({ name: 'Dormant Co', isActive: false });

      const insertCall = adapter.calls.find((c) => c.sql.includes('INSERT INTO supplier'));
      expect(insertCall!.params[8]).toBe(0);
    });

    it('maps a UNIQUE constraint failure to REPO_DUPLICATE', async () => {
      const throwingAdapter = new RecordingAdapter();
      throwingAdapter.runAsync = async () => {
        throw new Error('UNIQUE constraint failed: supplier.business_id, supplier.name');
      };
      (getDb as jest.Mock).mockResolvedValue(makeFakeDb(throwingAdapter));
      resetBusinessIdForTesting();
      throwingAdapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });

      const error = await createSupplier({ name: 'Acme Foods' }).catch((e: unknown) => e);
      expect(isRepoError(error, REPO_ERROR.DUPLICATE)).toBe(true);
    });
  });

  describe('updateSupplier', () => {
    it('builds SET from the patch and bumps updated_at', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('FROM supplier', { ...supplierRow, phone: '555-9999' });

      const result = await updateSupplier('sup-1', { phone: '555-9999' });

      const updateCall = adapter.calls.find((c) => c.sql.includes('UPDATE supplier'));
      expect(updateCall).toBeDefined();
      expect(updateCall!.sql).toContain('phone = ?');
      expect(updateCall!.sql).toContain('updated_at = ?');
      expect(updateCall!.sql).not.toContain('name = ?');
      // params: [phone value, updated_at, id, business_id]
      const params = updateCall!.params;
      expect(params[0]).toBe('555-9999');
      expect(params[params.length - 2]).toBe('sup-1');
      expect(params[params.length - 1]).toBe('biz-1');

      expect(result.phone).toBe('555-9999');
    });

    it('throws REPO_NOT_FOUND when updating an absent row', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('FROM supplier', null);

      const error = await updateSupplier('missing', { name: 'X' }).catch((e: unknown) => e);
      expect(isRepoError(error, REPO_ERROR.NOT_FOUND)).toBe(true);
    });
  });

  describe('archiveSupplier', () => {
    it('sets archived_at and updated_at on a live row', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('SELECT id FROM supplier', { id: 'sup-1' });

      await archiveSupplier('sup-1');

      const updateCall = adapter.calls.find((c) => c.sql.includes('UPDATE supplier'));
      expect(updateCall).toBeDefined();
      expect(updateCall!.sql).toContain('archived_at = ?');
      expect(updateCall!.sql).toContain('updated_at = ?');
      // params: [archived_at, updated_at, id, business_id]
      const params = updateCall!.params;
      expect(params[0]).toBe(params[1]); // same timestamp
      expect(params[2]).toBe('sup-1');
      expect(params[3]).toBe('biz-1');
    });

    it('throws REPO_NOT_FOUND when archiving an absent row', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('SELECT id FROM supplier', null);

      const error = await archiveSupplier('missing').catch((e: unknown) => e);
      expect(isRepoError(error, REPO_ERROR.NOT_FOUND)).toBe(true);
    });
  });
});
