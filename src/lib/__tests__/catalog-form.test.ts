/// <reference types="jest" />

/**
 * @jest-environment node
 *
 * Pure catalog form logic: money/quantity parsing, product validation,
 * payload building, category reordering and product filtering.
 */

import type { Category, Product } from '@/db';
import {
  buildProductCreateInput,
  buildProductUpdateInput,
  buildRecipeItems,
  canMoveCategory,
  filterProducts,
  formatMoneyInput,
  formatQuantityMilli,
  parseMoneyInput,
  parseQuantityMilli,
  reorderCategories,
  validateProductForm,
  type ProductFormValues,
} from '@/lib/catalog-form';

function makeCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: 'cat-1',
    businessId: 'biz-1',
    name: 'Bebidas',
    description: null,
    imageUri: null,
    sortOrder: 0,
    isActive: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    archivedAt: null,
    ...overrides,
  };
}

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'p1',
    businessId: 'biz-1',
    categoryId: 'cat-1',
    name: 'Matcha Latte',
    description: null,
    imageUri: null,
    sku: null,
    barcode: null,
    priceMinor: 1250,
    inventoryItemId: null,
    isActive: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    archivedAt: null,
    ...overrides,
  };
}

function makeValues(overrides: Partial<ProductFormValues> = {}): ProductFormValues {
  return {
    name: 'Matcha Latte',
    description: '',
    categoryId: null,
    imageUri: null,
    priceInput: '12.50',
    barcode: '',
    stockMode: 'none',
    inventoryItemId: null,
    recipeItems: [],
    supplierId: null,
    ...overrides,
  };
}

describe('parseMoneyInput', () => {
  it('parses whole and decimal amounts into minor units', () => {
    expect(parseMoneyInput('12')).toBe(1200);
    expect(parseMoneyInput('12.5')).toBe(1250);
    expect(parseMoneyInput('12.50')).toBe(1250);
    expect(parseMoneyInput('0')).toBe(0);
  });

  it('accepts comma as a decimal separator and grouping separators', () => {
    expect(parseMoneyInput('12,50')).toBe(1250);
    expect(parseMoneyInput('1,234.56')).toBe(123456);
    expect(parseMoneyInput('1.234,56')).toBe(123456);
  });

  it('rejects empty, malformed, negative and over-precise input', () => {
    expect(parseMoneyInput('')).toBeNull();
    expect(parseMoneyInput('   ')).toBeNull();
    expect(parseMoneyInput('abc')).toBeNull();
    expect(parseMoneyInput('-5')).toBeNull();
    expect(parseMoneyInput('1.234')).toBeNull();
  });
});

describe('formatMoneyInput', () => {
  it('renders fixed-decimal input strings', () => {
    expect(formatMoneyInput(450)).toBe('4.50');
    expect(formatMoneyInput(0)).toBe('0.00');
    expect(formatMoneyInput(123456)).toBe('1234.56');
  });
});

describe('quantity helpers', () => {
  it('parses quantities into milli-units', () => {
    expect(parseQuantityMilli('1')).toBe(1000);
    expect(parseQuantityMilli('0.5')).toBe(500);
    expect(parseQuantityMilli('0.001')).toBe(1);
    expect(parseQuantityMilli('1.2345')).toBeNull();
    expect(parseQuantityMilli('')).toBeNull();
  });

  it('renders milli-units compactly', () => {
    expect(formatQuantityMilli(1000)).toBe('1');
    expect(formatQuantityMilli(500)).toBe('0.5');
    expect(formatQuantityMilli(1500)).toBe('1.5');
  });
});


describe('validateProductForm', () => {
  it('accepts a minimal valid product', () => {
    const result = validateProductForm(makeValues());
    expect(result.valid).toBe(true);
  });

  it('requires a name and a price', () => {
    expect(validateProductForm(makeValues({ name: '  ' })).name).toBe('name-required');
    expect(validateProductForm(makeValues({ priceInput: '' })).price).toBe('price-required');
    expect(validateProductForm(makeValues({ priceInput: 'nope' })).price).toBe('price-invalid');
  });

  it('requires a direct stock item when direct mode is selected', () => {
    const result = validateProductForm(makeValues({ stockMode: 'direct' }));
    expect(result.stock).toBe('stock-required');
    expect(result.valid).toBe(false);
  });

  it('requires at least one recipe line in recipe mode', () => {
    const result = validateProductForm(makeValues({ stockMode: 'recipe' }));
    expect(result.stock).toBe('stock-required');
    expect(result.valid).toBe(false);
  });

  it('does not require stock inputs in none mode', () => {
    const result = validateProductForm(
      makeValues({
        stockMode: 'none',
        inventoryItemId: null,
        recipeItems: [{ inventoryItemId: null, quantityInput: '0' }],
      }),
    );
    expect(result.stock).toBeNull();
    expect(result.recipe).toBeNull();
    expect(result.valid).toBe(true);
  });

  it('validates recipe lines in recipe mode', () => {
    const invalid = validateProductForm(
      makeValues({
        stockMode: 'recipe',
        recipeItems: [{ inventoryItemId: null, quantityInput: '1' }],
      }),
    );
    expect(invalid.recipe).toBe('recipe-invalid');

    const zero = validateProductForm(
      makeValues({
        stockMode: 'recipe',
        recipeItems: [{ inventoryItemId: 'inv-1', quantityInput: '0' }],
      }),
    );
    expect(zero.recipe).toBe('recipe-invalid');

    const duplicate = validateProductForm(
      makeValues({
        stockMode: 'recipe',
        recipeItems: [
          { inventoryItemId: 'inv-1', quantityInput: '1' },
          { inventoryItemId: 'inv-1', quantityInput: '2' },
        ],
      }),
    );
    expect(duplicate.recipe).toBe('recipe-duplicate');
  });
});

describe('buildProductCreateInput', () => {
  it('maps form values to the create payload', () => {
    const input = buildProductCreateInput(
      makeValues({ categoryId: 'cat-1', barcode: '123', priceInput: '9.99' }),
    );
    expect(input).toEqual({
      name: 'Matcha Latte',
      categoryId: 'cat-1',
      description: undefined,
      imageUri: undefined,
      barcode: '123',
      priceMinor: 999,
      inventoryItemId: undefined,
    });
  });

  it('omits the stock bridge unless direct tracking is selected', () => {
    const direct = buildProductCreateInput(
      makeValues({ stockMode: 'direct', inventoryItemId: 'inv-1' }),
    );
    expect(direct.inventoryItemId).toBe('inv-1');
  });
});

describe('buildProductUpdateInput', () => {
  it('sends null to clear nullable fields', () => {
    const input = buildProductUpdateInput(makeValues({ barcode: '' }));
    expect(input.categoryId).toBeNull();
    expect(input.barcode).toBeNull();
    expect(input.imageUri).toBeNull();
    expect(input.description).toBeNull();
    expect(input.inventoryItemId).toBeNull();
  });

  it('keeps the direct stock bridge only when selected', () => {
    const input = buildProductUpdateInput(
      makeValues({ stockMode: 'direct', inventoryItemId: 'inv-1' }),
    );
    expect(input.inventoryItemId).toBe('inv-1');
  });
});

describe('buildRecipeItems', () => {
  it('parses quantities and drops unfinished lines', () => {
    const items = buildRecipeItems([
      { inventoryItemId: 'inv-1', quantityInput: '0.5' },
      { inventoryItemId: null, quantityInput: '1' },
      { inventoryItemId: 'inv-2', quantityInput: '2' },
    ]);
    expect(items).toEqual([
      { inventoryItemId: 'inv-1', quantity: 500, sortOrder: 0 },
      { inventoryItemId: 'inv-2', quantity: 2000, sortOrder: 1 },
    ]);
  });
});

describe('category reordering', () => {
  const categories = [
    makeCategory({ id: 'a', name: 'A', sortOrder: 0 }),
    makeCategory({ id: 'b', name: 'B', sortOrder: 1 }),
    makeCategory({ id: 'c', name: 'C', sortOrder: 2 }),
  ];

  it('reports whether an item can move', () => {
    expect(canMoveCategory(categories, 'a', 'up')).toBe(false);
    expect(canMoveCategory(categories, 'a', 'down')).toBe(true);
    expect(canMoveCategory(categories, 'c', 'down')).toBe(false);
  });

  it('moves an item and returns the sort-order patches', () => {
    const { ordered, changed } = reorderCategories(categories, 'a', 'down');
    expect(ordered.map((category) => category.id)).toEqual(['b', 'a', 'c']);
    expect(changed).toEqual([
      { id: 'b', sortOrder: 0 },
      { id: 'a', sortOrder: 1 },
    ]);
  });

  it('is a no-op at the edges', () => {
    const { ordered, changed } = reorderCategories(categories, 'a', 'up');
    expect(ordered).toBe(categories);
    expect(changed).toEqual([]);
  });

  it('keeps sortOrder consistent across consecutive moves', () => {
    const first = reorderCategories(categories, 'a', 'down');
    const second = reorderCategories(first.ordered, 'a', 'down');
    expect(second.ordered.map((category) => [category.id, category.sortOrder])).toEqual([
      ['b', 0],
      ['c', 1],
      ['a', 2],
    ]);
    expect(second.changed).toEqual([
      { id: 'c', sortOrder: 1 },
      { id: 'a', sortOrder: 2 },
    ]);
  });
});

describe('filterProducts', () => {
  const products = [
    makeProduct({ id: 'p1', name: 'Matcha Latte', categoryId: 'cat-1' }),
    makeProduct({ id: 'p2', name: 'Iced Matcha', categoryId: 'cat-2' }),
    makeProduct({ id: 'p3', name: 'Chips', categoryId: null }),
  ];

  it('filters by case-insensitive name', () => {
    const result = filterProducts(products, { search: 'matcha', categoryId: null });
    expect(result.map((product) => product.id)).toEqual(['p1', 'p2']);
  });

  it('filters by category', () => {
    const result = filterProducts(products, { search: '', categoryId: 'cat-2' });
    expect(result.map((product) => product.id)).toEqual(['p2']);
  });
});
