/**
 * @jest-environment node
 *
 * Category repository tests against the scripted RecordingAdapter fake
 * (no native SQLite — see AGENTS §9.4).
 */

import { getDb } from '@/db';

import { resetBusinessIdForTesting } from '@/db/repositories/business-scope';
import {
  archiveCategory,
  createCategory,
  getCategoryById,
  listCategories,
  updateCategory,
} from '@/db/repositories/category';
import type { SqlValue } from '@/db/repositories/database';
import { REPO_ERROR, isRepoError } from '@/db/repositories/errors';
import { makeFakeDb } from '@/db/repositories/__tests__/fakes/fake-db';
import { RecordingAdapter } from '@/db/repositories/__tests__/fakes/recording-adapter';

jest.mock('@/db', () => ({ getDb: jest.fn() }));
jest.mock('expo-crypto', () => ({ randomUUID: jest.fn(() => 'uuid-test') }));

/** A canonical live category row used to seed the fake across tests. */
const CATEGORY_ROW = {
  id: 'c1',
  business_id: 'biz-1',
  name: 'Drinks',
  description: null,
  image_uri: null,
  sort_order: 0,
  is_active: 1,
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
  archived_at: null,
};

describe('category repository', () => {
  let adapter: RecordingAdapter;

  beforeEach(() => {
    adapter = new RecordingAdapter();
    (getDb as jest.Mock).mockResolvedValue(makeFakeDb(adapter));
    resetBusinessIdForTesting();
  });

  describe('listCategories', () => {
    it('maps 0/1 flags and nulls, excludes archived by default, orders correctly', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueAll('FROM category', [
        CATEGORY_ROW,
        {
          id: 'c2',
          business_id: 'biz-1',
          name: 'Food',
          description: 'Meals',
          image_uri: 'file:///food.png',
          sort_order: 2,
          is_active: 0,
          created_at: '2024-01-02T00:00:00.000Z',
          updated_at: '2024-01-02T00:00:00.000Z',
          archived_at: '2024-02-01T00:00:00.000Z',
        },
      ]);

      const result = await listCategories();

      expect(result).toHaveLength(2);
      // 0/1 flags → booleans; null description/imageUri stay null.
      expect(result[0]).toEqual({
        id: 'c1',
        businessId: 'biz-1',
        name: 'Drinks',
        description: null,
        imageUri: null,
        sortOrder: 0,
        isActive: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        archivedAt: null,
      });
      expect(result[1].isActive).toBe(false);
      expect(result[1].description).toBe('Meals');
      expect(result[1].imageUri).toBe('file:///food.png');

      const listCall = adapter.calls.find((c) => c.sql.includes('FROM category'));
      expect(listCall).toBeDefined();
      expect(listCall!.params).toEqual(['biz-1']);
      expect(listCall!.sql).toContain('archived_at IS NULL');
      expect(listCall!.sql).toContain('ORDER BY sort_order ASC, name ASC');
    });

    it('includeArchived omits the archive predicate', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueAll('FROM category', []);

      await listCategories({ includeArchived: true });

      const listCall = adapter.calls.find((c) => c.sql.includes('FROM category'));
      expect(listCall).toBeDefined();
      expect(listCall!.sql).not.toContain('archived_at IS NULL');
    });

    it('applies limit and offset pagination', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueAll('FROM category', []);

      await listCategories({ limit: 5, offset: 10 });

      const listCall = adapter.calls.find((c) => c.sql.includes('FROM category'));
      expect(listCall!.sql).toContain('LIMIT ?');
      expect(listCall!.sql).toContain('OFFSET ?');
      expect(listCall!.params).toEqual(['biz-1', 5, 10]);
    });
  });

  describe('getCategoryById', () => {
    it('returns null when the category is missing', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('archived_at', null);

      await expect(getCategoryById('nope')).resolves.toBeNull();
    });

    it('returns the mapped row when present', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('archived_at', CATEGORY_ROW);

      const result = await getCategoryById('c1');
      expect(result).not.toBeNull();
      expect(result!.id).toBe('c1');
      expect(result!.isActive).toBe(true);
    });
  });

  describe('createCategory', () => {
    it('passes business_id + timestamps, trims name, returns the mapped row', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('archived_at', CATEGORY_ROW);

      const result = await createCategory({ name: '  Drinks  ' });

      expect(result.id).toBe('c1');
      expect(result.name).toBe('Drinks');
      expect(result.isActive).toBe(true);

      const insertCall = adapter.calls.find((c) => c.sql.includes('INSERT INTO category'));
      expect(insertCall).toBeDefined();
      // id, business_id, name, description, image_uri, sort_order, is_active, created_at, updated_at
      expect(insertCall!.params[0]).toBe('uuid-test');
      expect(insertCall!.params[1]).toBe('biz-1');
      expect(insertCall!.params[2]).toBe('Drinks'); // trimmed
      expect(insertCall!.params[3]).toBeNull(); // description
      expect(insertCall!.params[4]).toBeNull(); // image_uri
      expect(insertCall!.params[5]).toBe(0); // sort_order
      expect(insertCall!.params[6]).toBe(1); // is_active (default true)
      expect(insertCall!.params[7]).toBe(insertCall!.params[8]); // created_at === updated_at
      expect(typeof insertCall!.params[7]).toBe('string');
    });

    it('maps a UNIQUE constraint failure to REPO_DUPLICATE', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      // Simulate the partial unique index (business_id, name) firing.
      adapter.runAsync = async (sql: string, ..._params: SqlValue[]) => {
        if (sql.includes('INSERT INTO category')) {
          throw new Error('UNIQUE constraint failed: category.business_id, category.name');
        }
        return { changes: 1, lastInsertRowId: 1 };
      };

      const error = await createCategory({ name: 'Drinks' }).catch((e) => e);
      expect(isRepoError(error, REPO_ERROR.DUPLICATE)).toBe(true);
    });
  });

  describe('updateCategory', () => {
    it('issues SET params for provided fields and returns the fresh row', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('SELECT id FROM category', { id: 'c1' }); // existence check
      adapter.queueFirst('archived_at', {
        ...CATEGORY_ROW,
        name: 'Food',
        is_active: 0,
        updated_at: '2024-01-02T00:00:00.000Z',
      });

      const result = await updateCategory('c1', { name: 'Food', isActive: false });

      expect(result.name).toBe('Food');
      expect(result.isActive).toBe(false);

      const updateCall = adapter.calls.find((c) => c.sql.includes('UPDATE category SET'));
      expect(updateCall).toBeDefined();
      expect(updateCall!.sql).toContain('name = ?');
      expect(updateCall!.sql).toContain('is_active = ?');
      expect(updateCall!.sql).toContain('updated_at = ?');
      expect(updateCall!.params).toContain('Food');
      expect(updateCall!.params).toContain(0);
    });

    it('throws REPO_NOT_FOUND when the category is absent', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('SELECT id FROM category', null);

      await expect(updateCategory('missing', { name: 'X' })).rejects.toThrow(
        REPO_ERROR.NOT_FOUND,
      );
    });
  });

  describe('archiveCategory', () => {
    it('throws REPO_NOT_FOUND when the category is absent', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('SELECT id FROM category', null); // live existence check → null

      await expect(archiveCategory('missing')).rejects.toThrow(REPO_ERROR.NOT_FOUND);
    });

    it('sets archived_at on an existing category', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('SELECT id FROM category', { id: 'c1' });

      await archiveCategory('c1');

      const updateCall = adapter.calls.find((c) => c.sql.includes('archived_at = ?'));
      expect(updateCall).toBeDefined();
      expect(updateCall!.sql).toContain('UPDATE category SET archived_at');
    });
  });
});
