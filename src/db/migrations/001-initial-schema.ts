import type { Migration } from '@/db/types';

/**
 * Migration 001 — initial Punto schema.
 *
 * Design decisions (see AGENTS.md §3, §6, §9 and the NEXO schema review):
 *
 * - Single business per database; every domain table is business-scoped and
 *   cascades when the business row is removed (export/import replaces whole DB).
 * - Money is INTEGER minor units (cents). NEVER floats. Tax rates are integer
 *   basis points (`_bp`, e.g. 1600 = 16.00%).
 * - Quantities are INTEGER × QUANTITY_SCALE (1000) of the row's `unit_id`
 *   (milli-units: 0.5 g = 500). This mirrors the money rule and avoids float
 *   drift over long ledgers. No unit-conversion math in v1.
 * - Timestamps are ISO-8601 UTC TEXT, sortable lexicographically.
 * - Soft delete via `archived_at` (catalog/suppliers/employees); `is_active`
 *   toggles availability (hide from POS) without deleting. Ledger/history rows
 *   are never hard-deleted. Unique business names use partial unique indexes
 *   scoped to non-archived rows so archived names can be reused.
 * - `inventory_movement` is the single stock ledger (types INITIAL_STOCK /
 *   PURCHASE / SALE / WASTE / ADJUSTMENT / RETURN). A refunded or cancelled
 *   sale posts RETURN movements that invert its SALE movements. Quantity is
 *   signed (+in / −out).
 * - Products vs stock: `product.inventory_item_id` is an optional 1:1 bridge.
 *   When set, selling the product decrements that stock item directly (retail:
 *   a bag of chips). When NULL and the product has a recipe, selling decrements
 *   recipe ingredients (restaurant). When NULL and no recipe: not tracked.
 * - `recipe` is product-bound in v1 (no nested batch/sub-recipes yet).
 * - Expenses / other income that are not sales or purchases live in
 *   `financial_transaction` against seeded `financial_category` rows.
 * - Deferred from v1 (NOT modeled): customers, product variants, modifiers,
 *   cash registers, payroll, attendance, RBAC users/roles, audit log, waste
 *   table (waste is a movement type), unit conversions.
 */

export const migration001InitialSchema: Migration = {
  version: 1,
  name: '001-initial-schema',
  up: [
    // ------------------------------------------------------------------
    // 1. BUSINESS (profile + settings merged — no 1:1 settings table)
    // ------------------------------------------------------------------
    `CREATE TABLE business (
      id                TEXT PRIMARY KEY,
      name              TEXT NOT NULL,
      legal_name        TEXT,
      description       TEXT,
      logo_uri          TEXT,

      phone             TEXT,
      email             TEXT,
      address_line1     TEXT,
      city              TEXT,
      state             TEXT,
      postal_code       TEXT,
      country_code      TEXT,

      -- Business-owned presentation & localization (AGENTS §3.2, §6, §7.2).
      currency_code     TEXT NOT NULL DEFAULT 'USD',
      locale            TEXT NOT NULL DEFAULT 'es'
                        CHECK (locale IN ('es', 'en')),
      accent_color      TEXT NOT NULL DEFAULT 'royal'
                        CHECK (accent_color IN ('royal', 'emerald', 'indigo', 'amber', 'slate', 'rose')),

      -- Feature toggles (previously a separate business_settings table).
      tax_enabled               INTEGER NOT NULL DEFAULT 0 CHECK (tax_enabled IN (0, 1)),
      default_tax_rate_bp       INTEGER NOT NULL DEFAULT 0,
      inventory_enabled         INTEGER NOT NULL DEFAULT 1 CHECK (inventory_enabled IN (0, 1)),
      allow_negative_inventory  INTEGER NOT NULL DEFAULT 0 CHECK (allow_negative_inventory IN (0, 1)),
      low_stock_alerts_enabled  INTEGER NOT NULL DEFAULT 1 CHECK (low_stock_alerts_enabled IN (0, 1)),
      receipt_enabled           INTEGER NOT NULL DEFAULT 1 CHECK (receipt_enabled IN (0, 1)),

      is_active         INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
      created_at        TEXT NOT NULL,
      updated_at        TEXT NOT NULL
    );`,

    // ------------------------------------------------------------------
    // 2. UNITS OF MEASURE (g, ml, pza/unit …) — no conversions in v1
    // ------------------------------------------------------------------
    `CREATE TABLE unit (
      id            TEXT PRIMARY KEY,
      business_id   TEXT NOT NULL,
      name          TEXT NOT NULL,
      symbol        TEXT NOT NULL,
      type          TEXT NOT NULL CHECK (type IN ('weight', 'volume', 'count')),
      is_active     INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
      created_at    TEXT NOT NULL,
      updated_at    TEXT NOT NULL,
      FOREIGN KEY (business_id) REFERENCES business(id) ON DELETE CASCADE,
      UNIQUE (business_id, symbol)
    );`,

    // ------------------------------------------------------------------
    // 3. CATEGORIES
    // ------------------------------------------------------------------
    `CREATE TABLE category (
      id            TEXT PRIMARY KEY,
      business_id   TEXT NOT NULL,
      name          TEXT NOT NULL,
      description   TEXT,
      image_uri     TEXT,
      sort_order    INTEGER NOT NULL DEFAULT 0,
      is_active     INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
      created_at    TEXT NOT NULL,
      updated_at    TEXT NOT NULL,
      archived_at   TEXT,
      FOREIGN KEY (business_id) REFERENCES business(id) ON DELETE CASCADE
    );`,

    // ------------------------------------------------------------------
    // 4. EMPLOYEES (light-touch: attribution only, no payroll/RBAC)
    // ------------------------------------------------------------------
    `CREATE TABLE employee (
      id            TEXT PRIMARY KEY,
      business_id   TEXT NOT NULL,
      first_name    TEXT NOT NULL,
      last_name     TEXT,
      phone         TEXT,
      email         TEXT,
      is_active     INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
      created_at    TEXT NOT NULL,
      updated_at    TEXT NOT NULL,
      archived_at   TEXT,
      FOREIGN KEY (business_id) REFERENCES business(id) ON DELETE CASCADE
    );`,

    // ------------------------------------------------------------------
    // 5. INVENTORY ITEMS / INGREDIENTS (stockable, measured)
    // ------------------------------------------------------------------
    `CREATE TABLE inventory_item (
      id                 TEXT PRIMARY KEY,
      business_id        TEXT NOT NULL,
      name               TEXT NOT NULL,
      description        TEXT,
      image_uri          TEXT,
      unit_id            TEXT NOT NULL,
      -- Cached current quantity (× QUANTITY_SCALE, milli-units).
      -- The movement ledger remains the historical source of truth; this
      -- cache is updated in the same transaction as each movement and can be
      -- reconciled from inventory_movement at any time.
      current_quantity   INTEGER NOT NULL DEFAULT 0,
      minimum_quantity   INTEGER NOT NULL DEFAULT 0,
      -- Cached estimated cost per display unit (minor currency). Recomputed
      -- from purchases. Exact totals live in purchase/purchase_item.
      unit_cost_minor    INTEGER NOT NULL DEFAULT 0,
      is_active          INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
      created_at         TEXT NOT NULL,
      updated_at         TEXT NOT NULL,
      archived_at        TEXT,
      FOREIGN KEY (business_id) REFERENCES business(id) ON DELETE CASCADE,
      FOREIGN KEY (unit_id) REFERENCES unit(id) ON DELETE RESTRICT
    );`,

    // ------------------------------------------------------------------
    // 6. PRODUCTS (sellable catalog items)
    // ------------------------------------------------------------------
    `CREATE TABLE product (
      id                 TEXT PRIMARY KEY,
      business_id        TEXT NOT NULL,
      category_id        TEXT,
      name               TEXT NOT NULL,
      description        TEXT,
      image_uri          TEXT,
      sku                TEXT,
      barcode            TEXT,
      -- Base/default selling price, minor currency.
      price_minor        INTEGER NOT NULL DEFAULT 0 CHECK (price_minor >= 0),
      -- Optional 1:1 direct-stock bridge (retail: sell = decrement item).
      inventory_item_id  TEXT UNIQUE,
      is_active          INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
      created_at         TEXT NOT NULL,
      updated_at         TEXT NOT NULL,
      archived_at        TEXT,
      FOREIGN KEY (business_id) REFERENCES business(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES category(id) ON DELETE SET NULL,
      FOREIGN KEY (inventory_item_id) REFERENCES inventory_item(id) ON DELETE SET NULL
    );`,

    // ------------------------------------------------------------------
    // 7. RECIPES (product-bound: selling the product consumes ingredients)
    // ------------------------------------------------------------------
    `CREATE TABLE recipe (
      id            TEXT PRIMARY KEY,
      business_id   TEXT NOT NULL,
      product_id    TEXT NOT NULL UNIQUE,
      name          TEXT NOT NULL,
      description   TEXT,
      notes         TEXT,
      is_active     INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
      created_at    TEXT NOT NULL,
      updated_at    TEXT NOT NULL,
      FOREIGN KEY (business_id) REFERENCES business(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES product(id) ON DELETE CASCADE
    );`,

    `CREATE TABLE recipe_item (
      id                 TEXT PRIMARY KEY,
      recipe_id          TEXT NOT NULL,
      inventory_item_id  TEXT NOT NULL,
      -- Quantity consumed per single portion, × QUANTITY_SCALE in the
      -- inventory item's unit.
      quantity           INTEGER NOT NULL CHECK (quantity > 0),
      sort_order         INTEGER NOT NULL DEFAULT 0,
      created_at         TEXT NOT NULL,
      updated_at         TEXT NOT NULL,
      FOREIGN KEY (recipe_id) REFERENCES recipe(id) ON DELETE CASCADE,
      FOREIGN KEY (inventory_item_id) REFERENCES inventory_item(id) ON DELETE RESTRICT,
      UNIQUE (recipe_id, inventory_item_id)
    );`,

    // ------------------------------------------------------------------
    // 8. INVENTORY MOVEMENTS (single stock ledger — source of truth)
    // ------------------------------------------------------------------
    `CREATE TABLE inventory_movement (
      id                TEXT PRIMARY KEY,
      business_id       TEXT NOT NULL,
      inventory_item_id TEXT NOT NULL,
      type              TEXT NOT NULL
                        CHECK (type IN ('INITIAL_STOCK', 'PURCHASE', 'SALE', 'WASTE', 'ADJUSTMENT', 'RETURN')),
      -- Signed quantity in milli-units: positive = stock in, negative = out.
      quantity          INTEGER NOT NULL CHECK (quantity != 0),
      unit_id           TEXT NOT NULL,
      -- Estimated cost per display unit at movement time (minor currency).
      unit_cost_minor   INTEGER NOT NULL DEFAULT 0,
      reason            TEXT,
      notes             TEXT,
      -- Loose link to the originating document (e.g. sale/purchase ids).
      reference_type    TEXT,
      reference_id      TEXT,
      employee_id       TEXT,
      created_at        TEXT NOT NULL,
      FOREIGN KEY (business_id) REFERENCES business(id) ON DELETE CASCADE,
      FOREIGN KEY (inventory_item_id) REFERENCES inventory_item(id) ON DELETE RESTRICT,
      FOREIGN KEY (unit_id) REFERENCES unit(id) ON DELETE RESTRICT,
      FOREIGN KEY (employee_id) REFERENCES employee(id) ON DELETE SET NULL
    );`,

    // ------------------------------------------------------------------
    // 9. SUPPLIERS
    // ------------------------------------------------------------------
    `CREATE TABLE supplier (
      id            TEXT PRIMARY KEY,
      business_id   TEXT NOT NULL,
      name          TEXT NOT NULL,
      business_name TEXT,
      phone         TEXT,
      email         TEXT,
      tax_id        TEXT,
      notes         TEXT,
      is_active     INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
      created_at    TEXT NOT NULL,
      updated_at    TEXT NOT NULL,
      archived_at   TEXT,
      FOREIGN KEY (business_id) REFERENCES business(id) ON DELETE CASCADE
    );`,

    `CREATE TABLE supplier_item (
      id                     TEXT PRIMARY KEY,
      supplier_id            TEXT NOT NULL,
      inventory_item_id      TEXT NOT NULL,
      supplier_sku           TEXT,
      -- Last known purchase price per display unit (minor currency).
      purchase_price_minor   INTEGER NOT NULL DEFAULT 0,
      created_at             TEXT NOT NULL,
      updated_at             TEXT NOT NULL,
      FOREIGN KEY (supplier_id) REFERENCES supplier(id) ON DELETE CASCADE,
      FOREIGN KEY (inventory_item_id) REFERENCES inventory_item(id) ON DELETE RESTRICT,
      UNIQUE (supplier_id, inventory_item_id)
    );`,

    // ------------------------------------------------------------------
    // 10. PURCHASES (money out + stock in)
    // ------------------------------------------------------------------
    `CREATE TABLE purchase (
      id                TEXT PRIMARY KEY,
      business_id       TEXT NOT NULL,
      supplier_id       TEXT,
      purchase_number   TEXT NOT NULL,
      subtotal_minor    INTEGER NOT NULL DEFAULT 0 CHECK (subtotal_minor >= 0),
      tax_minor         INTEGER NOT NULL DEFAULT 0 CHECK (tax_minor >= 0),
      discount_minor    INTEGER NOT NULL DEFAULT 0 CHECK (discount_minor >= 0),
      total_minor       INTEGER NOT NULL DEFAULT 0 CHECK (total_minor >= 0),
      status            TEXT NOT NULL DEFAULT 'COMPLETED'
                        CHECK (status IN ('COMPLETED', 'CANCELLED')),
      notes             TEXT,
      employee_id       TEXT,
      created_at        TEXT NOT NULL,
      updated_at        TEXT NOT NULL,
      FOREIGN KEY (business_id) REFERENCES business(id) ON DELETE CASCADE,
      FOREIGN KEY (supplier_id) REFERENCES supplier(id) ON DELETE SET NULL,
      FOREIGN KEY (employee_id) REFERENCES employee(id) ON DELETE SET NULL,
      UNIQUE (business_id, purchase_number)
    );`,

    `CREATE TABLE purchase_item (
      id                TEXT PRIMARY KEY,
      purchase_id       TEXT NOT NULL,
      inventory_item_id TEXT NOT NULL,
      -- Quantity received × QUANTITY_SCALE in the item's unit.
      quantity          INTEGER NOT NULL CHECK (quantity > 0),
      unit_id           TEXT NOT NULL,
      unit_cost_minor   INTEGER NOT NULL DEFAULT 0 CHECK (unit_cost_minor >= 0),
      subtotal_minor    INTEGER NOT NULL DEFAULT 0 CHECK (subtotal_minor >= 0),
      created_at        TEXT NOT NULL,
      FOREIGN KEY (purchase_id) REFERENCES purchase(id) ON DELETE CASCADE,
      FOREIGN KEY (inventory_item_id) REFERENCES inventory_item(id) ON DELETE RESTRICT,
      FOREIGN KEY (unit_id) REFERENCES unit(id) ON DELETE RESTRICT
    );`,

    // ------------------------------------------------------------------
    // 11. PAYMENT METHODS (seeded cash/card/transfer per business)
    // ------------------------------------------------------------------
    `CREATE TABLE payment_method (
      id            TEXT PRIMARY KEY,
      business_id   TEXT NOT NULL,
      name          TEXT NOT NULL,
      type          TEXT NOT NULL CHECK (type IN ('CASH', 'CARD', 'TRANSFER', 'OTHER')),
      is_default    INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0, 1)),
      is_active     INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
      sort_order    INTEGER NOT NULL DEFAULT 0,
      created_at    TEXT NOT NULL,
      updated_at    TEXT NOT NULL,
      FOREIGN KEY (business_id) REFERENCES business(id) ON DELETE CASCADE
    );`,

    // ------------------------------------------------------------------
    // 12. SALES (POS). Statuses: HELD (persisted cart), COMPLETED,
    //     CANCELLED (never paid), REFUNDED (paid then returned).
    // ------------------------------------------------------------------
    `CREATE TABLE sale (
      id            TEXT PRIMARY KEY,
      business_id   TEXT NOT NULL,
      sale_number   TEXT NOT NULL,
      status        TEXT NOT NULL DEFAULT 'HELD'
                    CHECK (status IN ('HELD', 'COMPLETED', 'CANCELLED', 'REFUNDED')),
      subtotal_minor   INTEGER NOT NULL DEFAULT 0 CHECK (subtotal_minor >= 0),
      discount_minor   INTEGER NOT NULL DEFAULT 0 CHECK (discount_minor >= 0),
      tax_minor        INTEGER NOT NULL DEFAULT 0 CHECK (tax_minor >= 0),
      total_minor      INTEGER NOT NULL DEFAULT 0 CHECK (total_minor >= 0),
      employee_id   TEXT,
      notes         TEXT,
      created_at    TEXT NOT NULL,
      updated_at    TEXT NOT NULL,
      completed_at  TEXT,
      cancelled_at  TEXT,
      refunded_at   TEXT,
      FOREIGN KEY (business_id) REFERENCES business(id) ON DELETE CASCADE,
      FOREIGN KEY (employee_id) REFERENCES employee(id) ON DELETE SET NULL,
      UNIQUE (business_id, sale_number)
    );`,

    `CREATE TABLE sale_item (
      id              TEXT PRIMARY KEY,
      sale_id         TEXT NOT NULL,
      product_id      TEXT,
      -- Snapshot of selling information at the moment of sale. Never rely on
      -- live product rows for history (AGENTS §6).
      product_name    TEXT NOT NULL,
      -- Quantity sold × QUANTITY_SCALE (products count in unit scale: 1 → 1000).
      quantity        INTEGER NOT NULL CHECK (quantity > 0),
      unit_price_minor INTEGER NOT NULL CHECK (unit_price_minor >= 0),
      discount_minor  INTEGER NOT NULL DEFAULT 0 CHECK (discount_minor >= 0),
      subtotal_minor  INTEGER NOT NULL DEFAULT 0 CHECK (subtotal_minor >= 0),
      -- Snapshot of estimated cost per display unit at sale time.
      unit_cost_minor INTEGER NOT NULL DEFAULT 0,
      created_at      TEXT NOT NULL,
      FOREIGN KEY (sale_id) REFERENCES sale(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES product(id) ON DELETE SET NULL
    );`,

    `CREATE TABLE payment (
      id                TEXT PRIMARY KEY,
      business_id       TEXT NOT NULL,
      sale_id           TEXT NOT NULL,
      payment_method_id TEXT NOT NULL,
      amount_minor      INTEGER NOT NULL CHECK (amount_minor > 0),
      -- Cash tendered (only meaningful for CASH); change = amount_given − amount.
      amount_given_minor INTEGER,
      reference         TEXT,
      notes             TEXT,
      created_at        TEXT NOT NULL,
      FOREIGN KEY (business_id) REFERENCES business(id) ON DELETE CASCADE,
      FOREIGN KEY (sale_id) REFERENCES sale(id) ON DELETE CASCADE,
      FOREIGN KEY (payment_method_id) REFERENCES payment_method(id) ON DELETE RESTRICT,
      CHECK (amount_given_minor IS NULL OR amount_given_minor >= amount_minor)
    );`,

    // ------------------------------------------------------------------
    // 13. FINANCE (expenses / non-sale income & purchases tracking)
    // ------------------------------------------------------------------
    `CREATE TABLE financial_category (
      id            TEXT PRIMARY KEY,
      business_id   TEXT NOT NULL,
      name          TEXT NOT NULL,
      type          TEXT NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
      is_system     INTEGER NOT NULL DEFAULT 0 CHECK (is_system IN (0, 1)),
      is_active     INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
      created_at    TEXT NOT NULL,
      updated_at    TEXT NOT NULL,
      FOREIGN KEY (business_id) REFERENCES business(id) ON DELETE CASCADE
    );`,

    `CREATE TABLE financial_transaction (
      id                TEXT PRIMARY KEY,
      business_id       TEXT NOT NULL,
      category_id       TEXT NOT NULL,
      -- Positive amount; direction comes from the category type.
      amount_minor      INTEGER NOT NULL CHECK (amount_minor > 0),
      payment_method_id TEXT,
      supplier_id       TEXT,
      employee_id       TEXT,
      description       TEXT,
      reference_type    TEXT,
      reference_id      TEXT,
      created_at        TEXT NOT NULL,
      updated_at        TEXT NOT NULL,
      FOREIGN KEY (business_id) REFERENCES business(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES financial_category(id) ON DELETE RESTRICT,
      FOREIGN KEY (payment_method_id) REFERENCES payment_method(id) ON DELETE SET NULL,
      FOREIGN KEY (supplier_id) REFERENCES supplier(id) ON DELETE SET NULL,
      FOREIGN KEY (employee_id) REFERENCES employee(id) ON DELETE SET NULL
    );`,

    // ------------------------------------------------------------------
    // 14. APP METADATA (counters, export stamps, …)
    // ------------------------------------------------------------------
    `CREATE TABLE app_metadata (
      key     TEXT PRIMARY KEY,
      value   TEXT NOT NULL
    );`,

    // ------------------------------------------------------------------
    // INDEXES
    // ------------------------------------------------------------------
    `CREATE INDEX idx_unit_business ON unit(business_id);`,
    `CREATE INDEX idx_category_business ON category(business_id);`,
    `CREATE UNIQUE INDEX uq_category_name
      ON category(business_id, name) WHERE archived_at IS NULL;`,
    `CREATE INDEX idx_employee_business ON employee(business_id);`,
    `CREATE INDEX idx_inventory_item_business ON inventory_item(business_id);`,
    `CREATE UNIQUE INDEX uq_inventory_item_name
      ON inventory_item(business_id, name) WHERE archived_at IS NULL;`,
    `CREATE INDEX idx_product_business ON product(business_id);`,
    `CREATE INDEX idx_product_category ON product(category_id);`,
    `CREATE UNIQUE INDEX uq_product_name
      ON product(business_id, name) WHERE archived_at IS NULL;`,
    `CREATE UNIQUE INDEX uq_product_sku
      ON product(business_id, sku) WHERE sku IS NOT NULL AND archived_at IS NULL;`,
    `CREATE UNIQUE INDEX uq_product_barcode
      ON product(business_id, barcode) WHERE barcode IS NOT NULL AND archived_at IS NULL;`,
    `CREATE INDEX idx_recipe_business ON recipe(business_id);`,
    `CREATE INDEX idx_recipe_item_recipe ON recipe_item(recipe_id);`,
    `CREATE INDEX idx_movement_item_date
      ON inventory_movement(inventory_item_id, created_at);`,
    `CREATE INDEX idx_movement_business_date
      ON inventory_movement(business_id, created_at);`,
    `CREATE INDEX idx_movement_reference
      ON inventory_movement(reference_type, reference_id);`,
    `CREATE INDEX idx_supplier_business ON supplier(business_id);`,
    `CREATE UNIQUE INDEX uq_supplier_name
      ON supplier(business_id, name) WHERE archived_at IS NULL;`,
    `CREATE INDEX idx_supplier_item_supplier ON supplier_item(supplier_id);`,
    `CREATE INDEX idx_purchase_business_date ON purchase(business_id, created_at);`,
    `CREATE INDEX idx_purchase_item_purchase ON purchase_item(purchase_id);`,
    `CREATE INDEX idx_payment_method_business ON payment_method(business_id);`,
    `CREATE INDEX idx_sale_business_date ON sale(business_id, created_at);`,
    `CREATE INDEX idx_sale_employee ON sale(employee_id);`,
    `CREATE INDEX idx_sale_item_sale ON sale_item(sale_id);`,
    `CREATE INDEX idx_payment_sale ON payment(sale_id);`,
    `CREATE INDEX idx_payment_business_date ON payment(business_id, created_at);`,
    `CREATE INDEX idx_financial_category_business ON financial_category(business_id);`,
    `CREATE INDEX idx_financial_tx_business_date
      ON financial_transaction(business_id, created_at);`,
  ],
};
