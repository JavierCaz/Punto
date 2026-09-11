/**
 * @jest-environment node
 *
 * Supplier ⇄ item link repository tests — driven by the scripted
 * `RecordingAdapter` fake (no native SQLite). These pin the supplier-join
 * business scoping (the table has no business_id of its own), the ON CONFLICT
 * upsert shape, the non-negative price validation, the null/price mapper
 * coercions, and the hard-delete NOT_FOUND semantics.
 */

import { getDb } from '@/db/client';
import { resetBusinessIdForTesting } from '@/db/repositories/business-scope';
import { REPO_ERROR, isRepoError } from '@/db/repositories/errors';
import {
  deleteSupplierItem,
  getSupplierItemById,
  listSupplierItems,
  upsertSupplierItem,
} from '@/db/repositories/supplier-item';
import { makeFakeDb } from '@/db/repositories/__tests__/fakes/fake-db';
import { RecordingAdapter } from '@/db/repositories/__tests__/fakes/recording-adapter';

jest.mock('@/db/client', () => ({ getDb: jest.fn() }));
jest.mock('expo-crypto', () => ({ randomUUID: jest.fn(() => 'uuid-test') }));

// A full supplier_item row as SQLite would surface it (snake_case).
const supplierItemRow = {
  id: 'si-1',
  supplier_id: 'sup-1',
  inventory_item_id: 'item-1',
  supplier_sku: 'ACME-001',
  purchase_price_minor: 1250,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

describe('supplier item repository', () => {
  let adapter: RecordingAdapter;

  beforeEach(() => {
    adapter = new RecordingAdapter();
    (getDb as jest.Mock).mockResolvedValue(makeFakeDb(adapter));
    resetBusinessIdForTesting();
  });

  describe('listSupplierItems', () => {
    it('scopes through the supplier join, ordered by created_at ASC', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueAll('FROM supplier_item', [supplierItemRow]);

      const result = await listSupplierItems('sup-1');

      const listCall = adapter.calls.find((c) => c.sql.includes('FROM supplier_item'));
      expect(listCall).toBeDefined();
      // supplier_id first, then the joined business scope.
      expect(listCall!.params).toEqual(['sup-1', 'biz-1']);
      expect(listCall!.sql).toContain('JOIN supplier s ON s.id = si.supplier_id');
      expect(listCall!.sql).toContain('si.supplier_id = ?');
      expect(listCall!.sql).toContain('s.business_id = ?');
      expect(listCall!.sql).toContain('ORDER BY si.created_at ASC');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('si-1');
      expect(result[0].supplierId).toBe('sup-1');
      expect(result[0].inventoryItemId).toBe('item-1');
    });
  });

  describe('getSupplierItemById', () => {
    it('maps sku/price and preserves nulls', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('FROM supplier_item', {
        ...supplierItemRow,
        supplier_sku: null,
        purchase_price_minor: 0,
      });

      const result = await getSupplierItemById('si-1');

      expect(result).not.toBeNull();
      expect(result!.supplierSku).toBeNull();
      expect(result!.purchasePriceMinor).toBe(0);
      expect(result!.supplierId).toBe('sup-1');
      expect(result!.inventoryItemId).toBe('item-1');
    });

    it('scopes through the supplier join', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('FROM supplier_item', supplierItemRow);

      await getSupplierItemById('si-1');

      const getCall = adapter.calls.find((c) => c.sql.includes('FROM supplier_item'));
      expect(getCall).toBeDefined();
      expect(getCall!.params).toEqual(['si-1', 'biz-1']);
      expect(getCall!.sql).toContain('JOIN supplier s ON s.id = si.supplier_id');
    });

    it('returns null when the row is absent', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('FROM supplier_item', null);

      const result = await getSupplierItemById('missing');

      expect(result).toBeNull();
    });
  });

  describe('upsertSupplierItem', () => {
    it('emits ON CONFLICT DO UPDATE and returns the mapped row', async () => {
      adapter.queueFirst('FROM supplier_item', supplierItemRow);

      const result = await upsertSupplierItem({
        supplierId: 'sup-1',
        inventoryItemId: 'item-1',
        supplierSku: 'ACME-001',
        purchasePriceMinor: 1250,
      });

      const insertCall = adapter.calls.find((c) =>
        c.sql.includes('INSERT INTO supplier_item'),
      );
      expect(insertCall).toBeDefined();
      expect(insertCall!.sql).toContain(
        'ON CONFLICT (supplier_id, inventory_item_id) DO UPDATE',
      );
      expect(insertCall!.sql).toContain('supplier_sku = excluded.supplier_sku');
      expect(insertCall!.sql).toContain(
        'purchase_price_minor = excluded.purchase_price_minor',
      );
      expect(insertCall!.sql).toContain('updated_at = excluded.updated_at');

      const params = insertCall!.params;
      // id, supplier_id, inventory_item_id, supplier_sku, purchase_price_minor,
      // created_at, updated_at
      expect(params).toHaveLength(7);
      expect(params[0]).toBe('uuid-test');
      expect(params[1]).toBe('sup-1');
      expect(params[2]).toBe('item-1');
      expect(params[3]).toBe('ACME-001');
      expect(params[4]).toBe(1250);
      expect(typeof params[5]).toBe('string');
      expect(params[5]).toBe(params[6]);

      expect(result.id).toBe('si-1');
      expect(result.supplierId).toBe('sup-1');
      expect(result.inventoryItemId).toBe('item-1');
      expect(result.purchasePriceMinor).toBe(1250);
    });

    it('defaults null sku and 0 price when omitted', async () => {
      adapter.queueFirst('FROM supplier_item', {
        ...supplierItemRow,
        supplier_sku: null,
        purchase_price_minor: 0,
      });

      await upsertSupplierItem({ supplierId: 'sup-1', inventoryItemId: 'item-1' });

      const insertCall = adapter.calls.find((c) =>
        c.sql.includes('INSERT INTO supplier_item'),
      );
      expect(insertCall!.params[3]).toBeNull();
      expect(insertCall!.params[4]).toBe(0);
    });

    it('throws REPO_INVALID_STATE on negative price with no writes', async () => {
      const error = await upsertSupplierItem({
        supplierId: 'sup-1',
        inventoryItemId: 'item-1',
        purchasePriceMinor: -1,
      }).catch((e: unknown) => e);

      expect(isRepoError(error, REPO_ERROR.INVALID_STATE)).toBe(true);
      const insertCall = adapter.calls.find((c) =>
        c.sql.includes('INSERT INTO supplier_item'),
      );
      expect(insertCall).toBeUndefined();
    });
  });

  describe('deleteSupplierItem', () => {
    it('hard-deletes by id after a scoped existence check', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('SELECT si.id FROM supplier_item', { id: 'si-1' });

      await deleteSupplierItem('si-1');

      const existenceCall = adapter.calls.find((c) =>
        c.sql.includes('SELECT si.id FROM supplier_item'),
      );
      expect(existenceCall).toBeDefined();
      expect(existenceCall!.params).toEqual(['si-1', 'biz-1']);
      expect(existenceCall!.sql).toContain('JOIN supplier s ON s.id = si.supplier_id');

      const deleteCall = adapter.calls.find((c) =>
        c.sql.includes('DELETE FROM supplier_item'),
      );
      expect(deleteCall).toBeDefined();
      expect(deleteCall!.params).toEqual(['si-1']);
    });

    it('throws REPO_NOT_FOUND when the row is absent', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('SELECT si.id FROM supplier_item', null);

      const error = await deleteSupplierItem('missing').catch((e: unknown) => e);
      expect(isRepoError(error, REPO_ERROR.NOT_FOUND)).toBe(true);
    });
  });
});
