/**
 * @jest-environment node
 *
 * Inventory item repository tests — driven by the scripted `RecordingAdapter`
 * fake (no native SQLite). In addition to the standard CRUD/soft-delete shape,
 * these tests pin the ledger-cache invariant: `current_quantity` is inserted as
 * `0` on create and can NEVER appear in an update's SET clause.
 */


import { getDb } from '@/db';
import { resetBusinessIdForTesting } from '@/db/repositories/business-scope';
import { REPO_ERROR, isRepoError } from '@/db/repositories/errors';
import {
  archiveInventoryItem,
  createInventoryItem,
  getInventoryItemById,
  listInventoryItems,
  listLowStockItems,
  updateInventoryItem,
} from '@/db/repositories/inventory-item';
import { makeFakeDb } from '@/db/repositories/__tests__/fakes/fake-db';
import { RecordingAdapter } from '@/db/repositories/__tests__/fakes/recording-adapter';

jest.mock('@/db', () => ({ getDb: jest.fn() }));

// A full, live inventory item row as SQLite would surface it (snake_case).
const itemRow = {
  id: 'item-1',
  business_id: 'biz-1',
  name: 'Whole Milk',
  description: 'fresh whole milk',
  image_uri: null,
  unit_id: 'unit-ml',
  current_quantity: 500,
  minimum_quantity: 100,
  unit_cost_minor: 250,
  is_active: 1,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  archived_at: null,
};

describe('inventory item repository', () => {
  let adapter: RecordingAdapter;

  beforeEach(() => {
    adapter = new RecordingAdapter();
    (getDb as jest.Mock).mockResolvedValue(makeFakeDb(adapter));
    resetBusinessIdForTesting();
  });

  describe('listInventoryItems', () => {
    it('scopes by business id and excludes archived rows by default', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueAll('FROM inventory_item', [itemRow]);

      const result = await listInventoryItems();

      const listCall = adapter.calls.find((c) => c.sql.includes('FROM inventory_item'));
      expect(listCall).toBeDefined();
      expect(listCall!.params).toEqual(['biz-1']);
      expect(listCall!.sql).toContain('archived_at IS NULL');
      expect(listCall!.sql).toContain('ORDER BY name ASC');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('item-1');
    });

    it('includes archived rows when includeArchived is set', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueAll('FROM inventory_item', []);

      await listInventoryItems({ includeArchived: true });

      const listCall = adapter.calls.find((c) => c.sql.includes('FROM inventory_item'));
      expect(listCall!.sql).not.toContain('archived_at IS NULL');
    });

    it('applies limit and offset in order', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueAll('FROM inventory_item', []);

      await listInventoryItems({ limit: 3, offset: 7 });

      const listCall = adapter.calls.find((c) => c.sql.includes('FROM inventory_item'));
      expect(listCall!.params).toEqual(['biz-1', 3, 7]);
      expect(listCall!.sql).toContain('LIMIT ?');
      expect(listCall!.sql).toContain('OFFSET ?');
    });
  });

  describe('getInventoryItemById', () => {
    it('maps quantities, unit, and 0/1 flags, preserving nulls', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('FROM inventory_item', {
        ...itemRow,
        is_active: 0,
        image_uri: null,
      });

      const result = await getInventoryItemById('item-1');

      expect(result).not.toBeNull();
      expect(result!.isActive).toBe(false);
      expect(result!.imageUri).toBeNull();
      expect(result!.unitId).toBe('unit-ml');
      expect(result!.currentQuantity).toBe(500);
      expect(result!.minimumQuantity).toBe(100);
      expect(result!.unitCostMinor).toBe(250);
      expect(result!.businessId).toBe('biz-1');
    });

    it('returns null when the row is absent', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('FROM inventory_item', null);

      const result = await getInventoryItemById('missing');

      expect(result).toBeNull();
    });
  });

  describe('listLowStockItems', () => {
    it('emits the low-stock predicate, ordered by current_quantity ASC', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueAll('FROM inventory_item', []);

      await listLowStockItems();

      const call = adapter.calls.find((c) => c.sql.includes('FROM inventory_item'));
      expect(call).toBeDefined();
      expect(call!.params).toEqual(['biz-1']);
      expect(call!.sql).toContain('archived_at IS NULL');
      expect(call!.sql).toContain('is_active = 1');
      expect(call!.sql).toContain('minimum_quantity > 0');
      expect(call!.sql).toContain('current_quantity <= minimum_quantity');
      expect(call!.sql).toContain('ORDER BY current_quantity ASC');
    });
  });

  describe('createInventoryItem', () => {
    it('inserts a business-scoped row with current_quantity = 0', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('FROM inventory_item', itemRow);

      const result = await createInventoryItem({ name: 'Whole Milk', unitId: 'unit-ml' });

      const insertCall = adapter.calls.find((c) => c.sql.includes('INSERT INTO inventory_item'));
      expect(insertCall).toBeDefined();
      const params = insertCall!.params;
      // id, business_id, name, description, image_uri, unit_id,
      // current_quantity, minimum_quantity, unit_cost_minor, is_active,
      // created_at, updated_at
      expect(params).toHaveLength(12);
      expect(params[1]).toBe('biz-1');
      expect(params[2]).toBe('Whole Milk');
      expect(params[3]).toBeNull(); // description omitted → null
      expect(params[4]).toBeNull(); // image_uri omitted → null
      expect(params[5]).toBe('unit-ml');
      expect(params[6]).toBe(0); // current_quantity is ALWAYS 0 on create
      expect(params[7]).toBe(0); // minimum_quantity defaults to 0
      expect(params[8]).toBe(0); // unit_cost_minor defaults to 0
      expect(params[9]).toBe(1); // is_active defaults to 1
      expect(typeof params[10]).toBe('string');
      expect(params[10]).toBe(params[11]);

      expect(result.currentQuantity).toBe(500); // select-back reflects the row
      expect(result.unitCostMinor).toBe(250);
    });

    it('maps isActive: false to the integer 0', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('FROM inventory_item', { ...itemRow, is_active: 0 });

      await createInventoryItem({ name: 'Dormant', unitId: 'unit-ml', isActive: false });

      const insertCall = adapter.calls.find((c) => c.sql.includes('INSERT INTO inventory_item'));
      expect(insertCall!.params[9]).toBe(0);
    });

    it('maps a UNIQUE constraint failure to REPO_DUPLICATE', async () => {
      const throwingAdapter = new RecordingAdapter();
      throwingAdapter.runAsync = async () => {
        throw new Error(
          'UNIQUE constraint failed: inventory_item.business_id, inventory_item.name',
        );
      };
      (getDb as jest.Mock).mockResolvedValue(makeFakeDb(throwingAdapter));
      resetBusinessIdForTesting();
      throwingAdapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });

      const error = await createInventoryItem({ name: 'Whole Milk', unitId: 'unit-ml' }).catch(
        (e: unknown) => e,
      );
      expect(isRepoError(error, REPO_ERROR.DUPLICATE)).toBe(true);
    });
  });

  describe('updateInventoryItem', () => {
    it('builds SET from the patch and never emits current_quantity', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('FROM inventory_item', { ...itemRow, name: 'New Name' });

      const result = await updateInventoryItem('item-1', { name: 'New Name' });

      const updateCall = adapter.calls.find((c) => c.sql.includes('UPDATE inventory_item'));
      expect(updateCall).toBeDefined();
      expect(updateCall!.sql).toContain('name = ?');
      expect(updateCall!.sql).toContain('updated_at = ?');
      // CRITICAL: the ledger-owned cache column must never be written here.
      expect(updateCall!.sql).not.toContain('current_quantity');
      expect(updateCall!.params).not.toContain('current_quantity');
      // params: [name value, updated_at, id, business_id]
      const params = updateCall!.params;
      expect(params[0]).toBe('New Name');
      expect(params[params.length - 2]).toBe('item-1');
      expect(params[params.length - 1]).toBe('biz-1');

      expect(result.name).toBe('New Name');
    });

    it('throws REPO_NOT_FOUND when updating an absent row', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('FROM inventory_item', null);

      const error = await updateInventoryItem('missing', { name: 'X' }).catch((e: unknown) => e);
      expect(isRepoError(error, REPO_ERROR.NOT_FOUND)).toBe(true);
    });
  });

  describe('archiveInventoryItem', () => {
    it('sets archived_at and updated_at on a live row', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('SELECT id FROM inventory_item', { id: 'item-1' });

      await archiveInventoryItem('item-1');

      const updateCall = adapter.calls.find((c) => c.sql.includes('UPDATE inventory_item'));
      expect(updateCall).toBeDefined();
      expect(updateCall!.sql).toContain('archived_at = ?');
      expect(updateCall!.sql).toContain('updated_at = ?');
      const params = updateCall!.params;
      expect(params[0]).toBe(params[1]);
      expect(params[2]).toBe('item-1');
      expect(params[3]).toBe('biz-1');
    });

    it('throws REPO_NOT_FOUND when archiving an absent row', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('SELECT id FROM inventory_item', null);

      const error = await archiveInventoryItem('missing').catch((e: unknown) => e);
      expect(isRepoError(error, REPO_ERROR.NOT_FOUND)).toBe(true);
    });
  });
});
