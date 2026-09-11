/**
 * @jest-environment node
 *
 * Recipe repository tests against the scripted RecordingAdapter fake
 * (no native SQLite — see AGENTS §9.4). They pin the exact SQL shape,
 * parameter order, the bridge-XOR-recipe invariant, the item-replace
 * (DELETE-then-INSERT) semantics, the N+1-avoiding batched `IN (...)` fetch,
 * and mapper 0/1 + null coercions the repository relies on.
 */

import { getDb } from '@/db';

import { resetBusinessIdForTesting } from '@/db/repositories/business-scope';
import { REPO_ERROR, isRepoError } from '@/db/repositories/errors';
import {
  getRecipeByProductId,
  listRecipes,
  setRecipeActive,
  upsertRecipe,
} from '@/db/repositories/recipe';
import { makeFakeDb } from '@/db/repositories/__tests__/fakes/fake-db';
import { RecordingAdapter } from '@/db/repositories/__tests__/fakes/recording-adapter';

jest.mock('@/db', () => ({ getDb: jest.fn() }));
jest.mock('expo-crypto', () => ({ randomUUID: jest.fn(() => 'uuid-test') }));

/** A canonical recipe row as SQLite would surface it (snake_case). */
const RECIPE_ROW = {
  id: 'r1',
  business_id: 'biz-1',
  product_id: 'p1',
  name: 'Matcha Latte',
  description: null,
  notes: null,
  is_active: 1,
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
};

/** A canonical recipe_item row (no business_id — scoped via parent recipe). */
const RECIPE_ITEM_ROW = {
  id: 'ri1',
  recipe_id: 'r1',
  inventory_item_id: 'inv-1',
  quantity: 500,
  sort_order: 0,
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
};

/** True when a call is the `recipe` INSERT (not a `recipe_item` INSERT). */
function isRecipeInsert(sql: string): boolean {
  return sql.includes('INSERT INTO recipe') && !sql.includes('recipe_item');
}

describe('recipe repository', () => {
  let adapter: RecordingAdapter;

  beforeEach(() => {
    adapter = new RecordingAdapter();
    (getDb as jest.Mock).mockResolvedValue(makeFakeDb(adapter));
    resetBusinessIdForTesting();
  });

  describe('upsertRecipe', () => {
    it('creates a recipe and its items in one transaction when none exists', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('FROM product', { id: 'p1', inventory_item_id: null });
      adapter.queueFirst('SELECT id FROM recipe', null); // no existing recipe by product
      adapter.queueFirst('FROM recipe WHERE id', RECIPE_ROW); // select-back
      adapter.queueAll('FROM recipe_item', [RECIPE_ITEM_ROW]); // select-back items

      const result = await upsertRecipe({
        productId: 'p1',
        name: 'Matcha Latte',
        items: [{ inventoryItemId: 'inv-1', quantity: 500 }],
      });

      expect(result.id).toBe('r1');
      expect(result.productId).toBe('p1');
      expect(result.isActive).toBe(true);
      expect(result.description).toBeNull();
      expect(result.notes).toBeNull();
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toEqual({
        id: 'ri1',
        recipeId: 'r1',
        inventoryItemId: 'inv-1',
        quantity: 500,
        sortOrder: 0,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      });

      const insertRecipe = adapter.calls.find((c) => isRecipeInsert(c.sql));
      expect(insertRecipe).toBeDefined();
      // id, business_id, product_id, name, description, notes, is_active, created_at, updated_at
      expect(insertRecipe!.params[0]).toBe('uuid-test');
      expect(insertRecipe!.params[1]).toBe('biz-1');
      expect(insertRecipe!.params[2]).toBe('p1');
      expect(insertRecipe!.params[3]).toBe('Matcha Latte');
      expect(insertRecipe!.params[4]).toBeNull(); // description
      expect(insertRecipe!.params[5]).toBeNull(); // notes
      expect(insertRecipe!.params[6]).toBe(1); // is_active (default true)
      expect(insertRecipe!.params[7]).toBe(insertRecipe!.params[8]); // created_at === updated_at

      const insertItem = adapter.calls.find((c) => c.sql.includes('INSERT INTO recipe_item'));
      expect(insertItem).toBeDefined();
      // id, recipe_id, inventory_item_id, quantity, sort_order, created_at, updated_at
      expect(insertItem!.params[0]).toBe('uuid-test');
      expect(insertItem!.params[1]).toBe('uuid-test');
      expect(insertItem!.params[2]).toBe('inv-1');
      expect(insertItem!.params[3]).toBe(500);
      expect(insertItem!.params[4]).toBe(0); // sort_order defaults to array index
    });

    it('replaces items atomically on a second upsert (DELETE then re-INSERT)', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('FROM product', { id: 'p1', inventory_item_id: null });
      adapter.queueFirst('SELECT id FROM recipe', { id: 'r1' }); // existing recipe by product
      adapter.queueFirst('FROM recipe WHERE id', RECIPE_ROW); // select-back after update
      adapter.queueAll('FROM recipe_item', [
        { ...RECIPE_ITEM_ROW, id: 'ri2', inventory_item_id: 'inv-2', quantity: 250 },
        { ...RECIPE_ITEM_ROW, id: 'ri3', inventory_item_id: 'inv-3', quantity: 1000, sort_order: 1 },
      ]);

      const result = await upsertRecipe({
        productId: 'p1',
        items: [
          { inventoryItemId: 'inv-2', quantity: 250 },
          { inventoryItemId: 'inv-3', quantity: 1000 },
        ],
      });

      expect(result.items).toHaveLength(2);
      expect(result.items.map((i) => i.inventoryItemId)).toEqual(['inv-2', 'inv-3']);

      // No INSERT INTO recipe (this was an update path).
      expect(adapter.calls.some((c) => isRecipeInsert(c.sql))).toBe(false);

      // DELETE precedes every item INSERT within the same call sequence.
      const deleteIdx = adapter.calls.findIndex((c) => c.sql.includes('DELETE FROM recipe_item'));
      expect(deleteIdx).toBeGreaterThanOrEqual(0);

      const insertItemCalls = adapter.calls.filter((c) => c.sql.includes('INSERT INTO recipe_item'));
      expect(insertItemCalls).toHaveLength(2);
      for (const insertCall of insertItemCalls) {
        expect(adapter.calls.indexOf(insertCall)).toBeGreaterThan(deleteIdx);
      }

      // sort_order defaults to the array index (0, 1).
      expect(insertItemCalls[0].params[4]).toBe(0);
      expect(insertItemCalls[1].params[4]).toBe(1);
    });

    it('rejects duplicate inventoryItemId with REPO_INVALID_STATE', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });

      const error = await upsertRecipe({
        productId: 'p1',
        items: [
          { inventoryItemId: 'inv-1', quantity: 100 },
          { inventoryItemId: 'inv-1', quantity: 200 },
        ],
      }).catch((e: unknown) => e);

      expect(isRepoError(error, REPO_ERROR.INVALID_STATE)).toBe(true);
      // Validation runs before any product/recipe I/O.
      expect(adapter.calls.some((c) => c.sql.includes('FROM product'))).toBe(false);
    });

    it('rejects quantity <= 0 with REPO_INVALID_STATE', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });

      const error = await upsertRecipe({
        productId: 'p1',
        items: [{ inventoryItemId: 'inv-1', quantity: 0 }],
      }).catch((e: unknown) => e);

      expect(isRepoError(error, REPO_ERROR.INVALID_STATE)).toBe(true);
      expect(adapter.calls.some((c) => c.sql.includes('FROM product'))).toBe(false);
    });

    it('rejects a directly-stocked product with REPO_INVALID_STATE (bridge XOR recipe)', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('FROM product', { id: 'p1', inventory_item_id: 'inv-9' });

      const error = await upsertRecipe({
        productId: 'p1',
        items: [{ inventoryItemId: 'inv-1', quantity: 100 }],
      }).catch((e: unknown) => e);

      expect(isRepoError(error, REPO_ERROR.INVALID_STATE)).toBe(true);
      expect(adapter.calls.some((c) => isRecipeInsert(c.sql))).toBe(false);
    });

    it('throws REPO_NOT_FOUND when the product is absent', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('FROM product', null);

      const error = await upsertRecipe({
        productId: 'missing',
        items: [{ inventoryItemId: 'inv-1', quantity: 100 }],
      }).catch((e: unknown) => e);

      expect(isRepoError(error, REPO_ERROR.NOT_FOUND)).toBe(true);
      expect(adapter.calls.some((c) => isRecipeInsert(c.sql))).toBe(false);
    });

    it('throws REPO_NOT_FOUND when an explicit id does not exist', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('FROM product', { id: 'p1', inventory_item_id: null });
      adapter.queueFirst('SELECT id, product_id FROM recipe WHERE id', null);

      const error = await upsertRecipe({
        id: 'missing-recipe',
        productId: 'p1',
        items: [{ inventoryItemId: 'inv-1', quantity: 100 }],
      }).catch((e: unknown) => e);

      expect(isRepoError(error, REPO_ERROR.NOT_FOUND)).toBe(true);
    });

    it('throws REPO_INVALID_STATE when an explicit id targets a different product', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('FROM product', { id: 'p1', inventory_item_id: null });
      // The recipe already exists but is bound to another product.
      adapter.queueFirst('SELECT id, product_id FROM recipe WHERE id', { id: 'r1', product_id: 'p2' });

      const error = await upsertRecipe({
        id: 'r1',
        productId: 'p1',
        items: [{ inventoryItemId: 'inv-1', quantity: 100 }],
      }).catch((e: unknown) => e);

      expect(isRepoError(error, REPO_ERROR.INVALID_STATE)).toBe(true);
      // No recipe INSERT/UPDATE was issued.
      expect(adapter.calls.some((c) => isRecipeInsert(c.sql))).toBe(false);
      expect(adapter.calls.some((c) => c.sql.includes('UPDATE recipe'))).toBe(false);
    });
  });

  describe('getRecipeByProductId', () => {
    it('returns null when the product has no recipe', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('WHERE product_id = ?', null);

      await expect(getRecipeByProductId('p1')).resolves.toBeNull();
    });

    it('maps 0/1 flags and nulls and attaches ordered items', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('WHERE product_id = ?', {
        ...RECIPE_ROW,
        is_active: 0,
        description: 'A green drink',
        notes: 'Use ceremonial grade',
      });
      adapter.queueAll('FROM recipe_item', [RECIPE_ITEM_ROW]);

      const result = await getRecipeByProductId('p1');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('r1');
      expect(result!.productId).toBe('p1');
      expect(result!.isActive).toBe(false);
      expect(result!.description).toBe('A green drink');
      expect(result!.notes).toBe('Use ceremonial grade');
      expect(result!.items).toHaveLength(1);
      expect(result!.items[0].inventoryItemId).toBe('inv-1');
      expect(result!.items[0].quantity).toBe(500);

      const itemCall = adapter.calls.find((c) => c.sql.includes('FROM recipe_item'));
      expect(itemCall).toBeDefined();
      expect(itemCall!.sql).toContain('ORDER BY sort_order ASC');
    });
  });

  describe('listRecipes', () => {
    it('maps 0/1 flags and nulls', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueAll('WHERE business_id = ?', [
        { ...RECIPE_ROW, is_active: 0, description: 'desc', notes: 'notes' },
        { ...RECIPE_ROW, id: 'r2', product_id: 'p2', name: 'Burger', is_active: 1 },
      ]);
      adapter.queueAll('FROM recipe_item', []);

      const result = await listRecipes();

      expect(result).toHaveLength(2);
      expect(result[0].isActive).toBe(false);
      expect(result[0].description).toBe('desc');
      expect(result[0].notes).toBe('notes');
      expect(result[1].isActive).toBe(true);
      expect(result[1].description).toBeNull();
      expect(result[1].notes).toBeNull();
    });

    it('returns [] without touching recipe_item when no recipes exist', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueAll('WHERE business_id = ?', []);

      const result = await listRecipes();

      expect(result).toEqual([]);
      expect(adapter.calls.some((c) => c.sql.includes('FROM recipe_item'))).toBe(false);
    });

    it('fetches all items in a single IN(...) query and groups them by recipe', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueAll('WHERE business_id = ?', [
        { ...RECIPE_ROW, id: 'r1', name: 'A' },
        { ...RECIPE_ROW, id: 'r2', product_id: 'p2', name: 'B' },
      ]);
      adapter.queueAll('FROM recipe_item', [
        { ...RECIPE_ITEM_ROW, id: 'ri1', recipe_id: 'r1', inventory_item_id: 'inv-1', quantity: 100 },
        { ...RECIPE_ITEM_ROW, id: 'ri2', recipe_id: 'r2', inventory_item_id: 'inv-2', quantity: 200 },
        { ...RECIPE_ITEM_ROW, id: 'ri3', recipe_id: 'r1', inventory_item_id: 'inv-3', quantity: 300, sort_order: 1 },
      ]);

      const result = await listRecipes();

      expect(result).toHaveLength(2);
      expect(result[0].items.map((i) => i.inventoryItemId)).toEqual(['inv-1', 'inv-3']);
      expect(result[1].items.map((i) => i.inventoryItemId)).toEqual(['inv-2']);

      // Exactly one recipe_item query (N+1 avoidance), with an IN (...) list.
      const itemQueries = adapter.calls.filter((c) => c.sql.includes('FROM recipe_item'));
      expect(itemQueries).toHaveLength(1);
      expect(itemQueries[0].sql).toContain('IN (?, ?)');
      expect(itemQueries[0].params).toEqual(['r1', 'r2']);
    });
  });

  describe('setRecipeActive', () => {
    it('emits is_active = ? and returns the refreshed recipe with items', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('SELECT id FROM recipe', { id: 'r1' }); // existence check
      adapter.queueFirst('FROM recipe WHERE id', { ...RECIPE_ROW, is_active: 0 }); // select-back
      adapter.queueAll('FROM recipe_item', []);

      const result = await setRecipeActive('r1', false);

      expect(result.isActive).toBe(false);

      const updateCall = adapter.calls.find((c) => c.sql.includes('UPDATE recipe SET'));
      expect(updateCall).toBeDefined();
      expect(updateCall!.sql).toContain('is_active = ?');
      expect(updateCall!.sql).toContain('updated_at = ?');
      // params: [is_active, updated_at, id, business_id]
      expect(updateCall!.params[0]).toBe(0);
      expect(updateCall!.params[2]).toBe('r1');
      expect(updateCall!.params[3]).toBe('biz-1');
    });

    it('throws REPO_NOT_FOUND when the recipe is absent', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('SELECT id FROM recipe', null);

      const error = await setRecipeActive('missing', true).catch((e: unknown) => e);

      expect(isRepoError(error, REPO_ERROR.NOT_FOUND)).toBe(true);
    });
  });
});
