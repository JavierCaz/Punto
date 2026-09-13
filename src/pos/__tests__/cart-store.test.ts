/** @jest-environment node */

import {
  addSaleItem,
  cancelSale,
  checkoutSale,
  completeSale,
  createHeldSale,
  getSaleById,
  removeSaleItem,
  updateSaleItemQuantity,
} from '@/db';
import type { SaleDetail } from '@/db';
import { useCartStore } from '@/pos/cart-store';

jest.mock('@/db', () => ({
  addSaleItem: jest.fn(),
  cancelSale: jest.fn(),
  checkoutSale: jest.fn(),
  completeSale: jest.fn(),
  createHeldSale: jest.fn(),
  getSaleById: jest.fn(),
  removeSaleItem: jest.fn(),
  updateSaleItemQuantity: jest.fn(),
}));

const mockAddSaleItem = addSaleItem as jest.MockedFunction<typeof addSaleItem>;
const mockCancelSale = cancelSale as jest.MockedFunction<typeof cancelSale>;
const mockCheckoutSale = checkoutSale as jest.MockedFunction<typeof checkoutSale>;
const mockCompleteSale = completeSale as jest.MockedFunction<typeof completeSale>;
const mockCreateHeldSale = createHeldSale as jest.MockedFunction<typeof createHeldSale>;
const mockGetSaleById = getSaleById as jest.MockedFunction<typeof getSaleById>;
const mockRemoveSaleItem = removeSaleItem as jest.MockedFunction<typeof removeSaleItem>;
const mockUpdateQuantity = updateSaleItemQuantity as jest.MockedFunction<
  typeof updateSaleItemQuantity
>;

const detail = (overrides: Partial<SaleDetail> = {}): SaleDetail => ({
  id: 'sale-1',
  businessId: 'biz-1',
  saleNumber: 'S-000001',
  status: 'HELD',
  subtotalMinor: 500,
  discountMinor: 0,
  taxMinor: 0,
  totalMinor: 500,
  employeeId: null,
  notes: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  completedAt: null,
  cancelledAt: null,
  refundedAt: null,
  items: [
    {
      id: 'si-1',
      saleId: 'sale-1',
      productId: 'p1',
      productName: 'Matcha Latte',
      quantity: 1000,
      unitPriceMinor: 500,
      discountMinor: 0,
      subtotalMinor: 500,
      unitCostMinor: 0,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  payments: [],
  ...overrides,
});

const product = { productId: 'p1', productName: 'Matcha Latte', unitPriceMinor: 500 };

beforeEach(() => {
  jest.clearAllMocks();
  useCartStore.getState().reset();
});

describe('cart store — fresh (memory-only) cart', () => {
  it('adds products without touching the database', async () => {
    await useCartStore.getState().addProduct(product);

    expect(useCartStore.getState().lines).toHaveLength(1);
    expect(useCartStore.getState().saleId).toBeNull();
    expect(mockCreateHeldSale).not.toHaveBeenCalled();
    expect(mockAddSaleItem).not.toHaveBeenCalled();
  });

  it('merges a repeated product onto the same line', async () => {
    await useCartStore.getState().addProduct(product);
    await useCartStore.getState().addProduct(product);

    const { lines } = useCartStore.getState();
    expect(lines).toHaveLength(1);
    expect(lines[0].quantity).toBe(2000);
  });

  it('adjusts quantity and removes lines in memory', async () => {
    await useCartStore.getState().addProduct(product);
    const localId = useCartStore.getState().lines[0].localId;

    await useCartStore.getState().setQuantity(localId, 3000);
    expect(useCartStore.getState().lines[0].quantity).toBe(3000);

    await useCartStore.getState().removeLine(localId);
    expect(useCartStore.getState().lines).toHaveLength(0);
  });

  it('holds a fresh cart by persisting it, then clears the active view', async () => {
    mockCreateHeldSale.mockResolvedValue(detail());
    await useCartStore.getState().addProduct(product);

    await useCartStore.getState().hold();

    expect(mockCreateHeldSale).toHaveBeenCalledWith({
      employeeId: undefined,
      items: [
        expect.objectContaining({ productId: 'p1', quantity: 1000, unitPriceMinor: 500 }),
      ],
    });
    expect(useCartStore.getState().saleId).toBeNull();
    expect(useCartStore.getState().lines).toHaveLength(0);
  });
});

describe('cart store — resumed HELD cart writes through', () => {
  it('resumes a held sale into memory', async () => {
    mockGetSaleById.mockResolvedValue(detail());

    await useCartStore.getState().resume('sale-1');

    const state = useCartStore.getState();
    expect(state.saleId).toBe('sale-1');
    expect(state.saleNumber).toBe('S-000001');
    expect(state.lines).toHaveLength(1);
    expect(state.lines[0].saleItemId).toBe('si-1');
  });

  it('rejects resuming a non-HELD sale', async () => {
    mockGetSaleById.mockResolvedValue(detail({ status: 'COMPLETED' }));

    await useCartStore.getState().resume('sale-1');

    expect(useCartStore.getState().saleId).toBeNull();
    expect(useCartStore.getState().error).toEqual({ operation: 'resume', code: 'not-held' });
  });

  it('adds a new product line through addSaleItem and refreshes', async () => {
    mockGetSaleById
      .mockResolvedValueOnce(detail())
      .mockResolvedValueOnce(
        detail({
          items: [
            detail().items[0],
            {
              ...detail().items[0],
              id: 'si-2',
              productId: 'p2',
              productName: 'Chips',
              quantity: 1000,
              unitPriceMinor: 300,
              subtotalMinor: 300,
            },
          ],
          subtotalMinor: 800,
          totalMinor: 800,
        }),
      );

    await useCartStore.getState().resume('sale-1');
    await useCartStore.getState().addProduct({
      productId: 'p2',
      productName: 'Chips',
      unitPriceMinor: 300,
    });

    expect(mockAddSaleItem).toHaveBeenCalledWith(
      'sale-1',
      expect.objectContaining({ productId: 'p2', quantity: 1000 }),
    );
    expect(useCartStore.getState().lines).toHaveLength(2);
  });

  it('updates and removes persisted lines through the repository', async () => {
    mockGetSaleById.mockResolvedValue(detail());

    await useCartStore.getState().resume('sale-1');
    await useCartStore.getState().setQuantity('si-1', 3000);
    expect(mockUpdateQuantity).toHaveBeenCalledWith('si-1', 3000);

    await useCartStore.getState().removeLine('si-1');
    expect(mockRemoveSaleItem).toHaveBeenCalledWith('si-1');
    expect(mockCancelSale).toHaveBeenCalledWith('sale-1');
    expect(useCartStore.getState().saleId).toBeNull();
  });
});

describe('cart store — checkout and discard', () => {
  it('checks out a fresh cart with the atomic checkoutSale', async () => {
    const completed = detail({ status: 'COMPLETED' });
    mockCheckoutSale.mockResolvedValue(completed);
    await useCartStore.getState().addProduct(product);

    const result = await useCartStore.getState().checkout([
      { paymentMethodId: 'pm-cash', amountMinor: 500, amountGivenMinor: 500 },
    ]);

    expect(mockCheckoutSale).toHaveBeenCalledWith({
      items: [expect.objectContaining({ productId: 'p1', quantity: 1000 })],
      payments: [{ paymentMethodId: 'pm-cash', amountMinor: 500, amountGivenMinor: 500 }],
      employeeId: undefined,
    });
    expect(result).toBe(completed);
    expect(useCartStore.getState().lines).toHaveLength(0);
  });

  it('checks out a resumed cart with completeSale', async () => {
    mockGetSaleById.mockResolvedValue(detail());
    mockCompleteSale.mockResolvedValue(detail({ status: 'COMPLETED' }));

    await useCartStore.getState().resume('sale-1');
    await useCartStore.getState().checkout([
      { paymentMethodId: 'pm-card', amountMinor: 500 },
    ]);

    expect(mockCompleteSale).toHaveBeenCalledWith({
      saleId: 'sale-1',
      employeeId: undefined,
      payments: [{ paymentMethodId: 'pm-card', amountMinor: 500 }],
    });
    expect(mockCheckoutSale).not.toHaveBeenCalled();
  });

  it('refuses to check out an empty cart', async () => {
    const result = await useCartStore.getState().checkout([]);

    expect(result).toBeNull();
    expect(useCartStore.getState().error).toEqual({ operation: 'charge', code: 'empty-cart' });
  });

  it('surfaces the repository error code when a charge fails', async () => {
    mockCheckoutSale.mockRejectedValue(new Error('INVENTORY_INSUFFICIENT_STOCK'));
    await useCartStore.getState().addProduct(product);

    const result = await useCartStore.getState().checkout([
      { paymentMethodId: 'pm-cash', amountMinor: 500 },
    ]);

    expect(result).toBeNull();
    expect(useCartStore.getState().error).toEqual({
      operation: 'charge',
      code: 'INVENTORY_INSUFFICIENT_STOCK',
    });
    expect(useCartStore.getState().lines).toHaveLength(1);
  });

  it('discards a held cart by cancelling it', async () => {
    mockGetSaleById.mockResolvedValue(detail());

    await useCartStore.getState().resume('sale-1');
    await useCartStore.getState().discard();

    expect(mockCancelSale).toHaveBeenCalledWith('sale-1');
    expect(useCartStore.getState().saleId).toBeNull();
  });

  it('attributes the sale to the configured employee', async () => {
    mockCheckoutSale.mockResolvedValue(detail({ status: 'COMPLETED' }));
    useCartStore.getState().setEmployee('emp-9');
    await useCartStore.getState().addProduct(product);

    await useCartStore.getState().checkout([{ paymentMethodId: 'pm-cash', amountMinor: 500 }]);

    expect(mockCheckoutSale).toHaveBeenCalledWith(
      expect.objectContaining({ employeeId: 'emp-9' }),
    );
  });

  it('attributes a resumed sale to its original employee and restores self on reset', async () => {
    useCartStore.getState().setEmployee('emp-1');
    mockGetSaleById.mockResolvedValue(detail({ employeeId: 'emp-7' }));

    await useCartStore.getState().resume('sale-1');
    expect(useCartStore.getState().employeeId).toBe('emp-7');

    useCartStore.getState().reset();
    expect(useCartStore.getState().employeeId).toBe('emp-1');
  });
});
