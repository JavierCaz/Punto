/** @jest-environment node */

import type { PaymentMethod } from '@/db';
import {
  buildPaymentInputs,
  changeForAllocation,
  quickCashAmounts,
  remainingMinor,
  sumAllocatedMinor,
  validatePayments,
  type PaymentAllocation,
} from '@/pos/payment';

function makeMethod(overrides: Partial<PaymentMethod> = {}): PaymentMethod {
  return {
    id: 'cash',
    businessId: 'biz-1',
    name: 'Efectivo',
    type: 'CASH',
    isDefault: true,
    isActive: true,
    sortOrder: 0,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

const methods: PaymentMethod[] = [
  makeMethod({ id: 'cash', type: 'CASH', name: 'Efectivo', sortOrder: 0 }),
  makeMethod({ id: 'card', type: 'CARD', name: 'Tarjeta', isDefault: false, sortOrder: 1 }),
  makeMethod({
    id: 'transfer',
    type: 'TRANSFER',
    name: 'Transferencia',
    isDefault: false,
    sortOrder: 2,
  }),
];

function alloc(overrides: Partial<PaymentAllocation> = {}): PaymentAllocation {
  return { methodId: 'cash', amountMinor: 1000, ...overrides };
}

describe('sumAllocatedMinor / remainingMinor', () => {
  it('sums allocation amounts as integers', () => {
    expect(
      sumAllocatedMinor([
        alloc({ methodId: 'cash', amountMinor: 1000 }),
        alloc({ methodId: 'card', amountMinor: 500 }),
      ]),
    ).toBe(1500);
    expect(sumAllocatedMinor([])).toBe(0);
  });

  it('computes the remaining amount', () => {
    expect(
      remainingMinor(2000, [alloc({ methodId: 'cash', amountMinor: 1000 })]),
    ).toBe(1000);
  });

  it('goes negative when over-allocated', () => {
    expect(remainingMinor(1000, [alloc({ amountMinor: 1500 })])).toBe(-500);
  });
});

describe('changeForAllocation', () => {
  it('returns the cash change when tender was given', () => {
    expect(changeForAllocation(alloc({ amountMinor: 1000, amountGivenMinor: 2000 }))).toBe(1000);
  });

  it('returns zero for exact cash tender', () => {
    expect(changeForAllocation(alloc({ amountMinor: 1000, amountGivenMinor: 1000 }))).toBe(0);
  });

  it('returns zero when no cash was given', () => {
    expect(changeForAllocation(alloc({ methodId: 'card', amountMinor: 1000 }))).toBe(0);
  });
});

describe('validatePayments', () => {
  it('accepts a single full payment', () => {
    expect(validatePayments(1000, methods, [alloc({ amountMinor: 1000 })])).toBeNull();
  });

  it('accepts a split across multiple methods that sum exactly', () => {
    expect(
      validatePayments(3000, methods, [
        alloc({ methodId: 'cash', amountMinor: 1000 }),
        alloc({ methodId: 'card', amountMinor: 1500 }),
        alloc({ methodId: 'transfer', amountMinor: 500 }),
      ]),
    ).toBeNull();
  });

  it('accepts valid cash tender on a cash method', () => {
    expect(
      validatePayments(1000, methods, [alloc({ amountMinor: 1000, amountGivenMinor: 2000 })]),
    ).toBeNull();
  });

  it('rejects a sum that does not match the total', () => {
    expect(validatePayments(1000, methods, [alloc({ amountMinor: 800 })])).toBe('remaining');
    expect(validatePayments(1000, methods, [alloc({ amountMinor: 1200 })])).toBe('remaining');
  });

  it('rejects zero and negative amounts', () => {
    expect(
      validatePayments(500, methods, [
        alloc({ amountMinor: 500 }),
        alloc({ methodId: 'card', amountMinor: 0 }),
      ]),
    ).toBe('amount-invalid');
    expect(
      validatePayments(500, methods, [
        alloc({ amountMinor: 500 }),
        alloc({ methodId: 'card', amountMinor: -100 }),
      ]),
    ).toBe('amount-invalid');
    expect(
      validatePayments(500, methods, [alloc({ amountMinor: 250.5 })]),
    ).toBe('amount-invalid');
  });

  it('rejects an empty allocation list', () => {
    expect(validatePayments(1000, methods, [])).toBe('empty');
    expect(validatePayments(1000, methods, [alloc({ amountMinor: 0 })])).toBe('empty');
  });

  it('rejects an unknown method id', () => {
    expect(validatePayments(1000, methods, [alloc({ methodId: 'crypto', amountMinor: 1000 })])).toBe(
      'method-missing',
    );
  });

  it('rejects cash given below the amount', () => {
    expect(
      validatePayments(1000, methods, [alloc({ amountMinor: 1000, amountGivenMinor: 500 })]),
    ).toBe('cash-given');
  });

  it('rejects cash given on a non-cash method', () => {
    expect(
      validatePayments(1000, methods, [
        alloc({ methodId: 'card', amountMinor: 1000, amountGivenMinor: 2000 }),
      ]),
    ).toBe('cash-given');
  });
});

describe('buildPaymentInputs', () => {
  it('drops zero and negative amounts, keeping only amount>0', () => {
    expect(
      buildPaymentInputs([
        alloc({ methodId: 'cash', amountMinor: 1000 }),
        alloc({ methodId: 'card', amountMinor: 0 }),
        alloc({ methodId: 'transfer', amountMinor: -100 }),
        alloc({ methodId: 'card', amountMinor: 500 }),
      ]),
    ).toEqual([
      { paymentMethodId: 'cash', amountMinor: 1000 },
      { paymentMethodId: 'card', amountMinor: 500 },
    ]);
  });

  it('preserves cash tender for a cash allocation', () => {
    expect(
      buildPaymentInputs([alloc({ methodId: 'cash', amountMinor: 1000, amountGivenMinor: 2000 })]),
    ).toEqual([{ paymentMethodId: 'cash', amountMinor: 1000, amountGivenMinor: 2000 }]);
  });

  it('omits cash tender when none was given', () => {
    expect(buildPaymentInputs([alloc({ methodId: 'card', amountMinor: 1000 })])).toEqual([
      { paymentMethodId: 'card', amountMinor: 1000 },
    ]);
  });
});

describe('quickCashAmounts', () => {
  it('returns nothing for a non-positive due', () => {
    expect(quickCashAmounts(0)).toEqual([]);
    expect(quickCashAmounts(-100)).toEqual([]);
  });

  it('leads with the exact due amount', () => {
    expect(quickCashAmounts(500)).toEqual([500, 1000, 2000, 5000]);
  });

  it('rounds up to the next nice multiple', () => {
    expect(quickCashAmounts(800)).toEqual([800, 1000, 2000, 5000]);
    expect(quickCashAmounts(3500)).toEqual([3500, 4000, 5000, 10000]);
  });

  it('deduplicates when the due is already a nice multiple', () => {
    expect(quickCashAmounts(1000)).toEqual([1000, 2000, 5000, 10000]);
    expect(quickCashAmounts(10000)).toEqual([10000]);
  });

  it('caps the result at four ascending values', () => {
    const amounts = quickCashAmounts(1);
    expect(amounts).toEqual([1, 1000, 2000, 5000]);
    expect(amounts.length).toBeLessThanOrEqual(4);
    for (let i = 1; i < amounts.length; i++) {
      expect(amounts[i]).toBeGreaterThan(amounts[i - 1]);
    }
  });
});
