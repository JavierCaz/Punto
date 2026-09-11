/**
 * @jest-environment node
 *
 * Inventory movement repository tests — driven by the scripted
 * `RecordingAdapter` fake (no native SQLite). These pin the central stock
 * invariant: every `inventory_movement` INSERT is accompanied, in the SAME
 * transaction, by the `inventory_item.current_quantity` cache UPDATE, and the
 * cache is written from nowhere else.
 */

import { getDb } from '@/db';

import { resetBusinessIdForTesting } from '@/db/repositories/business-scope';
import { REPO_ERROR, isRepoError } from '@/db/repositories/errors';
import {
  adjustQuantity,
  listMovements,
  reconcileItemFromLedger,
  recordMovement,
  recordMovementWithTxn,
} from '@/db/repositories/movement';
import type { MovementType } from '@/db/repositories/types';
import { makeFakeDb } from '@/db/repositories/__tests__/fakes/fake-db';
import { RecordingAdapter } from '@/db/repositories/__tests__/fakes/recording-adapter';

jest.mock('@/db', () => ({ getDb: jest.fn() }));
jest.mock('expo-crypto', () => ({ randomUUID: jest.fn(() => 'uuid-test') }));

/** A single canonical ledger row as SQLite would surface it (snake_case). */
const movementRow = {
  id: 'mov-1',
  business_id: 'biz-1',
  inventory_item_id: 'item-1',
  type: 'SALE',
  quantity: -200,
  unit_id: 'unit-ml',
  unit_cost_minor: 150,
  reason: 'sold',
  notes: null,
  reference_type: 'sale',
  reference_id: 'sale-1',
  employee_id: 'emp-1',
  created_at: '2026-01-01T00:00:00.000Z',
};

describe('inventory movement repository', () => {
  let adapter: RecordingAdapter;

  beforeEach(() => {
    adapter = new RecordingAdapter();
    (getDb as jest.Mock).mockResolvedValue(makeFakeDb(adapter));
    resetBusinessIdForTesting();
  });

  describe('recordMovementWithTxn', () => {
    it('inserts a movement and updates the cache in the same transaction', async () => {
      adapter.queueFirst('FROM inventory_item', {
        id: 'item-1',
        unit_id: 'unit-ml',
        current_quantity: 500,
      });
      adapter.queueFirst('allow_negative_inventory', { allow_negative_inventory: 0 });

      await recordMovementWithTxn(adapter, 'biz-1', {
        inventoryItemId: 'item-1',
        type: 'SALE',
        quantity: -200,
        unitCostMinor: 150,
        reason: 'sold',
        referenceType: 'sale',
        referenceId: 'sale-1',
        employeeId: 'emp-1',
      });

      const insertCall = adapter.calls.find((c) => c.sql.includes('INSERT INTO inventory_movement'));
      const updateCall = adapter.calls.find((c) => c.sql.includes('UPDATE inventory_item'));
      expect(insertCall).toBeDefined();
      expect(updateCall).toBeDefined();

      // Both writes are in the SAME transaction and adjacent (INSERT first).
      const insertIndex = adapter.calls.indexOf(insertCall!);
      const updateIndex = adapter.calls.indexOf(updateCall!);
      expect(updateIndex).toBe(insertIndex + 1);

      // INSERT uses the ITEM's unit_id (the input has none) and binds metadata.
      expect(insertCall!.params).toEqual([
        'uuid-test', // id
        'biz-1', // business_id
        'item-1', // inventory_item_id
        'SALE', // type
        -200, // quantity (signed)
        'unit-ml', // unit_id ← from the item
        150, // unit_cost_minor
        'sold', // reason
        null, // notes (omitted → null)
        'sale', // reference_type
        'sale-1', // reference_id
        'emp-1', // employee_id
        expect.any(String), // created_at (ISO)
      ]);

      // Cache UPDATE adds the signed quantity atomically (never sets it).
      expect(updateCall!.sql).toContain('current_quantity + ?');
      expect(updateCall!.params).toEqual([
        -200,
        expect.any(String), // updated_at
        'item-1',
        'biz-1',
      ]);
    });

    it('throws REPO_INVALID_STATE on a zero quantity with no writes', async () => {
      const error = await recordMovementWithTxn(adapter, 'biz-1', {
        inventoryItemId: 'item-1',
        type: 'SALE',
        quantity: 0,
      }).catch((e: unknown) => e);

      expect(isRepoError(error, REPO_ERROR.INVALID_STATE)).toBe(true);
      expect(adapter.calls).toHaveLength(0);
    });

    it('throws REPO_INVALID_STATE on a non-movement type with no writes', async () => {
      const error = await recordMovementWithTxn(adapter, 'biz-1', {
        inventoryItemId: 'item-1',
        type: 'NOT_A_TYPE' as unknown as MovementType,
        quantity: 100,
      }).catch((e: unknown) => e);

      expect(isRepoError(error, REPO_ERROR.INVALID_STATE)).toBe(true);
      expect(adapter.calls).toHaveLength(0);
    });

    it('throws REPO_NOT_FOUND when the item is missing', async () => {
      adapter.queueFirst('FROM inventory_item', null);

      const error = await recordMovementWithTxn(adapter, 'biz-1', {
        inventoryItemId: 'missing',
        type: 'SALE',
        quantity: -100,
      }).catch((e: unknown) => e);

      expect(isRepoError(error, REPO_ERROR.NOT_FOUND)).toBe(true);
      const writes = adapter.calls.filter(
        (c) => c.sql.includes('INSERT') || c.sql.includes('UPDATE'),
      );
      expect(writes).toHaveLength(0);
    });

    it('throws INVENTORY_INSUFFICIENT_STOCK before any write', async () => {
      adapter.queueFirst('FROM inventory_item', {
        id: 'item-1',
        unit_id: 'unit-ml',
        current_quantity: 10,
      });
      adapter.queueFirst('allow_negative_inventory', { allow_negative_inventory: 0 });

      const error = await recordMovementWithTxn(adapter, 'biz-1', {
        inventoryItemId: 'item-1',
        type: 'SALE',
        quantity: -50,
      }).catch((e: unknown) => e);

      expect(isRepoError(error, REPO_ERROR.INSUFFICIENT_STOCK)).toBe(true);
      const writes = adapter.calls.filter(
        (c) => c.sql.includes('INSERT') || c.sql.includes('UPDATE'),
      );
      expect(writes).toHaveLength(0);
    });

    it('permits negative stock when allow_negative_inventory = 1', async () => {
      adapter.queueFirst('FROM inventory_item', {
        id: 'item-1',
        unit_id: 'unit-ml',
        current_quantity: 10,
      });
      adapter.queueFirst('allow_negative_inventory', { allow_negative_inventory: 1 });

      await recordMovementWithTxn(adapter, 'biz-1', {
        inventoryItemId: 'item-1',
        type: 'SALE',
        quantity: -50,
      });

      const insertCall = adapter.calls.find((c) => c.sql.includes('INSERT INTO inventory_movement'));
      const updateCall = adapter.calls.find((c) => c.sql.includes('UPDATE inventory_item'));
      expect(insertCall).toBeDefined();
      expect(updateCall).toBeDefined();
      expect(insertCall!.params[4]).toBe(-50);
    });
  });

  describe('recordMovement (public entry point)', () => {
    it('resolves business scope and runs the write inside a transaction', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('FROM inventory_item', {
        id: 'item-1',
        unit_id: 'unit-ml',
        current_quantity: 500,
      });
      adapter.queueFirst('allow_negative_inventory', { allow_negative_inventory: 0 });

      await recordMovement({
        inventoryItemId: 'item-1',
        type: 'ADJUSTMENT',
        quantity: 100,
      });

      const insertCall = adapter.calls.find((c) => c.sql.includes('INSERT INTO inventory_movement'));
      const updateCall = adapter.calls.find((c) => c.sql.includes('UPDATE inventory_item'));
      expect(insertCall).toBeDefined();
      expect(updateCall).toBeDefined();
      expect(insertCall!.params[1]).toBe('biz-1');
      expect(insertCall!.params[4]).toBe(100);
    });
  });

  describe('adjustQuantity', () => {
    it('computes the signed delta and posts an ADJUSTMENT movement', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      // adjustQuantity reads the current quantity first…
      adapter.queueFirst('FROM inventory_item', { id: 'item-1', current_quantity: 500 });
      // …then recordMovementWithTxn re-reads the item (for unit_id) + flag.
      adapter.queueFirst('FROM inventory_item', {
        id: 'item-1',
        unit_id: 'unit-ml',
        current_quantity: 500,
      });
      adapter.queueFirst('allow_negative_inventory', { allow_negative_inventory: 0 });

      await adjustQuantity({ inventoryItemId: 'item-1', newQuantity: 300, reason: 'count' });

      const insertCall = adapter.calls.find((c) => c.sql.includes('INSERT INTO inventory_movement'));
      expect(insertCall).toBeDefined();
      expect(insertCall!.params[3]).toBe('ADJUSTMENT');
      expect(insertCall!.params[4]).toBe(-200); // 300 - 500
      expect(insertCall!.params[7]).toBe('count');

      const updateCall = adapter.calls.find((c) => c.sql.includes('UPDATE inventory_item'));
      expect(updateCall!.sql).toContain('current_quantity + ?');
      expect(updateCall!.params[0]).toBe(-200);
    });

    it('no-ops on a zero delta without writing', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('FROM inventory_item', { id: 'item-1', current_quantity: 300 });

      await adjustQuantity({ inventoryItemId: 'item-1', newQuantity: 300 });

      const writes = adapter.calls.filter(
        (c) => c.sql.includes('INSERT') || c.sql.includes('UPDATE'),
      );
      expect(writes).toHaveLength(0);
    });
  });

  describe('reconcileItemFromLedger', () => {
    it('sums the ledger and updates the cache', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('SUM(quantity)', { total: 750 });

      await reconcileItemFromLedger('item-1');

      const sumCall = adapter.calls.find((c) => c.sql.includes('SUM(quantity)'));
      expect(sumCall).toBeDefined();
      expect(sumCall!.params).toEqual(['item-1', 'biz-1']);

      const updateCall = adapter.calls.find((c) => c.sql.includes('UPDATE inventory_item'));
      expect(updateCall).toBeDefined();
      expect(updateCall!.sql).toContain('current_quantity = ?');
      expect(updateCall!.params).toEqual([
        750,
        expect.any(String), // updated_at
        'item-1',
        'biz-1',
      ]);
    });
  });

  describe('listMovements', () => {
    const fullPage = Array.from({ length: 50 }, (_, i) => ({
      ...movementRow,
      id: `mov-${i}`,
      created_at: `2026-01-01T00:00:${String(i).padStart(2, '0')}.000Z`,
    }));

    it('emits DESC ordering, keyset clause, filters, and nextCursor on a full page', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueAll('FROM inventory_movement', fullPage);

      const result = await listMovements({
        inventoryItemId: 'item-1',
        cursor: '2026-01-02T00:00:00.000Z|mov-x',
      });

      const call = adapter.calls.find((c) => c.sql.includes('FROM inventory_movement'));
      expect(call).toBeDefined();
      expect(call!.sql).toContain('ORDER BY created_at DESC, id DESC');
      expect(call!.sql).toContain('(created_at, id) < (?, ?)');
      expect(call!.sql).toContain('inventory_item_id = ?');
      expect(call!.sql).not.toContain('archived_at');
      // params: [businessId, inventoryItemId, cursorCreatedAt, cursorId, limit]
      expect(call!.params).toEqual([
        'biz-1',
        'item-1',
        '2026-01-02T00:00:00.000Z',
        'mov-x',
        50,
      ]);

      expect(result.items).toHaveLength(50);
      // Full page → cursor encoded from the last row's (created_at, id).
      expect(result.nextCursor).toBe('2026-01-01T00:00:49.000Z|mov-49');
    });

    it('returns null nextCursor on a partial page and omits the keyset clause without a cursor', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueAll('FROM inventory_movement', [movementRow]);

      const result = await listMovements();

      const call = adapter.calls.find((c) => c.sql.includes('FROM inventory_movement'));
      expect(call!.sql).not.toContain('(created_at, id) <');
      expect(call!.sql).toContain('ORDER BY created_at DESC, id DESC');
      expect(call!.params).toEqual(['biz-1', 50]);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('mov-1');
      expect(result.items[0].type).toBe('SALE');
      expect(result.items[0].quantity).toBe(-200);
      expect(result.nextCursor).toBeNull();
    });

    it('builds all optional filters with bound parameters', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueAll('FROM inventory_movement', []);

      await listMovements({
        inventoryItemId: 'item-1',
        type: 'SALE',
        referenceType: 'sale',
        referenceId: 'sale-9',
        from: '2026-01-01T00:00:00.000Z',
        to: '2026-02-01T00:00:00.000Z',
      });

      const call = adapter.calls.find((c) => c.sql.includes('FROM inventory_movement'));
      expect(call).toBeDefined();
      expect(call!.sql).toContain('inventory_item_id = ?');
      expect(call!.sql).toContain('type = ?');
      expect(call!.sql).toContain('reference_type = ?');
      expect(call!.sql).toContain('reference_id = ?');
      expect(call!.sql).toContain('created_at >= ?');
      expect(call!.sql).toContain('created_at <= ?');
      expect(call!.params).toEqual([
        'biz-1',
        'item-1',
        'SALE',
        'sale',
        'sale-9',
        '2026-01-01T00:00:00.000Z',
        '2026-02-01T00:00:00.000Z',
        50,
      ]);
    });
  });
});
