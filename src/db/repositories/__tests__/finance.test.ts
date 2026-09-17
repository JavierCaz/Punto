/**
 * @jest-environment node
 *
 * Finance repository tests against the scripted RecordingAdapter fake
 * (no native SQLite — see AGENTS §9.4).
 */

import { getDb } from '@/db/client';

import { resetBusinessIdForTesting } from '@/db/repositories/business-scope';
import { REPO_ERROR, isRepoError } from '@/db/repositories/errors';
import {
  createFinancialCategory,
  createFinancialTransaction,
  ensureDefaultFinancialCategories,
  getFinancialCategoryById,
  getFinancialTransactionById,
  listFinancialCategories,
  listFinancialTransactions,
  updateFinancialCategory,
} from '@/db/repositories/finance';
import type { FinanceType } from '@/db/repositories/types';
import { makeFakeDb } from '@/db/repositories/__tests__/fakes/fake-db';
import { RecordingAdapter } from '@/db/repositories/__tests__/fakes/recording-adapter';

jest.mock('@/db/client', () => ({ getDb: jest.fn() }));
jest.mock('expo-crypto', () => ({ randomUUID: jest.fn(() => 'uuid-test') }));

/** A canonical system category row used to seed the fake across tests. */
const CATEGORY_ROW = {
  id: 'cat-1',
  business_id: 'biz-1',
  name: 'Rent',
  type: 'EXPENSE',
  is_system: 1,
  is_active: 1,
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
};

/** A canonical transaction row (snake_case) used to seed the fake. */
const TRANSACTION_ROW = {
  id: 'ft-1',
  business_id: 'biz-1',
  category_id: 'cat-1',
  amount_minor: 150000,
  payment_method_id: 'pm1',
  supplier_id: 'sup-1',
  employee_id: 'emp-1',
  description: 'Rent payment',
  reference_type: 'expense',
  reference_id: 'ref-1',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

describe('finance repository', () => {
  let adapter: RecordingAdapter;

  beforeEach(() => {
    adapter = new RecordingAdapter();
    (getDb as jest.Mock).mockResolvedValue(makeFakeDb(adapter));
    resetBusinessIdForTesting();
  });

  // =========================================================================
  // Categories
  // =========================================================================

  describe('listFinancialCategories', () => {
    it('lists active categories by default, maps 0/1 flags, orders by name', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueAll('FROM financial_category', [
        CATEGORY_ROW,
        {
          id: 'cat-2',
          business_id: 'biz-1',
          name: 'Supplies',
          type: 'EXPENSE',
          is_system: 0,
          is_active: 0,
          created_at: '2024-01-02T00:00:00.000Z',
          updated_at: '2024-01-02T00:00:00.000Z',
        },
      ]);

      const result = await listFinancialCategories();

      expect(result).toHaveLength(2);
      // 0/1 flags → booleans; is_system is exposed but read-only.
      expect(result[0]).toEqual({
        id: 'cat-1',
        businessId: 'biz-1',
        name: 'Rent',
        type: 'EXPENSE',
        isSystem: true,
        isActive: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      });
      expect(result[1].isSystem).toBe(false);
      expect(result[1].isActive).toBe(false);

      const listCall = adapter.calls.find((c) => c.sql.includes('FROM financial_category'));
      expect(listCall).toBeDefined();
      expect(listCall!.params).toEqual(['biz-1']);
      expect(listCall!.sql).toContain('is_active = 1');
      expect(listCall!.sql).toContain('ORDER BY name ASC');
    });

    it('includeInactive omits the is_active filter', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueAll('FROM financial_category', []);

      await listFinancialCategories({ includeInactive: true });

      const listCall = adapter.calls.find((c) => c.sql.includes('FROM financial_category'));
      expect(listCall).toBeDefined();
      expect(listCall!.sql).not.toContain('is_active = 1');
    });

    it('type filter adds a type = ? predicate', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueAll('FROM financial_category', []);

      await listFinancialCategories({ type: 'INCOME' });

      const listCall = adapter.calls.find((c) => c.sql.includes('FROM financial_category'));
      expect(listCall).toBeDefined();
      expect(listCall!.sql).toContain('type = ?');
      expect(listCall!.params).toEqual(['biz-1', 'INCOME']);
    });
  });

  describe('getFinancialCategoryById', () => {
    it('returns null when the category is missing', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('FROM financial_category', null);

      await expect(getFinancialCategoryById('nope')).resolves.toBeNull();
    });

    it('returns the mapped row when present', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('FROM financial_category', CATEGORY_ROW);

      const result = await getFinancialCategoryById('cat-1');
      expect(result).not.toBeNull();
      expect(result!.id).toBe('cat-1');
      expect(result!.isSystem).toBe(true);
    });
  });

  describe('createFinancialCategory', () => {
    it('passes business_id + timestamps, trims name, forces is_system = 0', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('FROM financial_category', {
        ...CATEGORY_ROW,
        name: 'Rent',
        is_system: 0,
      });

      const result = await createFinancialCategory({ name: ' Rent ', type: 'EXPENSE' });

      expect(result.name).toBe('Rent');
      expect(result.type).toBe('EXPENSE');
      expect(result.isSystem).toBe(false);
      expect(result.isActive).toBe(true);

      const insertCall = adapter.calls.find((c) => c.sql.includes('INSERT INTO financial_category'));
      expect(insertCall).toBeDefined();
      // id, business_id, name, type, is_system, is_active, created_at, updated_at
      expect(insertCall!.params[0]).toBe('uuid-test');
      expect(insertCall!.params[1]).toBe('biz-1');
      expect(insertCall!.params[2]).toBe('Rent'); // trimmed
      expect(insertCall!.params[3]).toBe('EXPENSE');
      expect(insertCall!.params[4]).toBe(0); // is_system read-only → 0
      expect(insertCall!.params[5]).toBe(1); // is_active (default true)
      expect(insertCall!.params[6]).toBe(insertCall!.params[7]); // created_at === updated_at
      expect(typeof insertCall!.params[6]).toBe('string');
    });

    it('rejects an invalid type with REPO_INVALID_STATE before touching the DB', async () => {
      const error = await createFinancialCategory({
        name: 'Crypto',
        type: 'BOGUS' as unknown as FinanceType,
      }).catch((e) => e);

      expect(isRepoError(error, REPO_ERROR.INVALID_STATE)).toBe(true);
      // No DB calls should have been issued for a rejected input.
      expect(adapter.calls).toHaveLength(0);
    });
  });

  describe('updateFinancialCategory', () => {
    it('issues SET params for name/isActive and returns the fresh row', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('SELECT id, is_system FROM financial_category', { id: 'cat-1', is_system: 0 }); // existence check
      adapter.queueFirst('FROM financial_category', {
        ...CATEGORY_ROW,
        name: 'Utilities',
        is_active: 0,
      });

      const result = await updateFinancialCategory('cat-1', { name: 'Utilities', isActive: false });

      expect(result.name).toBe('Utilities');
      expect(result.isActive).toBe(false);

      const updateCall = adapter.calls.find((c) => c.sql.includes('UPDATE financial_category SET'));
      expect(updateCall).toBeDefined();
      expect(updateCall!.sql).toContain('name = ?');
      expect(updateCall!.sql).toContain('is_active = ?');
      expect(updateCall!.sql).toContain('updated_at = ?');
      // type / is_system are immutable — never part of the SET clause.
      expect(updateCall!.sql).not.toContain('type = ?');
      expect(updateCall!.sql).not.toContain('is_system = ?');
      expect(updateCall!.params).toContain('Utilities');
      expect(updateCall!.params).toContain(0);
    });

    it('throws REPO_NOT_FOUND when the category is absent', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('SELECT id, is_system FROM financial_category', null);

      await expect(updateFinancialCategory('missing', { name: 'X' })).rejects.toThrow(
        REPO_ERROR.NOT_FOUND,
      );
    });

    it('throws REPO_INVALID_STATE when the category is a system row', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('SELECT id, is_system FROM financial_category', { id: 'cat-1', is_system: 1 });

      const error = await updateFinancialCategory('cat-1', { name: 'Hacked' }).catch(
        (e: unknown) => e,
      );

      expect(isRepoError(error, REPO_ERROR.INVALID_STATE)).toBe(true);
      expect(adapter.calls.some((c) => c.sql.includes('UPDATE financial_category'))).toBe(false);
    });
  });

  // =========================================================================
  // Transactions
  // =========================================================================

  describe('createFinancialTransaction', () => {
    it('rejects amountMinor <= 0 with REPO_INVALID_STATE and no writes', async () => {
      const error = await createFinancialTransaction({
        categoryId: 'cat-1',
        amountMinor: 0,
      }).catch((e) => e);

      expect(isRepoError(error, REPO_ERROR.INVALID_STATE)).toBe(true);
      expect(adapter.calls).toHaveLength(0);
    });

    it('throws REPO_NOT_FOUND when the category is missing, with no INSERT', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('SELECT id FROM financial_category', null);

      const error = await createFinancialTransaction({
        categoryId: 'missing',
        amountMinor: 1000,
      }).catch((e) => e);

      expect(isRepoError(error, REPO_ERROR.NOT_FOUND)).toBe(true);
      const writes = adapter.calls.filter((c) => c.sql.includes('INSERT'));
      expect(writes).toHaveLength(0);
    });

    it('throws REPO_NOT_FOUND for an inactive category (existence check filters is_active)', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('SELECT id FROM financial_category', null);

      const error = await createFinancialTransaction({
        categoryId: 'cat-inactive',
        amountMinor: 1000,
      }).catch((e) => e);

      expect(isRepoError(error, REPO_ERROR.NOT_FOUND)).toBe(true);
      const check = adapter.calls.find((c) => c.sql.includes('SELECT id FROM financial_category'));
      expect(check).toBeDefined();
      expect(check!.sql).toContain('is_active = 1');
      expect(check!.params).toEqual(['cat-inactive', 'biz-1']);
    });

    it('passes business_id + timestamps, stores a positive amount, returns the mapped row', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('SELECT id FROM financial_category', { id: 'cat-1' });
      adapter.queueFirst('FROM financial_transaction', { ...TRANSACTION_ROW, id: 'uuid-test' });

      const result = await createFinancialTransaction({
        categoryId: 'cat-1',
        amountMinor: 150000,
        paymentMethodId: 'pm1',
        supplierId: 'sup-1',
        employeeId: 'emp-1',
        description: 'Rent payment',
        referenceType: 'expense',
        referenceId: 'ref-1',
      });

      expect(result.amountMinor).toBe(150000);
      expect(result.businessId).toBe('biz-1');
      expect(result.categoryId).toBe('cat-1');

      const insertCall = adapter.calls.find((c) => c.sql.includes('INSERT INTO financial_transaction'));
      expect(insertCall).toBeDefined();
      // id, business_id, category_id, amount_minor, payment_method_id, supplier_id,
      // employee_id, description, reference_type, reference_id, created_at, updated_at
      expect(insertCall!.params[0]).toBe('uuid-test');
      expect(insertCall!.params[1]).toBe('biz-1');
      expect(insertCall!.params[2]).toBe('cat-1');
      expect(insertCall!.params[3]).toBe(150000); // positive — direction from category
      expect(insertCall!.params[4]).toBe('pm1');
      expect(insertCall!.params[5]).toBe('sup-1');
      expect(insertCall!.params[6]).toBe('emp-1');
      expect(insertCall!.params[7]).toBe('Rent payment');
      expect(insertCall!.params[8]).toBe('expense');
      expect(insertCall!.params[9]).toBe('ref-1');
      expect(insertCall!.params[10]).toBe(insertCall!.params[11]); // created_at === updated_at
      expect(typeof insertCall!.params[10]).toBe('string');
    });

    it('binds null for omitted optional FK ids', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('SELECT id FROM financial_category', { id: 'cat-1' });
      adapter.queueFirst('FROM financial_transaction', {
        ...TRANSACTION_ROW,
        payment_method_id: null,
        supplier_id: null,
        employee_id: null,
        description: null,
        reference_type: null,
        reference_id: null,
      });

      await createFinancialTransaction({ categoryId: 'cat-1', amountMinor: 500 });

      const insertCall = adapter.calls.find((c) => c.sql.includes('INSERT INTO financial_transaction'));
      expect(insertCall!.params[4]).toBeNull(); // payment_method_id
      expect(insertCall!.params[5]).toBeNull(); // supplier_id
      expect(insertCall!.params[6]).toBeNull(); // employee_id
      expect(insertCall!.params[7]).toBeNull(); // description
      expect(insertCall!.params[8]).toBeNull(); // reference_type
      expect(insertCall!.params[9]).toBeNull(); // reference_id
    });
  });

  describe('getFinancialTransactionById', () => {
    it('returns null when missing', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('FROM financial_transaction', null);

      await expect(getFinancialTransactionById('nope')).resolves.toBeNull();
    });

    it('maps null optional FKs and integer amount', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('FROM financial_transaction', {
        ...TRANSACTION_ROW,
        payment_method_id: null,
        supplier_id: null,
        employee_id: null,
        description: null,
        reference_type: null,
        reference_id: null,
      });

      const result = await getFinancialTransactionById('ft-1');
      expect(result).not.toBeNull();
      expect(result!.amountMinor).toBe(150000);
      expect(result!.paymentMethodId).toBeNull();
      expect(result!.supplierId).toBeNull();
      expect(result!.employeeId).toBeNull();
      expect(result!.description).toBeNull();
      expect(result!.referenceType).toBeNull();
      expect(result!.referenceId).toBeNull();
    });
  });

  describe('listFinancialTransactions', () => {
    const fullPage = Array.from({ length: 50 }, (_, i) => ({
      ...TRANSACTION_ROW,
      id: `ft-${i}`,
      created_at: `2026-01-01T00:00:${String(i).padStart(2, '0')}.000Z`,
    }));

    it('emits DESC ordering + keyset clause and nextCursor on a full page', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueAll('FROM financial_transaction', fullPage);

      const result = await listFinancialTransactions({
        cursor: '2026-01-02T00:00:00.000Z|ft-x',
      });

      const call = adapter.calls.find((c) => c.sql.includes('FROM financial_transaction'));
      expect(call).toBeDefined();
      expect(call!.sql).toContain('ORDER BY ft.created_at DESC, ft.id DESC');
      expect(call!.sql).toContain('(ft.created_at, ft.id) < (?, ?)');
      // params: [businessId, cursorCreatedAt, cursorId, limit]
      expect(call!.params).toEqual(['biz-1', '2026-01-02T00:00:00.000Z', 'ft-x', 50]);

      expect(result.items).toHaveLength(50);
      // Full page → cursor encoded from the last row's (created_at, id).
      expect(result.nextCursor).toBe('2026-01-01T00:00:49.000Z|ft-49');
    });

    it('returns null nextCursor on a partial page and omits the keyset clause without a cursor', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueAll('FROM financial_transaction', [TRANSACTION_ROW]);

      const result = await listFinancialTransactions();

      const call = adapter.calls.find((c) => c.sql.includes('FROM financial_transaction'));
      expect(call!.sql).not.toContain('(ft.created_at, ft.id) <');
      expect(call!.sql).toContain('ORDER BY ft.created_at DESC, ft.id DESC');
      expect(call!.params).toEqual(['biz-1', 50]);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('ft-1');
      expect(result.items[0].amountMinor).toBe(150000);
      expect(result.nextCursor).toBeNull();
    });

    it('emits the category JOIN for the type filter and binds all optional filters', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueAll('FROM financial_transaction', []);

      await listFinancialTransactions({
        categoryId: 'cat-1',
        type: 'EXPENSE',
        from: '2026-01-01T00:00:00.000Z',
        to: '2026-02-01T00:00:00.000Z',
      });

      const call = adapter.calls.find((c) => c.sql.includes('FROM financial_transaction'));
      expect(call).toBeDefined();
      expect(call!.sql).toContain('JOIN financial_category c ON c.id = ft.category_id');
      expect(call!.sql).toContain('ft.category_id = ?');
      expect(call!.sql).toContain('c.type = ?');
      expect(call!.sql).toContain('ft.created_at >= ?');
      expect(call!.sql).toContain('ft.created_at <= ?');
      // params: [businessId, categoryId, type, from, to, limit]
      expect(call!.params).toEqual([
        'biz-1',
        'cat-1',
        'EXPENSE',
        '2026-01-01T00:00:00.000Z',
        '2026-02-01T00:00:00.000Z',
        50,
      ]);
    });

    it('does not join financial_category when type is absent', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueAll('FROM financial_transaction', []);

      await listFinancialTransactions({ categoryId: 'cat-1' });

      const call = adapter.calls.find((c) => c.sql.includes('FROM financial_transaction'));
      expect(call!.sql).not.toContain('JOIN financial_category');
      expect(call!.sql).toContain('ft.category_id = ?');
      expect(call!.params).toEqual(['biz-1', 'cat-1', 50]);
    });
  });
});


describe('ensureDefaultFinancialCategories', () => {
  let adapter: RecordingAdapter;

  beforeEach(() => {
    adapter = new RecordingAdapter();
    (getDb as jest.Mock).mockResolvedValue(makeFakeDb(adapter));
    resetBusinessIdForTesting();
  });

  it('seeds localized system categories when the business has none', async () => {
    adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
    adapter.queueAll('FROM financial_category', []);

    const result = await ensureDefaultFinancialCategories('es');

    expect(result).toHaveLength(6);
    expect(result.filter((category) => category.type === 'EXPENSE')).toHaveLength(5);
    expect(result.filter((category) => category.type === 'INCOME')).toHaveLength(1);
    expect(result.every((category) => category.isSystem)).toBe(true);
    expect(result.map((category) => category.name)).toContain('Renta');
    expect(result.map((category) => category.name)).toContain('Otros ingresos');

    const inserts = adapter.calls.filter((call) => call.sql.includes('INSERT INTO financial_category'));
    expect(inserts).toHaveLength(6);
    // is_system = 1 for every seeded row; business id bound on each.
    expect(inserts[0].params[1]).toBe('biz-1');
  });

  it('never injects duplicates once the business has categories', async () => {
    adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
    adapter.queueAll('FROM financial_category', [CATEGORY_ROW]);

    const result = await ensureDefaultFinancialCategories('en');

    expect(result).toHaveLength(1);
    expect(adapter.calls.some((call) => call.sql.includes('INSERT INTO financial_category'))).toBe(false);
  });
});