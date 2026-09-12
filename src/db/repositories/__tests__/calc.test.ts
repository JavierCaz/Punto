/**
 * @jest-environment node
 *
 * Pure calc module tests — integer-only money/quantity/stock math. No database,
 * no floats; these cases pin the exact integer results repositories rely on.
 */

import {
  assertSufficientStock,
  computeChangeMinor,
  computeIngredientCostMinor,
  computeRecipeConsumptionMilli,
  computeRecipeCostMinor,
  computeTaxMinor,
  scaleQuantityByCount,
  sumMinor,
  weightedAverageUnitCostMinor,
} from '@/db/repositories/calc';
import { REPO_ERROR, isRepoError } from '@/db/repositories/errors';

describe('computeTaxMinor', () => {
  it('computes basis-point tax in integer minor units', () => {
    expect(computeTaxMinor(1000, 1600)).toBe(160); // $10.00 × 16.00%
    expect(computeTaxMinor(0, 1600)).toBe(0);
  });

  it('rounds fractional tax to the nearest minor unit', () => {
    expect(computeTaxMinor(333, 1600)).toBe(53); // 53.28 → 53
    expect(computeTaxMinor(334, 1600)).toBe(53); // 53.44 → 53
    expect(computeTaxMinor(335, 1600)).toBe(54); // 53.60 → 54
  });
});

describe('sumMinor', () => {
  it('sums integer minor units exactly (no float drift)', () => {
    expect(sumMinor([199, 1, 1])).toBe(201); // 1.99 + 0.01 + 0.01
    expect(sumMinor([1000000, 999999])).toBe(1999999);
  });

  it('returns 0 for an empty list', () => {
    expect(sumMinor([])).toBe(0);
  });
});

describe('computeChangeMinor', () => {
  it('returns positive change when overpaid and 0 when exact', () => {
    expect(computeChangeMinor(2000, 1250)).toBe(750);
    expect(computeChangeMinor(1250, 1250)).toBe(0);
  });

  it('throws REPO_INVALID_STATE when underpaid', () => {
    try {
      computeChangeMinor(1000, 1250);
      throw new Error('expected throw');
    } catch (error) {
      expect(isRepoError(error, REPO_ERROR.INVALID_STATE)).toBe(true);
    }
  });
});

describe('scaleQuantityByCount', () => {
  it('scales a milli-quantity by a line count', () => {
    expect(scaleQuantityByCount(500, 3)).toBe(1500); // 0.5 g × 3
    expect(scaleQuantityByCount(1000, 1)).toBe(1000);
    expect(scaleQuantityByCount(1000, 0)).toBe(0);
  });
});

describe('weightedAverageUnitCostMinor', () => {
  it('computes an integer weighted-average unit cost', () => {
    // 2 units @ $1.00 + 3 units @ $2.00 = $8.00 / 5 = $1.60
    expect(weightedAverageUnitCostMinor(2000, 100, 3000, 200)).toBe(160);
  });

  it('rounds to the nearest minor unit', () => {
    // 1 unit @ $1.00 + 2 units @ $1.01 → (100 + 202) / 3 = 100.67 → 101
    expect(weightedAverageUnitCostMinor(1000, 100, 2000, 101)).toBe(101);
  });

  it('guards a zero total quantity', () => {
    expect(() => weightedAverageUnitCostMinor(0, 0, 0, 0)).toThrow();
  });
});

describe('assertSufficientStock', () => {
  it('does not throw when the resulting quantity stays non-negative', () => {
    expect(() => assertSufficientStock(100, -50, false)).not.toThrow();
    expect(() => assertSufficientStock(50, -50, false)).not.toThrow();
  });

  it('throws INVENTORY_INSUFFICIENT_STOCK when the result would go negative', () => {
    try {
      assertSufficientStock(10, -20, false);
      throw new Error('expected throw');
    } catch (error) {
      expect(isRepoError(error, REPO_ERROR.INSUFFICIENT_STOCK)).toBe(true);
    }
  });

  it('allows negative results when the business opts in', () => {
    expect(() => assertSufficientStock(10, -20, true)).not.toThrow();
  });
});

describe('computeRecipeConsumptionMilli', () => {
  it('scales a per-portion recipe quantity by the sold line quantity', () => {
    // 8 g per latte × 2 lattes = 16 g (8000 milli × 2000 milli / 1000).
    expect(computeRecipeConsumptionMilli(8000, 2000)).toBe(16000);
    // 8 g per latte × 1 latte = 8 g.
    expect(computeRecipeConsumptionMilli(8000, 1000)).toBe(8000);
    // 0.5 g per portion × 2 portions = 1 g.
    expect(computeRecipeConsumptionMilli(500, 2000)).toBe(1000);
  });

  it('rounds the consumed milli-quantity to the nearest milli-unit', () => {
    // 333 milli × 1.5 portions = 499.5 → 500.
    expect(computeRecipeConsumptionMilli(333, 1500)).toBe(500);
    // 333 milli × 1 portion = 333 (exact, no float drift).
    expect(computeRecipeConsumptionMilli(333, 1000)).toBe(333);
  });

  it('returns 0 for a tiny quantity that rounds away', () => {
    expect(computeRecipeConsumptionMilli(1, 1)).toBe(0); // 0.001 milli → 0
    expect(computeRecipeConsumptionMilli(1, 499)).toBe(0); // 0.499 → 0
  });
});

describe('computeIngredientCostMinor', () => {
  it('scales a consumed milli-quantity by a per-unit cost', () => {
    // 16000 milli (16 g) × 50 cents/unit = 800 cents.
    expect(computeIngredientCostMinor(16000, 50)).toBe(800);
    expect(computeIngredientCostMinor(0, 50)).toBe(0);
  });

  it('rounds the cost to the nearest minor unit', () => {
    expect(computeIngredientCostMinor(333, 50)).toBe(17); // 16.65 → 17
    expect(computeIngredientCostMinor(166, 50)).toBe(8); // 8.3 → 8
  });
});

describe('computeRecipeCostMinor', () => {
  it('sums each ingredient cost into a per-portion recipe cost', () => {
    // matcha 8000 milli × 50 = 400; milk 200000 milli × 2 = 400 → 800.
    const cost = computeRecipeCostMinor([
      { quantityMilli: 8000, unitCostMinor: 50 },
      { quantityMilli: 200000, unitCostMinor: 2 },
    ]);
    expect(cost).toBe(800);
  });

  it('returns 0 for an empty ingredient list', () => {
    expect(computeRecipeCostMinor([])).toBe(0);
  });
});
