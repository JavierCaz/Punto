/**
 * Pure catalog form logic — money/quantity parsing, product-form validation,
 * category reordering and product filtering. No React and no I/O, so it is
 * unit-tested in the node jest environment (AGENTS §9.4).
 *
 * Money is integer minor units (cents); quantities are integer milli-units
 * (×1000 of the row's unit). Never floating-point money math (AGENTS §6).
 *
 * Type-only imports from `@/db` keep this module free of expo-sqlite at
 * runtime, so it can be imported by pure node tests.
 */

import type {
  Category,
  CreateProductInput,
  Product,
  RecipeItemInput,
  UpdateProductInput,
} from '@/db';

/** Minor units per major currency unit for money inputs (USD/MXN cents). */
export const MONEY_MINOR_UNITS = 2;

/** Milli-units per display unit for recipe quantities (0.5 = 500). */
export const QUANTITY_SCALE = 1000;

/**
 * Parse a user-typed decimal amount into integer minor units.
 *
 * Accepts `.` or `,` as the decimal separator; when both appear the last one
 * is treated as the decimal separator and the other as a grouping separator.
 * Rejects negatives, non-numeric input and more than `minorUnits` decimals.
 * Returns `null` for anything invalid (including an empty string). The
 * conversion is integer-only, so no float ever touches money.
 */
export function parseMoneyInput(raw: string, minorUnits = MONEY_MINOR_UNITS): number | null {
  const normalized = normalizeDecimalInput(raw, minorUnits);
  if (normalized === null) {
    return null;
  }
  const [whole, fraction = ''] = normalized.split('.');
  const scale = 10 ** minorUnits;
  const paddedFraction = fraction.padEnd(minorUnits, '0');
  const minor = Number(whole) * scale + Number(paddedFraction || '0');
  return Number.isSafeInteger(minor) ? minor : null;
}

/** Render integer minor units as a fixed-decimal input string ("4.50"). */
export function formatMoneyInput(minor: number, minorUnits = MONEY_MINOR_UNITS): string {
  return formatScaled(minor, minorUnits, false);
}

/** Parse a user-typed quantity into integer milli-units (up to 3 decimals). */
export function parseQuantityMilli(raw: string): number | null {
  return parseMoneyInput(raw, 3);
}

/** Render integer milli-units as a compact decimal string ("0.5", "1"). */
export function formatQuantityMilli(milli: number): string {
  return formatScaled(milli, 3, true);
}

function normalizeDecimalInput(raw: string, maxDecimals: number): string | null {
  let value = raw.trim().replace(/\s/g, '');
  if (value.length === 0) {
    return null;
  }

  const hasComma = value.includes(',');
  const hasDot = value.includes('.');
  if (hasComma && hasDot) {
    // Both present: the right-most one is the decimal separator, the other
    // groups thousands (e.g. "1,234.56" or "1.234,56").
    const decimalSeparator = value.lastIndexOf(',') > value.lastIndexOf('.') ? ',' : '.';
    const groupingSeparator = decimalSeparator === ',' ? '.' : ',';
    value = value.split(groupingSeparator).join('');
    value = value.replace(decimalSeparator, '.');
  } else if (hasComma) {
    value = value.replace(',', '.');
  }

  if (!/^\d+(\.\d*)?$/.test(value)) {
    return null;
  }
  const fraction = value.split('.')[1] ?? '';
  if (fraction.length > maxDecimals) {
    return null;
  }
  return value;
}

function formatScaled(value: number, minorUnits: number, stripTrailingZeros: boolean): string {
  const scale = 10 ** minorUnits;
  const whole = Math.trunc(value / scale);
  const fraction = Math.abs(value % scale);
  const fractionText = String(fraction).padStart(minorUnits, '0');
  if (!stripTrailingZeros) {
    return `${whole}.${fractionText}`;
  }
  const trimmed = fractionText.replace(/0+$/, '');
  return trimmed.length > 0 ? `${whole}.${trimmed}` : String(whole);
}

// ---------------------------------------------------------------------------
// Product form model
// ---------------------------------------------------------------------------

/** One recipe ingredient line as edited in the form. */
export interface RecipeLineValue {
  /** Inventory item id, or null while the user is still choosing. */
  inventoryItemId: string | null;
  /** Quantity in display units, exactly as typed (parsed on save). */
  quantityInput: string;
}

/** How a product's stock is tracked, derived from the form values. */
export type ProductStockMode = 'none' | 'direct' | 'recipe';

export interface ProductFormValues {
  name: string;
  description: string;
  categoryId: string | null;
  imageUri: string | null;
  priceInput: string;
  barcode: string;
  trackInventory: boolean;
  /** Direct-stock bridge (`product.inventory_item_id`). */
  inventoryItemId: string | null;
  recipeItems: RecipeLineValue[];
  /** Supplier linked to the direct-stock item, when one is selected. */
  supplierId: string | null;
}

/** Validation issue codes (mapped to i18n copy by the form component). */
export type ProductFormIssue =
  | 'name-required'
  | 'price-required'
  | 'price-invalid'
  | 'stock-required'
  | 'recipe-invalid'
  | 'recipe-duplicate'
  | 'recipe-conflict';

export interface ProductFormValidation {
  name: ProductFormIssue | null;
  price: ProductFormIssue | null;
  stock: ProductFormIssue | null;
  recipe: ProductFormIssue | null;
  valid: boolean;
}

/**
 * Resolve the stock mechanism: a product sells EITHER by decrementing a direct
 * stock item OR via a recipe — never both (migration 001 XOR invariant).
 */
export function resolveStockMode(
  values: Pick<ProductFormValues, 'trackInventory' | 'inventoryItemId' | 'recipeItems'>,
): ProductStockMode {
  if (!values.trackInventory) {
    return 'none';
  }
  if (values.recipeItems.length > 0) {
    return 'recipe';
  }
  if (values.inventoryItemId != null) {
    return 'direct';
  }
  return 'none';
}

/** Validate the product form, returning issue codes per field. */
export function validateProductForm(values: ProductFormValues): ProductFormValidation {
  const name: ProductFormIssue | null = values.name.trim().length > 0 ? null : 'name-required';

  const trimmedPrice = values.priceInput.trim();
  const parsedPrice = parseMoneyInput(trimmedPrice);
  let price: ProductFormIssue | null = null;
  if (trimmedPrice.length === 0) {
    price = 'price-required';
  } else if (parsedPrice == null || parsedPrice < 0) {
    price = 'price-invalid';
  }

  const hasRecipe = values.recipeItems.length > 0;
  const hasDirect = values.inventoryItemId != null;

  let stock: ProductFormIssue | null = null;
  let recipe: ProductFormIssue | null = null;

  if (values.trackInventory) {
    if (!hasRecipe && !hasDirect) {
      stock = 'stock-required';
    } else if (hasRecipe && hasDirect) {
      stock = 'recipe-conflict';
    }
  }

  if (hasRecipe && values.trackInventory) {
    const seen = new Set<string>();
    for (const line of values.recipeItems) {
      if (line.inventoryItemId == null) {
        recipe = 'recipe-invalid';
        break;
      }
      const quantity = parseQuantityMilli(line.quantityInput);
      if (quantity == null || quantity <= 0) {
        recipe = 'recipe-invalid';
        break;
      }
      if (seen.has(line.inventoryItemId)) {
        recipe = 'recipe-duplicate';
        break;
      }
      seen.add(line.inventoryItemId);
    }
  }

  return {
    name,
    price,
    stock,
    recipe,
    valid: name == null && price == null && stock == null && recipe == null,
  };
}

/** Build the `createProduct` payload from validated form values. */
export function buildProductCreateInput(values: ProductFormValues): CreateProductInput {
  const mode = resolveStockMode(values);
  return {
    name: values.name.trim(),
    categoryId: values.categoryId ?? undefined,
    description: values.description.trim() || undefined,
    imageUri: values.imageUri ?? undefined,
    barcode: values.barcode.trim() || undefined,
    priceMinor: parseMoneyInput(values.priceInput) ?? 0,
    inventoryItemId: mode === 'direct' ? values.inventoryItemId ?? undefined : undefined,
  };
}

/**
 * Build the `updateProduct` payload from validated form values. Nullable
 * fields are sent as `null` (not `undefined`) so the user can clear a
 * category, image, description or barcode on edit.
 */
export function buildProductUpdateInput(values: ProductFormValues): UpdateProductInput {
  const mode = resolveStockMode(values);
  return {
    name: values.name.trim(),
    categoryId: values.categoryId,
    description: values.description.trim() || null,
    imageUri: values.imageUri,
    barcode: values.barcode.trim() || null,
    priceMinor: parseMoneyInput(values.priceInput) ?? 0,
    inventoryItemId: mode === 'direct' ? values.inventoryItemId : null,
  };
}

/** Convert recipe lines to the `upsertRecipe` ingredient payload. */
export function buildRecipeItems(lines: RecipeLineValue[]): RecipeItemInput[] {
  const items: RecipeItemInput[] = [];
  lines.forEach((line) => {
    if (line.inventoryItemId == null) {
      return;
    }
    items.push({
      inventoryItemId: line.inventoryItemId,
      quantity: parseQuantityMilli(line.quantityInput) ?? 0,
      sortOrder: items.length,
    });
  });
  return items;
}

// ---------------------------------------------------------------------------
// Category ordering
// ---------------------------------------------------------------------------

export type ReorderDirection = 'up' | 'down';

export interface CategoryReorderResult {
  /** The list in its new order (unchanged when the move is a no-op). */
  ordered: Category[];
  /** Sort-order patches to persist (only rows whose position changed). */
  changed: { id: string; sortOrder: number }[];
}

/** Whether an item can move in the given direction. */
export function canMoveCategory(
  categories: Category[],
  id: string,
  direction: ReorderDirection,
): boolean {
  const index = categories.findIndex((category) => category.id === id);
  if (index < 0) {
    return false;
  }
  const target = direction === 'up' ? index - 1 : index + 1;
  return target >= 0 && target < categories.length;
}

/**
 * Move a category one slot up/down and return the new order plus the
 * `sort_order` patches to persist. Positions are normalized to array indexes,
 * so duplicated `sortOrder` values (the create default is 0) still reorder.
 */
export function reorderCategories(
  categories: Category[],
  id: string,
  direction: ReorderDirection,
): CategoryReorderResult {
  const index = categories.findIndex((category) => category.id === id);
  const target = direction === 'up' ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= categories.length) {
    return { ordered: categories, changed: [] };
  }

  const ordered = [...categories];
  [ordered[index], ordered[target]] = [ordered[target], ordered[index]];

  // Normalize the in-memory order to its indexes so a second reorder in the
  // same session compares against fresh sortOrder values (no duplicate rows).
  const originalOrder = new Map(categories.map((category) => [category.id, category.sortOrder]));
  const normalized = ordered.map((category, position) => ({ ...category, sortOrder: position }));
  const changed = normalized
    .filter((category) => originalOrder.get(category.id) !== category.sortOrder)
    .map((category) => ({ id: category.id, sortOrder: category.sortOrder }));

  return { ordered: normalized, changed };
}

// ---------------------------------------------------------------------------
// Product filtering (in-memory; catalogs are small)
// ---------------------------------------------------------------------------

export interface ProductFilter {
  /** Case-insensitive name substring. */
  search: string;
  /** Category id to include, or null for all categories. */
  categoryId: string | null;
}

/** Filter products by name substring and optional category. */
export function filterProducts(products: Product[], filter: ProductFilter): Product[] {
  const term = filter.search.trim().toLowerCase();
  return products.filter((product) => {
    if (filter.categoryId != null && product.categoryId !== filter.categoryId) {
      return false;
    }
    if (term.length > 0 && !product.name.toLowerCase().includes(term)) {
      return false;
    }
    return true;
  });
}
