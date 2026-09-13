/**
 * Pure POS cart math — no React, no database, no I/O.
 *
 * A cart line is either in-memory (fresh cart, `saleItemId === null`) or backed
 * by a persisted HELD sale line (`saleItemId` set). Money is integer minor units
 * and quantities are integer milli-units (AGENTS §6) — line subtotals come from
 * the SAME helper the sale repository uses (`computeLineSubtotalMinor`), so the
 * cart and the database can never disagree on a line total.
 */

import { computeLineSubtotalMinor } from '@/db/repositories/calc';
import type { MoneyMinor, QuantityMilli, SaleItem, SaleItemInput } from '@/db';

/** One line in the active cart. */
export interface CartLine {
  /** Stable React key; equals `saleItemId` once the line is persisted. */
  localId: string;
  /** `sale_item.id` when the cart is backed by a HELD sale, else null. */
  saleItemId: string | null;
  productId: string | null;
  productName: string;
  /** Quantity in milli-units (1000 = one unit). */
  quantity: QuantityMilli;
  unitPriceMinor: MoneyMinor;
  unitCostMinor: MoneyMinor;
  discountMinor: MoneyMinor;
}

/** Integer-exact subtotal for one line (shared formula with the repository). */
export function cartLineSubtotalMinor(line: CartLine): number {
  return computeLineSubtotalMinor(line.quantity, line.unitPriceMinor, line.discountMinor);
}

/** Integer-exact cart subtotal (sum of line subtotals). */
export function cartSubtotalMinor(lines: CartLine[]): number {
  return lines.reduce((total, line) => total + cartLineSubtotalMinor(line), 0);
}

/** Whole-unit item count for the cart badge (quantities are milli-units). */
export function cartItemCount(lines: CartLine[]): number {
  const milliTotal = lines.reduce((total, line) => total + line.quantity, 0);
  return Math.round(milliTotal / 1000);
}

/** Map a cart line to the repository's `SaleItemInput` shape. */
export function cartLineToSaleItemInput(line: CartLine): SaleItemInput {
  return {
    productId: line.productId,
    productName: line.productName,
    quantity: line.quantity,
    unitPriceMinor: line.unitPriceMinor,
    discountMinor: line.discountMinor,
    unitCostMinor: line.unitCostMinor,
  };
}

/** Map a persisted sale line back into a cart line (used on resume/refresh). */
export function saleItemToCartLine(item: SaleItem): CartLine {
  return {
    localId: item.id,
    saleItemId: item.id,
    productId: item.productId,
    productName: item.productName,
    quantity: item.quantity,
    unitPriceMinor: item.unitPriceMinor,
    unitCostMinor: item.unitCostMinor,
    discountMinor: item.discountMinor,
  };
}
