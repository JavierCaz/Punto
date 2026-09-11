/**
 * @jest-environment node
 *
 * Purchase repository tests — driven by the scripted `RecordingAdapter` fake
 * (no native SQLite). These pin the "money out + stock in" transaction shape:
 * createPurchase INSERTs the header + lines, posts `PURCHASE` movements, and
 * refreshes each item's weighted-average `unit_cost_minor` — all on the same
 * transaction, in order — with integer-exact line subtotal math. cancelPurchase
 * posts negated `RETURN` movements and flips the header status.
 */

import { getDb } from '@/db/client';

import { resetBusinessIdForTesting } from '@/db/repositories/business-scope';
import { REPO_ERROR, isRepoError } from '@/db/repositories/errors';
import {
  cancelPurchase,
  createPurchase,
  getPurchaseById,
  listPurchases,
} from '@/db/repositories/purchase';
import { makeFakeDb } from '@/db/repositories/__tests__/fakes/fake-db';
import { RecordingAdapter } from '@/db/repositories/__tests__/fakes/recording-adapter';

jest.mock('@/db/client', () => ({ getDb: jest.fn() }));
jest.mock('expo-crypto', () => ({ randomUUID: jest.fn(() => 'uuid-test') }));

// A full `purchase` row as SQLite would surface it (snake_case).
const purchaseRow = {
  id: 'pur-1',
  business_id: 'biz-1',
  supplier_id: 'sup-1',
  purchase_number: 'P-000001',
  subtotal_minor: 300,
  tax_minor: 0,
  discount_minor: 0,
  total_minor: 300,
  status: 'COMPLETED',
  notes: null,
  employee_id: 'emp-1',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

// A full `purchase_item` row (no business_id — scoped through its parent).
const purchaseItemRow = {
  id: 'pitem-1',
  purchase_id: 'pur-1',
  inventory_item_id: 'item-1',
  quantity: 1500,
  unit_id: 'unit-g',
  unit_cost_minor: 200,
  subtotal_minor: 300,
  created_at: '2026-01-01T00:00:00.000Z',
};

describe('purchase repository', () => {
  let adapter: RecordingAdapter;

  beforeEach(() => {
    adapter = new RecordingAdapter();
    (getDb as jest.Mock).mockResolvedValue(makeFakeDb(adapter));
    resetBusinessIdForTesting();
  });

  describe('createPurchase', () => {
    it('inserts header + line, posts a PURCHASE movement, and updates unit cost in order', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      // nextPurchaseNumber reads the current sequence, then upserts.
      adapter.queueFirst('SELECT value FROM app_metadata', { value: '5' });
      // Pre-receipt cost cache read (before the movement).
      adapter.queueFirst('SELECT current_quantity, unit_cost_minor', {
        current_quantity: 0,
        unit_cost_minor: 0,
      });
      // recordMovementWithTxn re-reads the item (for unit_id) + business flag.
      adapter.queueFirst('FROM inventory_item', {
        id: 'item-1',
        unit_id: 'unit-g',
        current_quantity: 0,
      });
      adapter.queueFirst('allow_negative_inventory', { allow_negative_inventory: 0 });
      // Select-back header + lines.
      adapter.queueFirst('FROM purchase', purchaseRow);
      adapter.queueAll('FROM purchase_item', [purchaseItemRow]);

      const result = await createPurchase({
        supplierId: 'sup-1',
        employeeId: 'emp-1',
        notes: 'restock',
        items: [{ inventoryItemId: 'item-1', quantity: 1500, unitId: 'unit-g', unitCostMinor: 200 }],
      });

      const purchaseInsert = adapter.calls.find(
        (c) => c.sql.includes('INSERT INTO purchase') && !c.sql.includes('purchase_item'),
      );
      const itemInsert = adapter.calls.find((c) => c.sql.includes('INSERT INTO purchase_item'));
      const movementInsert = adapter.calls.find((c) => c.sql.includes('INSERT INTO inventory_movement'));
      const costUpdate = adapter.calls.find(
        (c) => c.sql.includes('UPDATE inventory_item') && c.sql.includes('unit_cost_minor = ?'),
      );

      expect(purchaseInsert).toBeDefined();
      expect(itemInsert).toBeDefined();
      expect(movementInsert).toBeDefined();
      expect(costUpdate).toBeDefined();

      // Same transaction, in order: header → line → movement → cost update.
      const indices = [
        adapter.calls.indexOf(purchaseInsert!),
        adapter.calls.indexOf(itemInsert!),
        adapter.calls.indexOf(movementInsert!),
        adapter.calls.indexOf(costUpdate!),
      ];
      expect(indices).toEqual([...indices].sort((a, b) => a - b));

      // Header INSERT binds the business scope, number, integer totals, and status.
      expect(purchaseInsert!.params).toEqual([
        'uuid-test', // id
        'biz-1', // business_id
        'sup-1', // supplier_id
        'P-000006', // purchase_number (5 → 6)
        300, // subtotal_minor (1500 × 200 / 1000, integer-exact)
        0, // tax_minor (v1 pinned)
        0, // discount_minor (v1 pinned)
        300, // total_minor
        'COMPLETED', // status
        'restock', // notes
        'emp-1', // employee_id
        expect.any(String), // created_at
        expect.any(String), // updated_at
      ]);

      // Line INSERT binds the parent id + line math (integer-exact subtotal).
      expect(itemInsert!.params).toEqual([
        'uuid-test', // id
        'uuid-test', // purchase_id
        'item-1', // inventory_item_id
        1500, // quantity (milli-units)
        'unit-g', // unit_id
        200, // unit_cost_minor
        300, // subtotal_minor
        expect.any(String), // created_at
      ]);

      // Movement is a stock-in PURCHASE (positive quantity) referencing the doc.
      expect(movementInsert!.params).toEqual([
        'uuid-test', // id
        'biz-1', // business_id
        'item-1', // inventory_item_id
        'PURCHASE', // type
        1500, // quantity (positive = stock in)
        'unit-g', // unit_id ← from the item
        200, // unit_cost_minor
        null, // reason
        null, // notes
        'purchase', // reference_type
        'uuid-test', // reference_id
        'emp-1', // employee_id
        expect.any(String), // created_at
      ]);

      // Weighted average: (0×0 + 1500×200) / 1500 = 200.
      expect(costUpdate!.params).toEqual([
        200, // unit_cost_minor
        expect.any(String), // updated_at
        'item-1', // id
        'biz-1', // business_id
      ]);

      expect(result.id).toBe('pur-1');
      expect(result.items).toHaveLength(1);
      expect(result.items[0].quantity).toBe(1500);
      expect(result.items[0].subtotalMinor).toBe(300);
    });

    it('throws REPO_INVALID_STATE on empty items with no writes', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });

      const error = await createPurchase({ items: [] }).catch((e: unknown) => e);

      expect(isRepoError(error, REPO_ERROR.INVALID_STATE)).toBe(true);
      const writes = adapter.calls.filter(
        (c) => c.sql.includes('INSERT') || c.sql.includes('UPDATE'),
      );
      expect(writes).toHaveLength(0);
    });

    it('throws REPO_INVALID_STATE on a non-positive quantity with no writes', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });

      const error = await createPurchase({
        items: [{ inventoryItemId: 'item-1', quantity: 0, unitId: 'unit-g', unitCostMinor: 200 }],
      }).catch((e: unknown) => e);

      expect(isRepoError(error, REPO_ERROR.INVALID_STATE)).toBe(true);
      const writes = adapter.calls.filter(
        (c) => c.sql.includes('INSERT') || c.sql.includes('UPDATE'),
      );
      expect(writes).toHaveLength(0);
    });

    it('throws REPO_INVALID_STATE on a negative unit cost with no writes', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });

      const error = await createPurchase({
        items: [{ inventoryItemId: 'item-1', quantity: 1500, unitId: 'unit-g', unitCostMinor: -1 }],
      }).catch((e: unknown) => e);

      expect(isRepoError(error, REPO_ERROR.INVALID_STATE)).toBe(true);
      const writes = adapter.calls.filter(
        (c) => c.sql.includes('INSERT') || c.sql.includes('UPDATE'),
      );
      expect(writes).toHaveLength(0);
    });
  });

  describe('cancelPurchase', () => {
    it('posts negated RETURN movements and flips the header to CANCELLED', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('FROM purchase', purchaseRow);
      adapter.queueAll('FROM purchase_item', [purchaseItemRow]);
      // The RETURN movement reads the item + business flag.
      adapter.queueFirst('FROM inventory_item', {
        id: 'item-1',
        unit_id: 'unit-g',
        current_quantity: 2000,
      });
      adapter.queueFirst('allow_negative_inventory', { allow_negative_inventory: 0 });
      // Recomputed unit cost reads remaining COMPLETED purchases (none left → 0).
      adapter.queueFirst('SUM(pi.quantity', { total_cost: 0, total_qty: 0 });

      await cancelPurchase('pur-1');

      const movementInsert = adapter.calls.find((c) => c.sql.includes('INSERT INTO inventory_movement'));
      expect(movementInsert).toBeDefined();
      expect(movementInsert!.params[3]).toBe('RETURN');
      expect(movementInsert!.params[4]).toBe(-1500); // negated quantity
      expect(movementInsert!.params[9]).toBe('purchase'); // reference_type
      expect(movementInsert!.params[10]).toBe('pur-1'); // reference_id

      const statusUpdate = adapter.calls.find((c) => c.sql.includes('UPDATE purchase'));
      expect(statusUpdate).toBeDefined();
      expect(statusUpdate!.params).toEqual([
        'CANCELLED', // status
        expect.any(String), // updated_at
        'pur-1', // id
        'biz-1', // business_id
      ]);

      // Cancellation also recomputes the item's weighted-average unit cost.
      const costUpdate = adapter.calls.find(
        (c) => c.sql.includes('UPDATE inventory_item') && c.sql.includes('unit_cost_minor = ?'),
      );
      expect(costUpdate).toBeDefined();
      // No remaining COMPLETED purchases → unit cost resets to 0.
      expect(costUpdate!.params).toEqual([0, expect.any(String), 'item-1', 'biz-1']);
    });

    it('recomputes the weighted-average unit cost from remaining COMPLETED purchases', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('FROM purchase', purchaseRow);
      adapter.queueAll('FROM purchase_item', [purchaseItemRow]);
      adapter.queueFirst('FROM inventory_item', {
        id: 'item-1',
        unit_id: 'unit-g',
        current_quantity: 2000,
      });
      adapter.queueFirst('allow_negative_inventory', { allow_negative_inventory: 0 });
      // One other COMPLETED purchase still holds 3000 milli-units at 600000 total cost.
      adapter.queueFirst('SUM(pi.quantity', { total_cost: 600000, total_qty: 3000 });

      await cancelPurchase('pur-1');

      const costUpdate = adapter.calls.find(
        (c) => c.sql.includes('UPDATE inventory_item') && c.sql.includes('unit_cost_minor = ?'),
      );
      expect(costUpdate).toBeDefined();
      // Weighted average 600000 / 3000 = 200 (integer minor units).
      expect(costUpdate!.params).toEqual([200, expect.any(String), 'item-1', 'biz-1']);
    });

    it('throws REPO_INVALID_STATE when the purchase is not COMPLETED', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('FROM purchase', { ...purchaseRow, status: 'CANCELLED' });
      adapter.queueAll('FROM purchase_item', [purchaseItemRow]);

      const error = await cancelPurchase('pur-1').catch((e: unknown) => e);

      expect(isRepoError(error, REPO_ERROR.INVALID_STATE)).toBe(true);
      const movementInsert = adapter.calls.find((c) => c.sql.includes('INSERT INTO inventory_movement'));
      expect(movementInsert).toBeUndefined();
      const statusUpdate = adapter.calls.find((c) => c.sql.includes('UPDATE purchase'));
      expect(statusUpdate).toBeUndefined();
    });

    it('throws REPO_NOT_FOUND when the purchase is missing', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('FROM purchase', null);

      const error = await cancelPurchase('missing').catch((e: unknown) => e);

      expect(isRepoError(error, REPO_ERROR.NOT_FOUND)).toBe(true);
    });
  });

  describe('getPurchaseById', () => {
    it('maps the header and its items', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('FROM purchase', purchaseRow);
      adapter.queueAll('FROM purchase_item', [purchaseItemRow]);

      const result = await getPurchaseById('pur-1');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('pur-1');
      expect(result!.status).toBe('COMPLETED');
      expect(result!.supplierId).toBe('sup-1');
      expect(result!.items).toHaveLength(1);
      expect(result!.items[0].quantity).toBe(1500);
      expect(result!.items[0].inventoryItemId).toBe('item-1');
    });

    it('returns null when the purchase is absent', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('FROM purchase', null);

      const result = await getPurchaseById('missing');

      expect(result).toBeNull();
    });
  });

  describe('listPurchases', () => {
    const fullPage = Array.from({ length: 50 }, (_, i) => ({
      ...purchaseRow,
      id: `pur-${i}`,
      created_at: `2026-01-01T00:00:${String(i).padStart(2, '0')}.000Z`,
    }));

    it('emits DESC ordering, keyset clause, filters, and nextCursor on a full page', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueAll('FROM purchase', fullPage);

      const result = await listPurchases({
        status: 'COMPLETED',
        supplierId: 'sup-1',
        from: '2026-01-01T00:00:00.000Z',
        to: '2026-02-01T00:00:00.000Z',
        cursor: '2026-01-02T00:00:00.000Z|pur-x',
      });

      const call = adapter.calls.find((c) => c.sql.includes('FROM purchase'));
      expect(call).toBeDefined();
      expect(call!.sql).toContain('ORDER BY created_at DESC, id DESC');
      expect(call!.sql).toContain('(created_at, id) < (?, ?)');
      expect(call!.sql).toContain('status = ?');
      expect(call!.sql).toContain('supplier_id = ?');
      expect(call!.sql).toContain('created_at >= ?');
      expect(call!.sql).toContain('created_at <= ?');
      // params: [businessId, status, supplierId, from, to, cursorCreatedAt, cursorId, limit]
      expect(call!.params).toEqual([
        'biz-1',
        'COMPLETED',
        'sup-1',
        '2026-01-01T00:00:00.000Z',
        '2026-02-01T00:00:00.000Z',
        '2026-01-02T00:00:00.000Z',
        'pur-x',
        50,
      ]);

      expect(result.items).toHaveLength(50);
      // Full page → cursor encoded from the last row's (created_at, id).
      expect(result.nextCursor).toBe('2026-01-01T00:00:49.000Z|pur-49');
    });

    it('returns null nextCursor on a partial page and omits the keyset clause without a cursor', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueAll('FROM purchase', [purchaseRow]);

      const result = await listPurchases();

      const call = adapter.calls.find((c) => c.sql.includes('FROM purchase'));
      expect(call!.sql).not.toContain('(created_at, id) <');
      expect(call!.sql).toContain('ORDER BY created_at DESC, id DESC');
      expect(call!.params).toEqual(['biz-1', 50]);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('pur-1');
      expect(result.items[0].status).toBe('COMPLETED');
      expect(result.nextCursor).toBeNull();
    });
  });
});
