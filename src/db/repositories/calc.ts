import { REPO_ERROR, repoError } from '@/db/repositories/errors';


/**
 * Pure money / quantity / stock arithmetic — no database access, no floats.
 *
 * All money is INTEGER minor units (cents) and all quantities are INTEGER
 * milli-units (×1000), per AGENTS §6. These helpers centralize the few
 * computations that recur across repositories (totals, tax, change, stock
 * movement signing, weighted-average cost) so no repository reinvents them and
 * no floating-point arithmetic ever touches money.
 */

/** Sum integer minor units exactly (safe up to Number.MAX_SAFE_INTEGER). */
export function sumMinor(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

/**
 * Tax on an integer minor-unit base at an integer basis-point rate.
 *
 * `rateBp` is basis points: `1600` = 16.00%. The result is rounded half-away-
 * from-zero to the nearest minor unit, keeping money integer-exact.
 */
export function computeTaxMinor(baseMinor: number, rateBp: number): number {
  return Math.round((baseMinor * rateBp) / 10000);
}

/**
 * Cash change due: `amountGivenMinor - amountMinor`.
 *
 * Throws `REPO_INVALID_STATE` when the amount given is less than the amount
 * due (a negative change is a caller bug, not a valid state).
 */
export function computeChangeMinor(amountGivenMinor: number, amountMinor: number): number {
  const change = amountGivenMinor - amountMinor;
  if (change < 0) {
    throw repoError(REPO_ERROR.INVALID_STATE, 'amount given is less than the amount due');
  }
  return change;
}

/** Scale a per-unit milli-quantity by a line count (e.g. 0.5 g × 3 = 1.5 g). */
export function scaleQuantityByCount(quantityMilli: number, count: number): number {
  return quantityMilli * count;
}

/**
 * Weighted-average unit cost after adding stock, in integer minor units.
 *
 * `prevQtyMilli` / `addedQtyMilli` are milli-quantities; the costs are per
 * display-unit minor currency. The result is the new average cost per display
 * unit, rounded to the nearest minor unit. Quantities must be non-negative and
 * their total must be positive (guards division by zero).
 */
export function weightedAverageUnitCostMinor(
  prevQtyMilli: number,
  prevUnitCostMinor: number,
  addedQtyMilli: number,
  addedUnitCostMinor: number,
): number {
  const totalQtyMilli = prevQtyMilli + addedQtyMilli;
  if (totalQtyMilli <= 0) {
    throw repoError(REPO_ERROR.INVALID_STATE, 'cannot compute weighted average over zero quantity');
  }
  const prevTotalMinor = prevQtyMilli * prevUnitCostMinor;
  const addedTotalMinor = addedQtyMilli * addedUnitCostMinor;
  return Math.round((prevTotalMinor + addedTotalMinor) / totalQtyMilli);
}

/**
 * Guard a stock mutation: throw `INVENTORY_INSUFFICIENT_STOCK` when applying
 * `deltaMilli` (already signed) to `currentMilli` would go negative — unless
 * `allowNegative` (the business opted into negative inventory).
 */
export function assertSufficientStock(
  currentMilli: number,
  deltaMilli: number,
  allowNegative: boolean,
): void {
  if (allowNegative) return;
  if (currentMilli + deltaMilli < 0) {
    throw repoError(REPO_ERROR.INSUFFICIENT_STOCK);
  }
}
