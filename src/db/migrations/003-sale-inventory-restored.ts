import type { Migration } from '@/db/types';

/**
 * Migration 003 — record whether a refund returned stock to inventory.
 *
 * A refund can either restore the sold stock (the historical default, posting
 * inverting RETURN movements) or deliberately leave it consumed, because the
 * products/ingredients from a returned sale may no longer be sellable
 * (spoiled, opened, consumed). The refund UI lets the user choose, so the sale
 * row must remember which path was taken.
 *
 * - NULL  → not refunded (or refunded before this column existed)
 * - 1     → refund restored inventory
 * - 0     → refund did NOT restore inventory
 *
 * Nullable on purpose: only REFUNDED sales carry a meaningful value, and
 * pre-existing rows stay NULL rather than being backfilled with a guess.
 */
export const migration003SaleInventoryRestored: Migration = {
  version: 3,
  name: '003-sale-inventory-restored',
  up: [
    `ALTER TABLE sale ADD COLUMN inventory_restored INTEGER
       CHECK (inventory_restored IN (0, 1));`,
  ],
};
