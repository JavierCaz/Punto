/**
 * @jest-environment node
 *
 * Product repository tests against the scripted RecordingAdapter fake
 * (no native SQLite — see AGENTS §9.4). They pin the exact SQL shape,
 * parameter order, soft-delete semantics, the direct-stock ↔ recipe XOR
 * invariant, and mapper 0/1 + null coercions the repository relies on.
 */

import { getDb } from '@/db/client';

import { resetBusinessIdForTesting } from '@/db/repositories/business-scope';
import { REPO_ERROR, isRepoError } from '@/db/repositories/errors';
import {
  archiveProduct,
  createProduct,
  getProductById,
  listProducts,
  updateProduct,
} from '@/db/repositories/product';
import { makeFakeDb } from '@/db/repositories/__tests__/fakes/fake-db';
import { RecordingAdapter } from '@/db/repositories/__tests__/fakes/recording-adapter';

jest.mock('@/db/client', () => ({ getDb: jest.fn() }));
jest.mock('expo-crypto', () => ({ randomUUID: jest.fn(() => 'uuid-test') }));

/** A canonical live product row as SQLite would surface it (snake_case). */
const PRODUCT_ROW = {
  id: 'p1',
  business_id: 'biz-1',
  category_id: 'cat-1',
  name: 'Matcha Latte',
  description: null,
  image_uri: null,
  sku: 'ML-001',
  barcode: null,
  price_minor: 450,
  inventory_item_id: null,
  is_active: 1,
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
  archived_at: null,
};

describe('product repository', () => {
  let adapter: RecordingAdapter;

  beforeEach(() => {
    adapter = new RecordingAdapter();
    (getDb as jest.Mock).mockResolvedValue(makeFakeDb(adapter));
    resetBusinessIdForTesting();
  });

  describe('listProducts', () => {
    it('maps 0/1 flags and nulls, scopes by business, excludes archived by default', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueAll('FROM product', [
        PRODUCT_ROW,
        {
          id: 'p2',
          business_id: 'biz-1',
          category_id: null,
          name: 'Chips',
          description: 'Bag of chips',
          image_uri: 'file:///chips.png',
          sku: null,
          barcode: '123456789012',
          price_minor: 100,
          inventory_item_id: 'inv-9',
          is_active: 0,
          created_at: '2024-01-02T00:00:00.000Z',
          updated_at: '2024-01-02T00:00:00.000Z',
          archived_at: '2024-02-01T00:00:00.000Z',
        },
      ]);

      const result = await listProducts();

      expect(result).toHaveLength(2);
      // 0/1 flags → booleans; null categoryId/sku/barcode/inventoryItemId stay null.
      expect(result[0]).toEqual({
        id: 'p1',
        businessId: 'biz-1',
        categoryId: 'cat-1',
        name: 'Matcha Latte',
        description: null,
        imageUri: null,
        sku: 'ML-001',
        barcode: null,
        priceMinor: 450,
        inventoryItemId: null,
        isActive: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        archivedAt: null,
      });
      expect(result[1].isActive).toBe(false);
      expect(result[1].categoryId).toBeNull();
      expect(result[1].sku).toBeNull();
      expect(result[1].barcode).toBe('123456789012');
      expect(result[1].inventoryItemId).toBe('inv-9');

      const listCall = adapter.calls.find((c) => c.sql.includes('FROM product'));
      expect(listCall).toBeDefined();
      expect(listCall!.params).toEqual(['biz-1']);
      expect(listCall!.sql).toContain('archived_at IS NULL');
      expect(listCall!.sql).toContain('ORDER BY name ASC');
    });

    it('includeArchived omits the archive predicate', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueAll('FROM product', []);

      await listProducts({ includeArchived: true });

      const listCall = adapter.calls.find((c) => c.sql.includes('FROM product'));
      expect(listCall).toBeDefined();
      expect(listCall!.sql).not.toContain('archived_at IS NULL');
    });

    it('applies categoryId and search filters with correct params', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueAll('FROM product', []);

      await listProducts({ categoryId: 'cat-9', search: '  latte  ' });

      const listCall = adapter.calls.find((c) => c.sql.includes('FROM product'));
      expect(listCall).toBeDefined();
      expect(listCall!.sql).toContain('category_id = ?');
      expect(listCall!.sql).toContain('name LIKE ?');
      // params order: business_id, category_id, %search%, (no pagination)
      expect(listCall!.params).toEqual(['biz-1', 'cat-9', '%latte%']);
    });

    it('applies limit and offset pagination', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueAll('FROM product', []);

      await listProducts({ limit: 5, offset: 10 });

      const listCall = adapter.calls.find((c) => c.sql.includes('FROM product'));
      expect(listCall!.sql).toContain('LIMIT ?');
      expect(listCall!.sql).toContain('OFFSET ?');
      expect(listCall!.params).toEqual(['biz-1', 5, 10]);
    });
  });

  describe('getProductById', () => {
    it('maps 0/1 flags to booleans and preserves nulls', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('FROM product', {
        ...PRODUCT_ROW,
        is_active: 0,
        category_id: null,
        sku: null,
        barcode: null,
        inventory_item_id: null,
      });

      const result = await getProductById('p1');

      expect(result).not.toBeNull();
      expect(result!.isActive).toBe(false);
      expect(result!.categoryId).toBeNull();
      expect(result!.sku).toBeNull();
      expect(result!.barcode).toBeNull();
      expect(result!.inventoryItemId).toBeNull();
      expect(result!.priceMinor).toBe(450);
      expect(result!.businessId).toBe('biz-1');
    });

    it('returns null when the row is absent', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('FROM product', null);

      await expect(getProductById('missing')).resolves.toBeNull();
    });
  });

  describe('createProduct', () => {
    it('passes business_id + timestamps, trims name, preserves price, returns mapped row', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('FROM product', PRODUCT_ROW);

      const result = await createProduct({
        name: '  Matcha Latte  ',
        categoryId: 'cat-1',
        sku: 'ML-001',
        priceMinor: 450,
      });

      expect(result.id).toBe('p1');
      expect(result.name).toBe('Matcha Latte');
      expect(result.priceMinor).toBe(450);
      expect(result.isActive).toBe(true);

      const insertCall = adapter.calls.find((c) => c.sql.includes('INSERT INTO product'));
      expect(insertCall).toBeDefined();
      // id, business_id, category_id, name, description, image_uri, sku,
      // barcode, price_minor, inventory_item_id, is_active, created_at, updated_at
      const params = insertCall!.params;
      expect(params).toHaveLength(13);
      expect(params[0]).toBe('uuid-test');
      expect(params[1]).toBe('biz-1');
      expect(params[2]).toBe('cat-1');
      expect(params[3]).toBe('Matcha Latte'); // trimmed
      expect(params[4]).toBeNull(); // description
      expect(params[5]).toBeNull(); // image_uri
      expect(params[6]).toBe('ML-001'); // sku
      expect(params[7]).toBeNull(); // barcode
      expect(params[8]).toBe(450); // price_minor
      expect(params[9]).toBeNull(); // inventory_item_id
      expect(params[10]).toBe(1); // is_active (default true)
      expect(typeof params[11]).toBe('string'); // created_at
      expect(params[11]).toBe(params[12]); // created_at === updated_at
    });

    it('maps isActive: false to the integer 0', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('FROM product', { ...PRODUCT_ROW, is_active: 0 });

      await createProduct({ name: 'Dormant', priceMinor: 100, isActive: false });

      const insertCall = adapter.calls.find((c) => c.sql.includes('INSERT INTO product'));
      expect(insertCall!.params[10]).toBe(0);
    });

    it('throws REPO_INVALID_STATE for a negative price with zero DB writes', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });

      const error = await createProduct({ name: 'X', priceMinor: -1 }).catch((e: unknown) => e);

      expect(isRepoError(error, REPO_ERROR.INVALID_STATE)).toBe(true);
      // Only the business-scope SELECT ran; no INSERT/UPDATE was ever issued.
      expect(adapter.calls.some((c) => c.sql.includes('INSERT INTO product'))).toBe(false);
      expect(adapter.calls.some((c) => c.sql.includes('UPDATE product'))).toBe(false);
    });

    it('throws REPO_INVALID_STATE when bridging inventoryItemId to a product that has a recipe', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('SELECT id FROM recipe', { id: 'recipe-1' });

      const error = await createProduct({
        name: 'Burger',
        priceMinor: 500,
        inventoryItemId: 'inv-1',
      }).catch((e: unknown) => e);

      expect(isRepoError(error, REPO_ERROR.INVALID_STATE)).toBe(true);
      expect(adapter.calls.some((c) => c.sql.includes('INSERT INTO product'))).toBe(false);
    });

    it('bridges inventoryItemId when no recipe exists', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('SELECT id FROM recipe', null);
      adapter.queueFirst('FROM product', { ...PRODUCT_ROW, inventory_item_id: 'inv-1' });

      const result = await createProduct({
        name: 'Chips',
        priceMinor: 100,
        inventoryItemId: 'inv-1',
      });

      const insertCall = adapter.calls.find((c) => c.sql.includes('INSERT INTO product'));
      expect(insertCall!.params[9]).toBe('inv-1');
      expect(result.inventoryItemId).toBe('inv-1');
    });

    it('maps a UNIQUE constraint failure to REPO_DUPLICATE', async () => {
      const throwingAdapter = new RecordingAdapter();
      throwingAdapter.runAsync = async () => {
        throw new Error('UNIQUE constraint failed: product.business_id, product.sku');
      };
      (getDb as jest.Mock).mockResolvedValue(makeFakeDb(throwingAdapter));
      resetBusinessIdForTesting();
      throwingAdapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });

      const error = await createProduct({ name: 'X', priceMinor: 100, sku: 'DUP' }).catch(
        (e: unknown) => e,
      );

      expect(isRepoError(error, REPO_ERROR.DUPLICATE)).toBe(true);
    });
  });

  describe('updateProduct', () => {
    it('issues SET params for provided fields and returns the fresh row', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('SELECT id FROM product', { id: 'p1' }); // existence check
      adapter.queueFirst('FROM product', {
        ...PRODUCT_ROW,
        name: 'Food',
        price_minor: 500,
        updated_at: '2024-01-03T00:00:00.000Z',
      });

      const result = await updateProduct('p1', { name: 'Food', priceMinor: 500 });

      expect(result.name).toBe('Food');
      expect(result.priceMinor).toBe(500);

      const updateCall = adapter.calls.find((c) => c.sql.includes('UPDATE product SET'));
      expect(updateCall).toBeDefined();
      expect(updateCall!.sql).toContain('name = ?');
      expect(updateCall!.sql).toContain('price_minor = ?');
      expect(updateCall!.sql).toContain('updated_at = ?');
      // params: [name, price_minor, updated_at, id, business_id]
      const params = updateCall!.params;
      expect(params[0]).toBe('Food');
      expect(params[1]).toBe(500);
      expect(params[params.length - 2]).toBe('p1');
      expect(params[params.length - 1]).toBe('biz-1');
    });

    it('throws REPO_NOT_FOUND when updating an absent row', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('SELECT id FROM product', null);

      const error = await updateProduct('missing', { name: 'X' }).catch((e: unknown) => e);

      expect(isRepoError(error, REPO_ERROR.NOT_FOUND)).toBe(true);
    });

    it('throws REPO_INVALID_STATE when bridging inventoryItemId over an existing recipe', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('SELECT id FROM product', { id: 'p1' }); // existence check
      adapter.queueFirst('SELECT id FROM recipe', { id: 'recipe-1' }); // recipe exists

      const error = await updateProduct('p1', { inventoryItemId: 'inv-1' }).catch(
        (e: unknown) => e,
      );

      expect(isRepoError(error, REPO_ERROR.INVALID_STATE)).toBe(true);
      expect(adapter.calls.some((c) => c.sql.includes('UPDATE product'))).toBe(false);
    });

    it('writes NULL for inventory_item_id when explicitly cleared', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('SELECT id FROM product', { id: 'p1' }); // existence check
      adapter.queueFirst('FROM product', { ...PRODUCT_ROW, inventory_item_id: null });

      await updateProduct('p1', { inventoryItemId: null });

      const updateCall = adapter.calls.find((c) => c.sql.includes('UPDATE product SET'));
      expect(updateCall).toBeDefined();
      expect(updateCall!.sql).toContain('inventory_item_id = ?');
      // Null is bound (clears the bridge); undefined would have skipped it.
      expect(updateCall!.params[0]).toBeNull();
    });
  });

    it('clears nullable fields when null is provided', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('SELECT id FROM product', { id: 'p1' }); // existence check
      adapter.queueFirst('FROM product', {
        ...PRODUCT_ROW,
        category_id: null,
        description: null,
        image_uri: null,
        barcode: null,
      });

      await updateProduct('p1', {
        categoryId: null,
        description: null,
        imageUri: null,
        barcode: null,
      });

      const updateCall = adapter.calls.find((c) => c.sql.includes('UPDATE product SET'));
      expect(updateCall).toBeDefined();
      expect(updateCall!.sql).toContain('category_id = ?');
      expect(updateCall!.sql).toContain('description = ?');
      expect(updateCall!.sql).toContain('image_uri = ?');
      expect(updateCall!.sql).toContain('barcode = ?');
      const params = updateCall!.params;
      expect(params[0]).toBeNull();
      expect(params[1]).toBeNull();
      expect(params[2]).toBeNull();
      expect(params[3]).toBeNull();
    });

    it('filters the XOR recipe check to active recipes', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('SELECT id FROM product', { id: 'p1' });
      adapter.queueFirst('SELECT id FROM recipe', null);
      adapter.queueFirst('FROM product', { ...PRODUCT_ROW, inventory_item_id: 'inv-1' });

      await updateProduct('p1', { inventoryItemId: 'inv-1' });

      const recipeCall = adapter.calls.find((c) => c.sql.includes('SELECT id FROM recipe'));
      expect(recipeCall).toBeDefined();
      expect(recipeCall!.sql).toContain('is_active = 1');
      const updateCall = adapter.calls.find((c) => c.sql.includes('UPDATE product SET'));
      expect(updateCall!.params[0]).toBe('inv-1');
    });

  describe('archiveProduct', () => {
    it('sets archived_at and updated_at on a live row', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('SELECT id FROM product', { id: 'p1' });

      await archiveProduct('p1');

      const updateCall = adapter.calls.find((c) => c.sql.includes('UPDATE product'));
      expect(updateCall).toBeDefined();
      expect(updateCall!.sql).toContain('archived_at = ?');
      expect(updateCall!.sql).toContain('updated_at = ?');
      // params: [archived_at, updated_at, id, business_id]
      const params = updateCall!.params;
      expect(params[0]).toBe(params[1]); // same timestamp
      expect(params[2]).toBe('p1');
      expect(params[3]).toBe('biz-1');
    });

    it('throws REPO_NOT_FOUND when archiving an absent row', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('SELECT id FROM product', null);

      const error = await archiveProduct('missing').catch((e: unknown) => e);

      expect(isRepoError(error, REPO_ERROR.NOT_FOUND)).toBe(true);
    });
  });
});
