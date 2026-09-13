/** @jest-environment node */

import {
  cartItemCount,
  cartLineSubtotalMinor,
  cartLineToSaleItemInput,
  cartSubtotalMinor,
  saleItemToCartLine,
  type CartLine,
} from '@/pos/cart-math';
import type { SaleItem } from '@/db';

const line = (overrides: Partial<CartLine> = {}): CartLine => ({
  localId: 'l1',
  saleItemId: null,
  productId: 'p1',
  productName: 'Matcha Latte',
  quantity: 1000,
  unitPriceMinor: 500,
  unitCostMinor: 0,
  discountMinor: 0,
  ...overrides,
});

describe('cart math', () => {
  it('computes line subtotals with the repository rounding formula', () => {
    expect(cartLineSubtotalMinor(line({ quantity: 1500, unitPriceMinor: 333 }))).toBe(500);
    expect(
      cartLineSubtotalMinor(line({ quantity: 1000, unitPriceMinor: 100, discountMinor: 25 })),
    ).toBe(75);
  });

  it('sums line subtotals into the cart subtotal', () => {
    const lines = [
      line({ quantity: 2000, unitPriceMinor: 500 }),
      line({ quantity: 1000, unitPriceMinor: 250 }),
    ];
    expect(cartSubtotalMinor(lines)).toBe(1250);
  });

  it('counts whole units across lines', () => {
    expect(cartItemCount([line({ quantity: 2000 }), line({ quantity: 1000 })])).toBe(3);
    expect(cartItemCount([])).toBe(0);
  });

  it('maps a cart line to a SaleItemInput', () => {
    expect(cartLineToSaleItemInput(line({ productId: null, quantity: 2000 }))).toEqual({
      productId: null,
      productName: 'Matcha Latte',
      quantity: 2000,
      unitPriceMinor: 500,
      discountMinor: 0,
      unitCostMinor: 0,
    });
  });

  it('maps a persisted sale item back to a cart line', () => {
    const item: SaleItem = {
      id: 'si-1',
      saleId: 'sale-1',
      productId: 'p1',
      productName: 'Matcha Latte',
      quantity: 2000,
      unitPriceMinor: 500,
      discountMinor: 0,
      subtotalMinor: 1000,
      unitCostMinor: 50,
      createdAt: '2026-01-01T00:00:00.000Z',
    };

    expect(saleItemToCartLine(item)).toEqual({
      localId: 'si-1',
      saleItemId: 'si-1',
      productId: 'p1',
      productName: 'Matcha Latte',
      quantity: 2000,
      unitPriceMinor: 500,
      unitCostMinor: 50,
      discountMinor: 0,
    });
  });
});
