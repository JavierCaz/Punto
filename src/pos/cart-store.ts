/**
 * POS cart store — the active sale being built.
 *
 * Design (see the Milestone-5 architecture review):
 * - A FRESH cart lives only in memory: adding/removing/adjusting never touches
 *   SQLite, so an abandoned cart never consumes a sale number.
 * - `hold()` persists the cart as a HELD sale (`createHeldSale`) and clears the
 *   active view; `resume(id)` loads a HELD sale back into memory.
 * - Once a cart is backed by a HELD sale (`saleId` set), edits WRITE THROUGH to
 *   the repository and refresh from `getSaleById`, so a resumed order survives.
 * - `checkout(payments)` is atomic: a fresh cart uses `checkoutSale` (create +
 *   complete in one transaction); a resumed cart uses `completeSale`.
 *
 * The store is intentionally global (a module store, like `auth-store`) so the
 * POS catalog, the cart panel, the payment sheet and the held-carts sheet all
 * observe the same cart without prop drilling.
 */

import { create } from 'zustand';

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
import type { PaymentInput, SaleDetail } from '@/db';
import {
  cartLineToSaleItemInput,
  saleItemToCartLine,
  type CartLine,
} from '@/pos/cart-math';

/** Operation that produced a cart error (mapped to i18n copy by the UI). */
export type CartOperation = 'add' | 'update' | 'remove' | 'hold' | 'resume' | 'discard' | 'charge';

/** A failed cart action. `code` is the repository error code when available. */
export interface CartError {
  operation: CartOperation;
  code: string;
}

/** Input required to add a product line to the cart. */
export interface AddProductInput {
  productId: string | null;
  productName: string;
  unitPriceMinor: number;
  unitCostMinor?: number;
}

interface CartState {
  /** Persisted HELD sale id, or null while the cart is memory-only. */
  saleId: string | null;
  /** Human-readable sale number once held, for the cart header. */
  saleNumber: string | null;
  lines: CartLine[];
  /** Employee attributed to the sale (the signed-in user by default). */
  employeeId: string | null;
  /** Attribution restored on reset — the signed-in user. */
  defaultEmployeeId: string | null;
  busy: boolean;
  error: CartError | null;
  addProduct: (input: AddProductInput) => Promise<void>;
  setQuantity: (localId: string, quantity: number) => Promise<void>;
  removeLine: (localId: string) => Promise<void>;
  hold: () => Promise<void>;
  resume: (saleId: string) => Promise<void>;
  discard: () => Promise<void>;
  checkout: (payments: PaymentInput[]) => Promise<SaleDetail | null>;
  setEmployee: (employeeId: string | null) => void;
  reset: () => void;
}

/** Module counter for stable in-memory line keys (never persisted). */
let localSeq = 0;
const nextLocalId = (): string => {
  localSeq += 1;
  return `cart-${localSeq}`;
};

function toCartError(operation: CartOperation, error: unknown): CartError {
  const code = error instanceof Error ? error.message : 'unknown';
  return { operation, code };
}

function makeLine(input: AddProductInput): CartLine {
  return {
    localId: nextLocalId(),
    saleItemId: null,
    productId: input.productId,
    productName: input.productName,
    quantity: 1000,
    unitPriceMinor: input.unitPriceMinor,
    unitCostMinor: input.unitCostMinor ?? 0,
    discountMinor: 0,
  };
}

export const useCartStore = create<CartState>()((set, get) => {
  /** Re-read the persisted HELD sale into the active cart. */
  const refresh = async (): Promise<void> => {
    const saleId = get().saleId;
    if (!saleId) {
      return;
    }
    const detail = await getSaleById(saleId);
    if (!detail) {
      set({ saleId: null, saleNumber: null, lines: [] });
      return;
    }
    set({
      saleId: detail.id,
      saleNumber: detail.saleNumber,
      lines: detail.items.map(saleItemToCartLine),
    });
  };

  return {
    saleId: null,
    saleNumber: null,
    lines: [],
    employeeId: null,
    defaultEmployeeId: null,
    busy: false,
    error: null,

    addProduct: async (input) => {
      const { saleId, lines } = get();
      set({ busy: true, error: null });
      try {
        if (saleId) {
          // Persisted cart: write through, merging onto an existing product line.
          const existing = lines.find(
            (line) => input.productId != null && line.productId === input.productId,
          );
          if (existing && existing.saleItemId) {
            await updateSaleItemQuantity(existing.saleItemId, existing.quantity + 1000);
          } else {
            await addSaleItem(saleId, cartLineToSaleItemInput(makeLine(input)));
          }
          await refresh();
          return;
        }

        const existing = lines.find(
          (line) => input.productId != null && line.productId === input.productId,
        );
        if (existing) {
          set({
            lines: lines.map((line) =>
              line.localId === existing.localId
                ? { ...line, quantity: line.quantity + 1000 }
                : line,
            ),
          });
        } else {
          set({ lines: [...lines, makeLine(input)] });
        }
      } catch (error) {
        set({ error: toCartError('add', error) });
      } finally {
        set({ busy: false });
      }
    },

    setQuantity: async (localId, quantity) => {
      const { saleId, lines } = get();
      if (quantity <= 0) {
        await get().removeLine(localId);
        return;
      }
      set({ busy: true, error: null });
      try {
        if (saleId) {
          const line = lines.find((entry) => entry.localId === localId);
          if (line?.saleItemId) {
            await updateSaleItemQuantity(line.saleItemId, quantity);
            await refresh();
          }
          return;
        }
        set({
          lines: lines.map((line) => (line.localId === localId ? { ...line, quantity } : line)),
        });
      } catch (error) {
        set({ error: toCartError('update', error) });
      } finally {
        set({ busy: false });
      }
    },

    removeLine: async (localId) => {
      const { saleId, lines } = get();
      set({ busy: true, error: null });
      try {
        if (saleId) {
          const line = lines.find((entry) => entry.localId === localId);
          if (line?.saleItemId) {
            await removeSaleItem(line.saleItemId);
          }
          const remaining = lines.filter((entry) => entry.localId !== localId);
          if (remaining.length === 0) {
            // Never leave an empty HELD sale behind.
            await cancelSale(saleId);
            get().reset();
            return;
          }
          await refresh();
          return;
        }
        set({ lines: lines.filter((line) => line.localId !== localId) });
      } catch (error) {
        set({ error: toCartError('remove', error) });
      } finally {
        set({ busy: false });
      }
    },

    hold: async () => {
      const { saleId, lines, employeeId } = get();
      if (lines.length === 0) {
        return;
      }
      set({ busy: true, error: null });
      try {
        if (!saleId) {
          await createHeldSale({
            employeeId: employeeId ?? undefined,
            items: lines.map(cartLineToSaleItemInput),
          });
        }
        set({ saleId: null, saleNumber: null, lines: [] });
      } catch (error) {
        set({ error: toCartError('hold', error) });
      } finally {
        set({ busy: false });
      }
    },

    resume: async (saleId) => {
      set({ busy: true, error: null });
      try {
        const detail = await getSaleById(saleId);
        if (!detail || detail.status !== 'HELD') {
          set({ error: { operation: 'resume', code: 'not-held' } });
          return;
        }
        set({
          saleId: detail.id,
          saleNumber: detail.saleNumber,
          lines: detail.items.map(saleItemToCartLine),
          employeeId: detail.employeeId ?? get().defaultEmployeeId,
        });
      } catch (error) {
        set({ error: toCartError('resume', error) });
      } finally {
        set({ busy: false });
      }
    },

    discard: async () => {
      const { saleId } = get();
      set({ busy: true, error: null });
      try {
        if (saleId) {
          await cancelSale(saleId);
        }
        get().reset();
      } catch (error) {
        set({ error: toCartError('discard', error) });
      } finally {
        set({ busy: false });
      }
    },

    checkout: async (payments) => {
      const { saleId, lines, employeeId } = get();
      if (lines.length === 0) {
        set({ error: { operation: 'charge', code: 'empty-cart' } });
        return null;
      }
      set({ busy: true, error: null });
      try {
        const detail = saleId
          ? await completeSale({
              saleId,
              employeeId: employeeId ?? undefined,
              payments,
            })
          : await checkoutSale({
              items: lines.map(cartLineToSaleItemInput),
              payments,
              employeeId: employeeId ?? undefined,
            });
        get().reset();
        return detail;
      } catch (error) {
        set({ error: toCartError('charge', error) });
        return null;
      } finally {
        set({ busy: false });
      }
    },

    setEmployee: (employeeId) => {
      set({ employeeId, defaultEmployeeId: employeeId });
    },

    reset: () => {
      set({
        saleId: null,
        saleNumber: null,
        lines: [],
        employeeId: get().defaultEmployeeId,
        busy: false,
        error: null,
      });
    },
  };
});
