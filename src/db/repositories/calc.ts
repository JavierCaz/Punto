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

/**
 * Ingredient quantity consumed by selling `lineQuantityMilli` of a product
 * whose recipe uses `recipeQuantityMilli` of the ingredient per portion.
 *
 * Both quantities are milli-units of the same inventory item's unit; the
 * product is rounded to the nearest milli-unit so a sale always posts an
 * integer-exact ledger delta (AGENTS §6 — never floats). A tiny quantity may
 * legitimately round to 0, which callers treat as a no-op.
 */
export function computeRecipeConsumptionMilli(
  recipeQuantityMilli: number,
  lineQuantityMilli: number,
): number {
  return Math.round((recipeQuantityMilli * lineQuantityMilli) / 1000);
}

/**
 * Cost, in integer minor currency, of consuming `consumedMilli` of an
 * ingredient whose cost is `unitCostMinor` per DISPLAY unit. `consumedMilli`
 * is milli-units, so the cost is scaled by 1000 and rounded to the nearest
 * minor unit.
 */
export function computeIngredientCostMinor(
  consumedMilli: number,
  unitCostMinor: number,
): number {
  return Math.round((consumedMilli * unitCostMinor) / 1000);
}

/**
 * Cost, in integer minor currency, of ONE recipe portion: the sum of every
 * ingredient's `quantityMilli × unitCostMinor / 1000` (each rounded). Used to
 * surface a recipe's estimated cost in the builder and to snapshot cost on
 * sale lines.
 */
export function computeRecipeCostMinor(
  items: readonly { quantityMilli: number; unitCostMinor: number }[],
): number {
  return items.reduce(
    (total, item) => total + computeIngredientCostMinor(item.quantityMilli, item.unitCostMinor),
    0,
  );
}

/**
 * Line subtotal in integer minor units: the per-display-unit price scaled by
 * the milli-quantity, rounded, then reduced by any line discount. Integer-only
 * (AGENTS §6 — no float money math).
 *
 * Shared by the sale repository and the POS cart so both compute identical
 * line totals (the single source of truth for `round(qty*price/1000) − disc`).
 */
export function computeLineSubtotalMinor(
  quantityMilli: number,
  unitPriceMinor: number,
  discountMinor: number,
): number {
  return Math.round((quantityMilli * unitPriceMinor) / 1000) - discountMinor;
}
