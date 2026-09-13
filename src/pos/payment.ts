/**
 * Pure POS payment-sheet money math — single and split payments, cash tender
 * and change. No React, no I/O and no database access, so it is unit-tested in
 * the node jest environment (AGENTS §9.4).
 *
 * Money is INTEGER minor units (cents) everywhere; never floating-point money
 * math (AGENTS §6). Type-only imports from `@/db` keep this module free of
 * expo-sqlite at runtime, so it can be imported by pure node tests.
 */

import type { MoneyMinor, PaymentInput, PaymentMethod } from '@/db';

export interface PaymentAllocation {
  methodId: string;
  /** Amount charged to this method, integer minor units. */
  amountMinor: MoneyMinor;
  /** Cash tendered (CASH only); integer minor units, >= amountMinor when set. */
  amountGivenMinor?: MoneyMinor;
}

export type PaymentIssue =
  | 'empty'
  | 'amount-invalid'
  | 'remaining'
  | 'cash-given'
  | 'method-missing';

/** Sum of all allocation amounts (integer). */
export function sumAllocatedMinor(allocations: PaymentAllocation[]): number {
  return allocations.reduce((total, allocation) => total + allocation.amountMinor, 0);
}

/** total - sumAllocated. May be negative when over-allocated. */
export function remainingMinor(totalMinor: MoneyMinor, allocations: PaymentAllocation[]): number {
  return totalMinor - sumAllocatedMinor(allocations);
}

/** Cash change for one allocation: amountGiven - amount (0 when not cash/not given). */
export function changeForAllocation(allocation: PaymentAllocation): number {
  const { amountMinor, amountGivenMinor } = allocation;
  if (amountGivenMinor === undefined) {
    return 0;
  }
  return amountGivenMinor - amountMinor;
}

/**
 * "Nice" cash tender rounding steps, in integer minor units. With 2 decimal
 * places these are 10/20/50/100 major currency units (1000/2000/5000/10000
 * minor).
 */
const QUICK_CASH_STEPS_MINOR: readonly number[] = [1000, 2000, 5000, 10000];

/**
 * Validate the draft against the total and the known methods.
 * Returns null when valid, otherwise the FIRST issue found (in the order listed above).
 * Rules: at least one allocation with amount>0; every amountMinor is a positive integer;
 * sum === totalMinor exactly; every methodId exists in `methods`; amountGivenMinor, when
 * present, only allowed when the method type is 'CASH' and must be >= amountMinor.
 */
export function validatePayments(
  totalMinor: MoneyMinor,
  methods: PaymentMethod[],
  allocations: PaymentAllocation[],
): PaymentIssue | null {
  // At least one allocation must carry a positive amount.
  if (!allocations.some((allocation) => allocation.amountMinor > 0)) {
    return 'empty';
  }

  // Every amount must be a positive integer (money is integer minor units).
  if (
    allocations.some(
      (allocation) => !Number.isInteger(allocation.amountMinor) || allocation.amountMinor <= 0,
    )
  ) {
    return 'amount-invalid';
  }

  // The allocations must sum exactly to the total.
  if (sumAllocatedMinor(allocations) !== totalMinor) {
    return 'remaining';
  }

  const methodById = new Map(methods.map((method) => [method.id, method]));

  // Cash tendered is only valid on a CASH method and must cover the amount.
  // Runs before the method-missing check (issue order: cash-given first).
  for (const allocation of allocations) {
    if (allocation.amountGivenMinor === undefined) {
      continue;
    }
    const method = methodById.get(allocation.methodId);
    if (method?.type !== 'CASH' || allocation.amountGivenMinor < allocation.amountMinor) {
      return 'cash-given';
    }
  }

  // Every allocation must reference a known method.
  for (const allocation of allocations) {
    if (!methodById.has(allocation.methodId)) {
      return 'method-missing';
    }
  }

  return null;
}

/** Map allocations to repository PaymentInput[] (only amount>0), preserving given cash. */
export function buildPaymentInputs(allocations: PaymentAllocation[]): PaymentInput[] {
  return allocations
    .filter((allocation) => allocation.amountMinor > 0)
    .map((allocation) => {
      const input: PaymentInput = {
        paymentMethodId: allocation.methodId,
        amountMinor: allocation.amountMinor,
      };
      if (allocation.amountGivenMinor !== undefined) {
        input.amountGivenMinor = allocation.amountGivenMinor;
      }
      return input;
    });
}

/**
 * "Nice" cash tender suggestions in integer minor units, strictly >= dueMinor,
 * ascending, deduplicated, at most 4 values. Round up to the next multiple of
 * 10, 20, 50 and 100 major units (i.e. 1000/2000/5000/10000 minor with 2 decimals);
 * include the exact due amount as the first suggestion when dueMinor > 0.
 */
export function quickCashAmounts(dueMinor: MoneyMinor): number[] {
  if (dueMinor <= 0) {
    return [];
  }

  const candidates = new Set<number>([dueMinor]);
  for (const step of QUICK_CASH_STEPS_MINOR) {
    // Integer-only rounding: ceil(due / step) * step stays in minor units.
    candidates.add(Math.ceil(dueMinor / step) * step);
  }

  return Array.from(candidates)
    .filter((amount) => amount >= dueMinor)
    .sort((a, b) => a - b)
    .slice(0, 4);
}
