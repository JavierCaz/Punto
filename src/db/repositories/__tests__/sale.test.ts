/**
 * @jest-environment node
 *
 * Sale repository tests against the scripted RecordingAdapter fake
 * (no native SQLite — see AGENTS §9.4). They pin the POS core: HELD lifecycle,
 * integer-exact line/total math, payment validation, bridge + recipe stock
 * consumption, the REFUND ledger inversion, and keyset list pagination.
 */

import { getDb } from '@/db/client';

import { resetBusinessIdForTesting } from '@/db/repositories/business-scope';
import { REPO_ERROR, isRepoError } from '@/db/repositories/errors';
import {
  addSaleItem,
  cancelSale,
  checkoutSale,
  completeSale,
  createHeldSale,
  getSaleById,
  listSales,
  refundSale,
  removeSaleItem,
  updateSaleItemQuantity,
} from '@/db/repositories/sale';
import { getStockStatus } from '@/db/repositories/calc';
import { makeFakeDb } from '@/db/repositories/__tests__/fakes/fake-db';
import { RecordingAdapter } from '@/db/repositories/__tests__/fakes/recording-adapter';

jest.mock('@/db/client', () => ({ getDb: jest.fn() }));
jest.mock('expo-crypto', () => ({ randomUUID: jest.fn(() => 'uuid-test') }));

/** A canonical HELD sale row as SQLite would surface it (snake_case). */
const SALE_ROW = {
  id: 'sale-1',
  business_id: 'biz-1',
  sale_number: 'S-000001',
  status: 'HELD',
  subtotal_minor: 1000,
  discount_minor: 0,
  tax_minor: 0,
  total_minor: 1000,
  employee_id: null,
  notes: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  completed_at: null,
  cancelled_at: null,
  refunded_at: null,
};

const SALE_ITEM_ROW = {
  id: 'si-1',
  sale_id: 'sale-1',
  product_id: 'prod-1',
  product_name: 'Matcha Latte',
  quantity: 1000,
  unit_price_minor: 500,
  discount_minor: 0,
  subtotal_minor: 500,
  unit_cost_minor: 50,
  created_at: '2026-01-01T00:00:00.000Z',
};

const PAYMENT_ROW = {
  id: 'pay-1',
  business_id: 'biz-1',
  sale_id: 'sale-1',
  payment_method_id: 'pm-cash',
  amount_minor: 1000,
  amount_given_minor: 1000,
  reference: null,
  notes: null,
  created_at: '2026-01-01T00:00:00.000Z',
};

describe('sale repository', () => {
  let adapter: RecordingAdapter;

  beforeEach(() => {
    adapter = new RecordingAdapter();
    (getDb as jest.Mock).mockResolvedValue(makeFakeDb(adapter));
    resetBusinessIdForTesting();
  });

  describe('createHeldSale', () => {
    it('inserts a HELD sale with a sale number + computed totals, no stock movements', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('FROM app_metadata', { value: null }); // nextSaleNumber → S-000001
      adapter.queueFirst('SUM(subtotal_minor)', { total: 500 }); // recompute sum
      adapter.queueFirst('discount_minor FROM sale', { discount_minor: 0 }); // recompute discount
      adapter.queueFirst('FROM sale', { ...SALE_ROW, subtotal_minor: 500, total_minor: 500 });

      const result = await createHeldSale({
        items: [{ productId: 'prod-1', productName: 'Matcha Latte', quantity: 1000, unitPriceMinor: 500 }],
      });

      // Sale INSERT: status HELD, number reserved, totals zeroed before recompute.
      const insertCall = adapter.calls.find((c) => c.sql.includes('INSERT INTO sale') && c.sql.includes('sale_number'));
      expect(insertCall).toBeDefined();
      expect(insertCall!.params).toHaveLength(15);
      expect(insertCall!.params[0]).toBe('uuid-test'); // id
      expect(insertCall!.params[1]).toBe('biz-1'); // business_id
      expect(insertCall!.params[2]).toBe('S-000001'); // sale_number
      expect(insertCall!.params[3]).toBe('HELD'); // status
      expect(insertCall!.params[4]).toBe(0); // subtotal_minor (pre-recompute)
      expect(insertCall!.params[7]).toBe(0); // total_minor (pre-recompute)
      expect(insertCall!.params[8]).toBeNull(); // employee_id
      expect(insertCall!.params[9]).toBeNull(); // notes
      expect(insertCall!.params[10]).toBe(insertCall!.params[11]); // created_at === updated_at
      expect(insertCall!.params[12]).toBeNull(); // completed_at
      expect(insertCall!.params[13]).toBeNull(); // cancelled_at
      expect(insertCall!.params[14]).toBeNull(); // refunded_at

      // Held sales never touch the stock ledger.
      expect(adapter.calls.some((c) => c.sql.includes('INSERT INTO inventory_movement'))).toBe(false);

      // Recompute wrote the derived totals back onto the sale row.
      const recompute = adapter.calls.find((c) => c.sql.includes('UPDATE sale') && c.sql.includes('subtotal_minor = ?'));
      expect(recompute).toBeDefined();
      expect(recompute!.params[0]).toBe(500); // subtotal_minor
      expect(recompute!.params[2]).toBe(500); // total_minor

      // Select-back is mapped (number + totals surfaced to the caller).
      expect(result.saleNumber).toBe('S-000001');
      expect(result.status).toBe('HELD');
      expect(result.subtotalMinor).toBe(500);
      expect(result.totalMinor).toBe(500);
    });

    it('computes integer-exact line subtotals (rounding + discount) and sums them', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('FROM app_metadata', { value: null });
      adapter.queueFirst('SUM(subtotal_minor)', { total: 575 });
      adapter.queueFirst('discount_minor FROM sale', { discount_minor: 0 });
      adapter.queueFirst('FROM sale', { ...SALE_ROW, subtotal_minor: 575, total_minor: 575 });

      await createHeldSale({
        items: [
          // 1500 milli × 333 minor = 499.5 → rounds to 500 (no float drift).
          { productId: 'a', productName: 'A', quantity: 1500, unitPriceMinor: 333 },
          // 1000 milli × 100 minor = 100, minus 25 discount = 75.
          { productId: 'b', productName: 'B', quantity: 1000, unitPriceMinor: 100, discountMinor: 25 },
        ],
      });

      const inserts = adapter.calls.filter((c) => c.sql.includes('INSERT INTO sale_item'));
      expect(inserts).toHaveLength(2);
      // params: [id, sale_id, product_id, product_name, quantity, unit_price, discount, subtotal, unit_cost, created_at]
      expect(inserts[0].params[4]).toBe(1500); // quantity
      expect(inserts[0].params[5]).toBe(333); // unit_price_minor
      expect(inserts[0].params[6]).toBe(0); // discount_minor
      expect(inserts[0].params[7]).toBe(500); // subtotal_minor (rounded)
      expect(inserts[1].params[4]).toBe(1000);
      expect(inserts[1].params[5]).toBe(100);
      expect(inserts[1].params[6]).toBe(25);
      expect(inserts[1].params[7]).toBe(75); // 100 - 25
    });
  });

  describe('addSaleItem', () => {
    it('inserts a line on a HELD sale and recomputes totals', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('status FROM sale', { status: 'HELD' });
      adapter.queueFirst('SUM(subtotal_minor)', { total: 1500 });
      adapter.queueFirst('discount_minor FROM sale', { discount_minor: 0 });
      adapter.queueFirst('FROM sale', { ...SALE_ROW, subtotal_minor: 1500, total_minor: 1500 });

      const result = await addSaleItem('sale-1', {
        productId: 'prod-2',
        productName: 'Chips',
        quantity: 2000,
        unitPriceMinor: 500,
      });

      const insertCall = adapter.calls.find((c) => c.sql.includes('INSERT INTO sale_item'));
      expect(insertCall).toBeDefined();
      expect(insertCall!.params[1]).toBe('sale-1'); // sale_id
      expect(insertCall!.params[2]).toBe('prod-2'); // product_id
      expect(insertCall!.params[7]).toBe(1000); // subtotal = 2000*500/1000
      expect(result.subtotalMinor).toBe(1500);
      expect(result.totalMinor).toBe(1500);
    });

    it('throws REPO_INVALID_STATE on a COMPLETED sale without writing', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('status FROM sale', { status: 'COMPLETED' });

      const error = await addSaleItem('sale-1', {
        productId: null,
        productName: 'X',
        quantity: 1000,
        unitPriceMinor: 100,
      }).catch((e: unknown) => e);

      expect(isRepoError(error, REPO_ERROR.INVALID_STATE)).toBe(true);
      expect(adapter.calls.some((c) => c.sql.includes('INSERT INTO sale_item'))).toBe(false);
    });
  });

  describe('updateSaleItemQuantity', () => {
    it('recomputes the line subtotal from the persisted unit price and discount', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('FROM sale_item', { sale_id: 'sale-1', unit_price_minor: 100, discount_minor: 0 });
      adapter.queueFirst('status FROM sale', { status: 'HELD' });
      adapter.queueFirst('SUM(subtotal_minor)', { total: 200 });
      adapter.queueFirst('discount_minor FROM sale', { discount_minor: 0 });

      await updateSaleItemQuantity('si-1', 2000);

      const updateCall = adapter.calls.find((c) => c.sql.includes('UPDATE sale_item'));
      expect(updateCall).toBeDefined();
      expect(updateCall!.params).toEqual([2000, 200, 'si-1']); // quantity, subtotal, id
    });

    it('throws REPO_INVALID_STATE on a non-HELD sale', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('FROM sale_item', { sale_id: 'sale-1', unit_price_minor: 100, discount_minor: 0 });
      adapter.queueFirst('status FROM sale', { status: 'COMPLETED' });

      const error = await updateSaleItemQuantity('si-1', 2000).catch((e: unknown) => e);
      expect(isRepoError(error, REPO_ERROR.INVALID_STATE)).toBe(true);
      expect(adapter.calls.some((c) => c.sql.includes('UPDATE sale_item'))).toBe(false);
    });
  });

  describe('removeSaleItem', () => {
    it('deletes the line on a HELD sale and recomputes totals', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('FROM sale_item', { sale_id: 'sale-1' });
      adapter.queueFirst('status FROM sale', { status: 'HELD' });
      adapter.queueFirst('SUM(subtotal_minor)', { total: 0 });
      adapter.queueFirst('discount_minor FROM sale', { discount_minor: 0 });

      await removeSaleItem('si-1');

      expect(adapter.calls.some((c) => c.sql.includes('DELETE FROM sale_item'))).toBe(true);
      const recompute = adapter.calls.find((c) => c.sql.includes('UPDATE sale') && c.sql.includes('subtotal_minor = ?'));
      expect(recompute).toBeDefined();
      expect(recompute!.params[0]).toBe(0);
    });

    it('throws REPO_INVALID_STATE on a non-HELD sale', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('FROM sale_item', { sale_id: 'sale-1' });
      adapter.queueFirst('status FROM sale', { status: 'COMPLETED' });

      const error = await removeSaleItem('si-1').catch((e: unknown) => e);
      expect(isRepoError(error, REPO_ERROR.INVALID_STATE)).toBe(true);
      expect(adapter.calls.some((c) => c.sql.includes('DELETE FROM sale_item'))).toBe(false);
    });
  });

  describe('completeSale', () => {
    const heldSale = { ...SALE_ROW, status: 'HELD', total_minor: 1000, employee_id: 'emp-1' };
    const completedSale = { ...SALE_ROW, status: 'COMPLETED', total_minor: 1000, employee_id: 'emp-1', completed_at: '2026-01-01T01:00:00.000Z' };

    it('propagates INVENTORY_INSUFFICIENT_STOCK and writes no movement or status flip', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('FROM sale', heldSale);
      adapter.queueAll('FROM sale_item', [SALE_ITEM_ROW]);
      adapter.queueFirst('type FROM payment_method', { type: 'CASH' });
      // Stock consumption: product bridge → item with zero stock, negative not allowed.
      adapter.queueFirst('inventory_item_id FROM product', { inventory_item_id: 'inv-1' });
      adapter.queueFirst('FROM inventory_item', { id: 'inv-1', unit_id: 'u1', current_quantity: 0 });
      adapter.queueFirst('allow_negative_inventory', { allow_negative_inventory: 0 });

      const error = await completeSale({
        saleId: 'sale-1',
        payments: [{ paymentMethodId: 'pm-cash', amountMinor: 1000 }],
      }).catch((e: unknown) => e);

      expect(isRepoError(error, REPO_ERROR.INSUFFICIENT_STOCK)).toBe(true);
      // The ledger and the sale status were never touched (the payment INSERT is
      // rolled back by SQLite in production; the fake records it but not the rest).
      expect(adapter.calls.some((c) => c.sql.includes('INSERT INTO inventory_movement'))).toBe(false);
      expect(adapter.calls.some((c) => c.sql.includes("status = 'COMPLETED'"))).toBe(false);
    });

    it('throws REPO_INVALID_STATE when payments do not cover the total', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('FROM sale', heldSale);
      adapter.queueAll('FROM sale_item', [SALE_ITEM_ROW]);

      const error = await completeSale({
        saleId: 'sale-1',
        payments: [{ paymentMethodId: 'pm-cash', amountMinor: 600 }],
      }).catch((e: unknown) => e);

      expect(isRepoError(error, REPO_ERROR.INVALID_STATE)).toBe(true);
      expect(adapter.calls.some((c) => c.sql.includes('INSERT INTO payment'))).toBe(false);
    });

    it('throws REPO_INVALID_STATE when cash given is less than the amount due', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('FROM sale', heldSale);
      adapter.queueAll('FROM sale_item', [SALE_ITEM_ROW]);
      adapter.queueFirst('type FROM payment_method', { type: 'CASH' });

      const error = await completeSale({
        saleId: 'sale-1',
        payments: [{ paymentMethodId: 'pm-cash', amountMinor: 1000, amountGivenMinor: 500 }],
      }).catch((e: unknown) => e);

      expect(isRepoError(error, REPO_ERROR.INVALID_STATE)).toBe(true);
      expect(adapter.calls.some((c) => c.sql.includes('INSERT INTO payment'))).toBe(false);
    });

    it('inserts payments, posts negative SALE movements (bridge + recipe), and flips status', async () => {
      const recipeItem = {
        ...SALE_ITEM_ROW,
        id: 'si-2',
        product_id: 'prod-recipe',
        product_name: 'Burger',
        quantity: 2000,
        unit_price_minor: 250,
        subtotal_minor: 500,
        unit_cost_minor: 30,
      };

      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('FROM sale', heldSale); // 1. load sale
      adapter.queueAll('FROM sale_item', [SALE_ITEM_ROW, recipeItem]); // 2. load items
      adapter.queueFirst('type FROM payment_method', { type: 'CASH' }); // 3. payment method

      // 3. consume item 1 — direct bridge.
      adapter.queueFirst('inventory_item_id FROM product', { inventory_item_id: 'inv-bridge' });
      adapter.queueFirst('FROM inventory_item', { id: 'inv-bridge', unit_id: 'u1', current_quantity: 5000 });
      adapter.queueFirst('allow_negative_inventory', { allow_negative_inventory: 0 });

      // 4. consume item 2 — recipe (two ingredients).
      adapter.queueFirst('inventory_item_id FROM product', { inventory_item_id: null });
      adapter.queueFirst('FROM recipe', { id: 'rec-1' });
      adapter.queueAll('FROM recipe_item', [
        { inventory_item_id: 'ing-1', quantity: 500, unit_cost_minor: 12 },
        { inventory_item_id: 'ing-2', quantity: 250, unit_cost_minor: 10 },
      ]);
      adapter.queueFirst('FROM inventory_item', { id: 'ing-1', unit_id: 'ug', current_quantity: 10000 });
      adapter.queueFirst('allow_negative_inventory', { allow_negative_inventory: 0 });
      adapter.queueFirst('FROM inventory_item', { id: 'ing-2', unit_id: 'ug', current_quantity: 10000 });
      adapter.queueFirst('allow_negative_inventory', { allow_negative_inventory: 0 });

      // 5. select-back detail.
      adapter.queueFirst('FROM sale', completedSale);
      adapter.queueAll('FROM sale_item', [SALE_ITEM_ROW, recipeItem]);
      adapter.queueAll('FROM payment', [PAYMENT_ROW]);

      const result = await completeSale({
        saleId: 'sale-1',
        payments: [{ paymentMethodId: 'pm-cash', amountMinor: 1000, amountGivenMinor: 1000 }],
      });

      // Payment INSERT (amount_given_minor persisted only when provided).
      const paymentCall = adapter.calls.find((c) => c.sql.includes('INSERT INTO payment'));
      expect(paymentCall).toBeDefined();
      expect(paymentCall!.params).toEqual([
        'uuid-test', // id
        'biz-1', // business_id
        'sale-1', // sale_id
        'pm-cash', // payment_method_id
        1000, // amount_minor
        1000, // amount_given_minor
        null, // reference
        null, // notes
        expect.any(String), // created_at
      ]);

      // Three SALE movements: bridge (-1000) + ing-1 (-1000) + ing-2 (-500).
      const movements = adapter.calls.filter((c) => c.sql.includes('INSERT INTO inventory_movement'));
      expect(movements).toHaveLength(3);

      const bridge = movements.find((c) => c.params[2] === 'inv-bridge');
      expect(bridge).toBeDefined();
      expect(bridge!.params[3]).toBe('SALE');
      expect(bridge!.params[4]).toBe(-1000); // negative = out
      expect(bridge!.params[6]).toBe(50); // unit_cost_minor from the sale line
      expect(bridge!.params[9]).toBe('sale'); // reference_type
      expect(bridge!.params[10]).toBe('sale-1'); // reference_id
      expect(bridge!.params[11]).toBe('emp-1'); // employee_id

      const ing1 = movements.find((c) => c.params[2] === 'ing-1');
      expect(ing1!.params[4]).toBe(-1000); // round(500 * 2000 / 1000)
      expect(ing1!.params[6]).toBe(12); // ingredient cost: round(1000 * 12 / 1000)

      const ing2 = movements.find((c) => c.params[2] === 'ing-2');
      expect(ing2!.params[4]).toBe(-500); // round(250 * 2000 / 1000)
      expect(ing2!.params[3]).toBe('SALE');
      expect(ing2!.params[6]).toBe(5); // ingredient cost: round(500 * 10 / 1000)
      expect(ing2!.params[3]).toBe('SALE');

      // Status flipped with a completion stamp.
      const statusCall = adapter.calls.find((c) => c.sql.includes("status = 'COMPLETED'"));
      expect(statusCall).toBeDefined();
      expect(statusCall!.params[0]).toBe(statusCall!.params[1]); // completed_at === updated_at
      expect(statusCall!.params[2]).toBe('sale-1');
      expect(statusCall!.params[3]).toBe('biz-1');

      // Select-back returns the assembled detail.
      expect(result.status).toBe('COMPLETED');
      expect(result.items).toHaveLength(2);
      expect(result.payments).toHaveLength(1);
      expect(result.totalMinor).toBe(1000);
    });

    it('drains a bridged item below its threshold so the badge flips (Milestone 6)', async () => {
      // Healthy: 0.6 units in stock with a 0.5 threshold.
      const currentQuantity = 600;
      const minimumQuantity = 500;
      const lineQuantity = 400; // the sale sells 0.4 → 0.2 left → below threshold

      const bridgeItem = {
        ...SALE_ITEM_ROW,
        id: 'si-bridge',
        product_id: 'prod-bridge',
        quantity: lineQuantity,
      };

      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('FROM sale', heldSale); // 1. load sale
      adapter.queueAll('FROM sale_item', [bridgeItem]); // 2. load items
      adapter.queueFirst('type FROM payment_method', { type: 'CASH' }); // 3. payment method
      // 4. consume — direct bridge.
      adapter.queueFirst('inventory_item_id FROM product', { inventory_item_id: 'inv-bridge' });
      adapter.queueFirst('FROM inventory_item', {
        id: 'inv-bridge',
        unit_id: 'u1',
        current_quantity: currentQuantity,
      });
      adapter.queueFirst('allow_negative_inventory', { allow_negative_inventory: 0 });
      // 5. select-back detail.
      adapter.queueFirst('FROM sale', completedSale);
      adapter.queueAll('FROM sale_item', [bridgeItem]);
      adapter.queueAll('FROM payment', [PAYMENT_ROW]);

      await completeSale({
        saleId: 'sale-1',
        payments: [{ paymentMethodId: 'pm-cash', amountMinor: 1000 }],
      });

      // The ledger posts a negative SALE movement for the sold quantity…
      const movement = adapter.calls.find((c) => c.sql.includes('INSERT INTO inventory_movement'));
      expect(movement).toBeDefined();
      expect(movement!.params[3]).toBe('SALE');
      expect(movement!.params[4]).toBe(-lineQuantity);

      // …and the cache update applies that same signed delta atomically.
      const cacheUpdate = adapter.calls.find(
        (c) =>
          c.sql.includes('UPDATE inventory_item') &&
          c.sql.includes('current_quantity = current_quantity + ?'),
      );
      expect(cacheUpdate).toBeDefined();
      const delta = cacheUpdate!.params[0] as number;
      expect(delta).toBe(-lineQuantity);

      // The threshold helper therefore flips the badge automatically — no
      // extra write after the sale: healthy before, low after.
      expect(getStockStatus(currentQuantity, minimumQuantity)).toBe('ok');
      expect(getStockStatus(currentQuantity + delta, minimumQuantity)).toBe('low');
    });

    it('deducts recipe ingredients for a matcha latte sale', async () => {
      const matchaItem = {
        ...SALE_ITEM_ROW,
        id: 'si-matcha',
        product_id: 'prod-matcha',
        product_name: 'Matcha Latte',
        quantity: 2000,
        unit_price_minor: 500,
        subtotal_minor: 1000,
        unit_cost_minor: 400,
      };

      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('FROM sale', heldSale); // 1. load sale
      adapter.queueAll('FROM sale_item', [matchaItem]); // 2. load items
      adapter.queueFirst('type FROM payment_method', { type: 'CASH' }); // 3. payment method

      // 3. consume stock — product has no direct bridge → recipe (two ingredients).
      adapter.queueFirst('inventory_item_id FROM product', { inventory_item_id: null });
      adapter.queueFirst('FROM recipe', { id: 'rec-matcha' });
      adapter.queueAll('FROM recipe_item', [
        { inventory_item_id: 'ing-matcha', quantity: 8000, unit_cost_minor: 50 },
        { inventory_item_id: 'ing-milk', quantity: 200000, unit_cost_minor: 2 },
      ]);
      adapter.queueFirst('FROM inventory_item', { id: 'ing-matcha', unit_id: 'ug', current_quantity: 1000000 });
      adapter.queueFirst('allow_negative_inventory', { allow_negative_inventory: 0 });
      adapter.queueFirst('FROM inventory_item', { id: 'ing-milk', unit_id: 'ug', current_quantity: 1000000 });
      adapter.queueFirst('allow_negative_inventory', { allow_negative_inventory: 0 });

      // 4. select-back detail.
      adapter.queueFirst('FROM sale', completedSale);
      adapter.queueAll('FROM sale_item', [matchaItem]);
      adapter.queueAll('FROM payment', [PAYMENT_ROW]);

      const result = await completeSale({
        saleId: 'sale-1',
        payments: [{ paymentMethodId: 'pm-cash', amountMinor: 1000, amountGivenMinor: 1000 }],
      });

      // Exactly two SALE movements: matcha (-16000) + milk (-400000).
      const movements = adapter.calls.filter((c) => c.sql.includes('INSERT INTO inventory_movement'));
      expect(movements).toHaveLength(2);

      const matcha = movements.find((c) => c.params[2] === 'ing-matcha');
      expect(matcha).toBeDefined();
      expect(matcha!.params[3]).toBe('SALE');
      expect(matcha!.params[4]).toBe(-16000); // round(8000 * 2000 / 1000)
      expect(matcha!.params[6]).toBe(800); // matcha cost: round(16000 * 50 / 1000)
      expect(matcha!.params[9]).toBe('sale'); // reference_type
      expect(matcha!.params[10]).toBe('sale-1'); // reference_id
      expect(matcha!.params[11]).toBe('emp-1'); // employee_id from the sale

      const milk = movements.find((c) => c.params[2] === 'ing-milk');
      expect(milk).toBeDefined();
      expect(milk!.params[3]).toBe('SALE');
      expect(milk!.params[4]).toBe(-400000); // round(200000 * 2000 / 1000)
      expect(milk!.params[6]).toBe(800); // milk cost: round(400000 * 2 / 1000)
      expect(milk!.params[9]).toBe('sale');

      // The matching current_quantity cache updates apply the same negative deltas.
      const cacheUpdates = adapter.calls.filter(
        (c) => c.sql.includes('UPDATE inventory_item') && c.sql.includes('current_quantity = current_quantity + ?'),
      );
      expect(cacheUpdates).toHaveLength(2);
      const matchaUpdate = cacheUpdates.find((c) => c.params[2] === 'ing-matcha');
      const milkUpdate = cacheUpdates.find((c) => c.params[2] === 'ing-milk');
      expect(matchaUpdate).toBeDefined();
      expect(matchaUpdate!.params[0]).toBe(-16000);
      expect(milkUpdate).toBeDefined();
      expect(milkUpdate!.params[0]).toBe(-400000);

      expect(adapter.calls.some((c) => c.sql.includes("status = 'COMPLETED'"))).toBe(true);
      expect(result.status).toBe('COMPLETED');
      expect(result.items).toHaveLength(1);
      expect(result.payments).toHaveLength(1);
    });

    it('accepts a CARD payment without amountGivenMinor', async () => {
      const untrackedItem = { ...SALE_ITEM_ROW, product_id: null };
      const cardPayment = { ...PAYMENT_ROW, payment_method_id: 'pm-card', amount_given_minor: null };

      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('FROM sale', heldSale);
      adapter.queueAll('FROM sale_item', [untrackedItem]);
      adapter.queueFirst('type FROM payment_method', { type: 'CARD' });
      // Select-back (untracked item → no stock movement).
      adapter.queueFirst('FROM sale', completedSale);
      adapter.queueAll('FROM sale_item', [untrackedItem]);
      adapter.queueAll('FROM payment', [cardPayment]);

      const result = await completeSale({
        saleId: 'sale-1',
        payments: [{ paymentMethodId: 'pm-card', amountMinor: 1000 }],
      });

      expect(result.status).toBe('COMPLETED');
      expect(result.payments).toHaveLength(1);
      expect(result.payments[0].paymentMethodId).toBe('pm-card');
      expect(result.payments[0].amountGivenMinor).toBeNull();
    });

    it('throws REPO_NOT_FOUND when a payment method is unknown', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('FROM sale', heldSale);
      adapter.queueAll('FROM sale_item', [SALE_ITEM_ROW]);
      adapter.queueFirst('type FROM payment_method', null);

      const error = await completeSale({
        saleId: 'sale-1',
        payments: [{ paymentMethodId: 'pm-unknown', amountMinor: 1000 }],
      }).catch((e: unknown) => e);

      expect(isRepoError(error, REPO_ERROR.NOT_FOUND)).toBe(true);
      expect(adapter.calls.some((c) => c.sql.includes('INSERT INTO payment'))).toBe(false);
    });

    it('throws REPO_INVALID_STATE when amountGivenMinor is set on a non-CASH method', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('FROM sale', heldSale);
      adapter.queueAll('FROM sale_item', [SALE_ITEM_ROW]);
      adapter.queueFirst('type FROM payment_method', { type: 'CARD' });

      const error = await completeSale({
        saleId: 'sale-1',
        payments: [{ paymentMethodId: 'pm-card', amountMinor: 1000, amountGivenMinor: 2000 }],
      }).catch((e: unknown) => e);

      expect(isRepoError(error, REPO_ERROR.INVALID_STATE)).toBe(true);
      expect(adapter.calls.some((c) => c.sql.includes('INSERT INTO payment'))).toBe(false);
    });
  });

  describe('cancelSale', () => {
    it('flips a HELD sale to CANCELLED with a stamp', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('status FROM sale', { status: 'HELD' });

      await cancelSale('sale-1');

      const updateCall = adapter.calls.find((c) => c.sql.includes('UPDATE sale'));
      expect(updateCall).toBeDefined();
      expect(updateCall!.sql).toContain("status = 'CANCELLED'");
      expect(updateCall!.sql).toContain('cancelled_at = ?');
      expect(updateCall!.params[0]).toBe(updateCall!.params[1]); // cancelled_at === updated_at
      expect(updateCall!.params[2]).toBe('sale-1');
    });

    it('throws REPO_INVALID_STATE from a non-HELD sale', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('status FROM sale', { status: 'COMPLETED' });

      const error = await cancelSale('sale-1').catch((e: unknown) => e);
      expect(isRepoError(error, REPO_ERROR.INVALID_STATE)).toBe(true);
      expect(adapter.calls.some((c) => c.sql.includes('UPDATE sale'))).toBe(false);
    });
  });

  describe('refundSale', () => {
    it('posts positive RETURN movements inverting the original SALEs and flips status', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('FROM sale', { ...SALE_ROW, status: 'COMPLETED', employee_id: 'emp-1' });
      adapter.queueAll('FROM inventory_movement', [
        { inventory_item_id: 'inv-1', quantity: -200, unit_cost_minor: 50 },
        { inventory_item_id: 'inv-2', quantity: -500, unit_cost_minor: 30 },
      ]);
      adapter.queueFirst('FROM inventory_item', { id: 'inv-1', unit_id: 'u1', current_quantity: 100 });
      adapter.queueFirst('allow_negative_inventory', { allow_negative_inventory: 0 });
      adapter.queueFirst('FROM inventory_item', { id: 'inv-2', unit_id: 'u2', current_quantity: 100 });
      adapter.queueFirst('allow_negative_inventory', { allow_negative_inventory: 0 });

      await refundSale('sale-1');

      const movements = adapter.calls.filter((c) => c.sql.includes('INSERT INTO inventory_movement'));
      expect(movements).toHaveLength(2);
      expect(movements[0].params[2]).toBe('inv-1');
      expect(movements[0].params[3]).toBe('RETURN');
      expect(movements[0].params[4]).toBe(200); // positive = stock returns
      expect(movements[0].params[6]).toBe(50); // original cost preserved
      expect(movements[0].params[9]).toBe('sale');
      expect(movements[0].params[10]).toBe('sale-1');
      expect(movements[0].params[11]).toBe('emp-1');
      expect(movements[1].params[2]).toBe('inv-2');
      expect(movements[1].params[4]).toBe(500);

      const statusCall = adapter.calls.find((c) => c.sql.includes("status = 'REFUNDED'"));
      expect(statusCall).toBeDefined();
      expect(statusCall!.sql).toContain('refunded_at = ?');
      expect(statusCall!.params[0]).toBe(statusCall!.params[1]); // refunded_at === updated_at
    });

    it('throws REPO_INVALID_STATE from a non-COMPLETED sale', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('FROM sale', { ...SALE_ROW, status: 'HELD' });

      const error = await refundSale('sale-1').catch((e: unknown) => e);
      expect(isRepoError(error, REPO_ERROR.INVALID_STATE)).toBe(true);
      expect(adapter.calls.some((c) => c.sql.includes('INSERT INTO inventory_movement'))).toBe(false);
      expect(adapter.calls.some((c) => c.sql.includes('UPDATE sale'))).toBe(false);
    });
  });

  describe('getSaleById', () => {
    it('returns null when the sale is absent', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('FROM sale', null);

      await expect(getSaleById('missing')).resolves.toBeNull();
    });

    it('assembles the sale with its items and payments', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('FROM sale', SALE_ROW);
      adapter.queueAll('FROM sale_item', [SALE_ITEM_ROW]);
      adapter.queueAll('FROM payment', [PAYMENT_ROW]);

      const result = await getSaleById('sale-1');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('sale-1');
      expect(result!.status).toBe('HELD');
      expect(result!.items).toHaveLength(1);
      expect(result!.items[0].productName).toBe('Matcha Latte');
      expect(result!.payments).toHaveLength(1);
      expect(result!.payments[0].amountMinor).toBe(1000);
    });
  });

  describe('listSales', () => {
    const fullPage = Array.from({ length: 50 }, (_, i) => ({
      ...SALE_ROW,
      id: `sale-${i}`,
      created_at: `2026-01-01T00:00:${String(i).padStart(2, '0')}.000Z`,
    }));

    it('emits DESC ordering, keyset clause, filters, and nextCursor on a full page', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueAll('FROM sale', fullPage);

      const result = await listSales({
        status: 'COMPLETED',
        cursor: '2026-01-02T00:00:00.000Z|sale-x',
      });

      const call = adapter.calls.find((c) => c.sql.includes('FROM sale'));
      expect(call).toBeDefined();
      expect(call!.sql).toContain('ORDER BY created_at DESC, id DESC');
      expect(call!.sql).toContain('(created_at, id) < (?, ?)');
      expect(call!.sql).toContain('status = ?');
      // params: [businessId, status, cursorCreatedAt, cursorId, limit]
      expect(call!.params).toEqual([
        'biz-1',
        'COMPLETED',
        '2026-01-02T00:00:00.000Z',
        'sale-x',
        50,
      ]);

      expect(result.items).toHaveLength(50);
      // Full page → cursor encoded from the last row's (created_at, id).
      expect(result.nextCursor).toBe('2026-01-01T00:00:49.000Z|sale-49');
    });

    it('returns null nextCursor on a partial page and omits the keyset clause without a cursor', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueAll('FROM sale', [SALE_ROW]);

      const result = await listSales();

      const call = adapter.calls.find((c) => c.sql.includes('FROM sale'));
      expect(call!.sql).not.toContain('(created_at, id) <');
      expect(call!.sql).toContain('ORDER BY created_at DESC, id DESC');
      expect(call!.params).toEqual(['biz-1', 50]);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].status).toBe('HELD');
      expect(result.nextCursor).toBeNull();
    });

    it('binds employeeId and date-range filters as parameters', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueAll('FROM sale', []);

      await listSales({
        employeeId: 'emp-1',
        from: '2026-01-01T00:00:00.000Z',
        to: '2026-02-01T00:00:00.000Z',
      });

      const call = adapter.calls.find((c) => c.sql.includes('FROM sale'));
      expect(call!.sql).toContain('employee_id = ?');
      expect(call!.sql).toContain('created_at >= ?');
      expect(call!.sql).toContain('created_at <= ?');
      expect(call!.params).toEqual([
        'biz-1',
        'emp-1',
        '2026-01-01T00:00:00.000Z',
        '2026-02-01T00:00:00.000Z',
        50,
      ]);
    });
  });
});

describe('checkoutSale', () => {
  let adapter: RecordingAdapter;

  beforeEach(() => {
    adapter = new RecordingAdapter();
    (getDb as jest.Mock).mockResolvedValue(makeFakeDb(adapter));
    resetBusinessIdForTesting();
  });

  it('creates and completes a fresh sale in one transaction (no dangling HELD row)', async () => {
    const untrackedItem = { ...SALE_ITEM_ROW, product_id: null };
    const completedSale = {
      ...SALE_ROW,
      status: 'COMPLETED',
      subtotal_minor: 500,
      total_minor: 500,
      completed_at: '2026-01-01T01:00:00.000Z',
    };

    adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
    adapter.queueFirst('FROM app_metadata', { value: null }); // nextSaleNumber → S-000001
    adapter.queueFirst('SUM(subtotal_minor)', { total: 500 });
    adapter.queueFirst('discount_minor FROM sale', { discount_minor: 0 });
    adapter.queueFirst('FROM sale', { ...SALE_ROW, subtotal_minor: 500, total_minor: 500 }); // held load
    adapter.queueFirst('FROM sale', { ...SALE_ROW, subtotal_minor: 500, total_minor: 500 }); // complete load (HELD)
    adapter.queueAll('FROM sale_item', [untrackedItem]);
    adapter.queueFirst('type FROM payment_method', { type: 'CASH' });
    adapter.queueFirst('FROM sale', completedSale); // select-back
    adapter.queueAll('FROM sale_item', [untrackedItem]);
    adapter.queueAll('FROM payment', [PAYMENT_ROW]);

    const result = await checkoutSale({
      items: [
        { productId: null, productName: 'Matcha Latte', quantity: 1000, unitPriceMinor: 500 },
      ],
      payments: [{ paymentMethodId: 'pm-cash', amountMinor: 500, amountGivenMinor: 500 }],
    });

    // One sale INSERT, one completion flip, never a cancellation.
    expect(adapter.calls.filter((call) => call.sql.includes('INSERT INTO sale\n'))).toHaveLength(1);
    expect(adapter.calls.some((call) => call.sql.includes("status = 'COMPLETED'"))).toBe(true);
    expect(adapter.calls.some((call) => call.sql.includes("status = 'CANCELLED'"))).toBe(false);
    expect(result.status).toBe('COMPLETED');
    expect(result.totalMinor).toBe(500);
    expect(result.items).toHaveLength(1);
    expect(result.payments).toHaveLength(1);
  });
});
