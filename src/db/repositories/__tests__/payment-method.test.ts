/**
 * @jest-environment node
 *
 * Payment method repository tests against the scripted RecordingAdapter fake
 * (no native SQLite — see AGENTS §9.4).
 */

import { getDb } from '@/db/client';

import { resetBusinessIdForTesting } from '@/db/repositories/business-scope';
import { REPO_ERROR, isRepoError } from '@/db/repositories/errors';
import {
  createPaymentMethod,
  ensureDefaultPaymentMethods,
  getPaymentMethodById,
  listPaymentMethods,
  updatePaymentMethod,
} from '@/db/repositories/payment-method';
import type { PaymentType } from '@/db/repositories/types';
import { makeFakeDb } from '@/db/repositories/__tests__/fakes/fake-db';
import { RecordingAdapter } from '@/db/repositories/__tests__/fakes/recording-adapter';

jest.mock('@/db/client', () => ({ getDb: jest.fn() }));
jest.mock('expo-crypto', () => ({ randomUUID: jest.fn(() => 'uuid-test') }));

/** A canonical payment method row used to seed the fake across tests. */
const PAYMENT_METHOD_ROW = {
  id: 'pm1',
  business_id: 'biz-1',
  name: 'Cash',
  type: 'CASH',
  is_default: 1,
  is_active: 1,
  sort_order: 0,
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
};

describe('payment method repository', () => {
  let adapter: RecordingAdapter;

  beforeEach(() => {
    adapter = new RecordingAdapter();
    (getDb as jest.Mock).mockResolvedValue(makeFakeDb(adapter));
    resetBusinessIdForTesting();
  });

  describe('listPaymentMethods', () => {
    it('lists active methods by default, maps 0/1 flags, orders correctly', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueAll('FROM payment_method', [
        PAYMENT_METHOD_ROW,
        {
          id: 'pm2',
          business_id: 'biz-1',
          name: 'Card',
          type: 'CARD',
          is_default: 0,
          is_active: 0,
          sort_order: 1,
          created_at: '2024-01-02T00:00:00.000Z',
          updated_at: '2024-01-02T00:00:00.000Z',
        },
      ]);

      const result = await listPaymentMethods();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'pm1',
        businessId: 'biz-1',
        name: 'Cash',
        type: 'CASH',
        isDefault: true,
        isActive: true,
        sortOrder: 0,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      });
      expect(result[1].isDefault).toBe(false);
      expect(result[1].isActive).toBe(false);

      const listCall = adapter.calls.find((c) => c.sql.includes('FROM payment_method'));
      expect(listCall).toBeDefined();
      expect(listCall!.params).toEqual(['biz-1']);
      expect(listCall!.sql).toContain('is_active = 1');
      expect(listCall!.sql).toContain('ORDER BY sort_order ASC, name ASC');
    });

    it('includeInactive omits the is_active filter', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueAll('FROM payment_method', []);

      await listPaymentMethods({ includeInactive: true });

      const listCall = adapter.calls.find((c) => c.sql.includes('FROM payment_method'));
      expect(listCall).toBeDefined();
      expect(listCall!.sql).not.toContain('is_active = 1');
    });
  });

  describe('getPaymentMethodById', () => {
    it('returns null when missing', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('is_default', null);

      await expect(getPaymentMethodById('nope')).resolves.toBeNull();
    });

    it('returns the mapped row when present', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('is_default', PAYMENT_METHOD_ROW);

      const result = await getPaymentMethodById('pm1');
      expect(result).not.toBeNull();
      expect(result!.id).toBe('pm1');
      expect(result!.isDefault).toBe(true);
    });
  });

  describe('createPaymentMethod', () => {
    it('passes business_id + timestamps, trims name, returns the mapped row', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('is_default', {
        ...PAYMENT_METHOD_ROW,
        name: 'Card',
        type: 'CARD',
        is_default: 0,
      });

      const result = await createPaymentMethod({ name: ' Card ', type: 'CARD' });

      expect(result.name).toBe('Card');
      expect(result.type).toBe('CARD');
      expect(result.isDefault).toBe(false);
      expect(result.isActive).toBe(true);

      const insertCall = adapter.calls.find((c) => c.sql.includes('INSERT INTO payment_method'));
      expect(insertCall).toBeDefined();
      // id, business_id, name, type, is_default, is_active, sort_order, created_at, updated_at
      expect(insertCall!.params[0]).toBe('uuid-test');
      expect(insertCall!.params[1]).toBe('biz-1');
      expect(insertCall!.params[2]).toBe('Card'); // trimmed
      expect(insertCall!.params[3]).toBe('CARD');
      expect(insertCall!.params[4]).toBe(0); // is_default (default false)
      expect(insertCall!.params[5]).toBe(1); // is_active (default true)
      expect(insertCall!.params[6]).toBe(0); // sort_order
      expect(insertCall!.params[7]).toBe(insertCall!.params[8]); // created_at === updated_at
    });

    it('clears the existing default before inserting when isDefault is true', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('is_default', PAYMENT_METHOD_ROW);

      await createPaymentMethod({ name: 'Cash', type: 'CASH', isDefault: true });

      const clearCall = adapter.calls.find((c) => c.sql.includes('is_default = 0'));
      const insertCall = adapter.calls.find((c) => c.sql.includes('INSERT INTO payment_method'));

      expect(clearCall).toBeDefined();
      expect(clearCall!.sql).toContain('UPDATE payment_method');
      expect(clearCall!.params).toContain('biz-1');

      // The clearing UPDATE runs before the INSERT (same transaction).
      const clearIndex = adapter.calls.indexOf(clearCall!);
      const insertIndex = adapter.calls.indexOf(insertCall!);
      expect(clearIndex).toBeLessThan(insertIndex);

      // The new row is promoted to default.
      expect(insertCall!.params[4]).toBe(1);
    });

    it('rejects an invalid type with REPO_INVALID_STATE before touching the DB', async () => {
      const error = await createPaymentMethod({
        name: 'Crypto',
        type: 'CRYPTO' as unknown as PaymentType,
      }).catch((e) => e);

      expect(isRepoError(error, REPO_ERROR.INVALID_STATE)).toBe(true);
      // No DB calls should have been issued for a rejected input.
      expect(adapter.calls).toHaveLength(0);
    });
  });

  describe('updatePaymentMethod', () => {
    it('issues SET params and can flip isActive', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('SELECT id FROM payment_method', { id: 'pm1' }); // existence check
      adapter.queueFirst('is_default', {
        ...PAYMENT_METHOD_ROW,
        name: 'Card',
        type: 'CARD',
        is_default: 0,
        is_active: 0,
      });

      const result = await updatePaymentMethod('pm1', { name: 'Card', isActive: false });

      expect(result.name).toBe('Card');
      expect(result.isActive).toBe(false);

      const updateCall = adapter.calls.find((c) => c.sql.includes('UPDATE payment_method SET'));
      expect(updateCall).toBeDefined();
      expect(updateCall!.sql).toContain('name = ?');
      expect(updateCall!.sql).toContain('is_active = ?');
      expect(updateCall!.sql).toContain('updated_at = ?');
      expect(updateCall!.params).toContain('Card');
      expect(updateCall!.params).toContain(0);
    });

    it('clears the existing default before promoting the target when isDefault is true', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('SELECT id FROM payment_method', { id: 'pm1' });
      adapter.queueFirst('is_default', PAYMENT_METHOD_ROW);

      await updatePaymentMethod('pm1', { isDefault: true });

      const clearCall = adapter.calls.find((c) => c.sql.includes('is_default = 0'));
      const updateCall = adapter.calls.find((c) => c.sql.includes('is_default = ?'));

      expect(clearCall).toBeDefined();
      expect(updateCall).toBeDefined();

      // Clearing runs before the target UPDATE (same transaction).
      const clearIndex = adapter.calls.indexOf(clearCall!);
      const updateIndex = adapter.calls.indexOf(updateCall!);
      expect(clearIndex).toBeLessThan(updateIndex);

      expect(updateCall!.params).toContain(1);
    });

    it('throws REPO_NOT_FOUND when the method is absent', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('SELECT id FROM payment_method', null);

      await expect(updatePaymentMethod('missing', { name: 'X' })).rejects.toThrow(
        REPO_ERROR.NOT_FOUND,
      );
    });
  });
});

describe('ensureDefaultPaymentMethods', () => {
  let adapter: RecordingAdapter;

  beforeEach(() => {
    adapter = new RecordingAdapter();
    (getDb as jest.Mock).mockResolvedValue(makeFakeDb(adapter));
    resetBusinessIdForTesting();
  });

  it('seeds CASH/CARD/TRANSFER (CASH default) when the business has none', async () => {
    adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
    adapter.queueAll('FROM payment_method', []);

    const result = await ensureDefaultPaymentMethods('es');

    expect(result.map((method) => method.type)).toEqual(['CASH', 'CARD', 'TRANSFER']);
    expect(result.map((method) => method.name)).toEqual(['Efectivo', 'Tarjeta', 'Transferencia']);
    expect(result[0].isDefault).toBe(true);
    expect(result[1].isDefault).toBe(false);

    const inserts = adapter.calls.filter((call) =>
      call.sql.includes('INSERT INTO payment_method'),
    );
    expect(inserts).toHaveLength(3);
    // id, business_id, name, type, is_default, sort_order, created_at, updated_at
    expect(inserts[0].params[1]).toBe('biz-1');
    expect(inserts[0].params[2]).toBe('Efectivo');
    expect(inserts[0].params[3]).toBe('CASH');
    expect(inserts[0].params[4]).toBe(1); // is_default
    expect(inserts[1].params[3]).toBe('CARD');
    expect(inserts[1].params[4]).toBe(0);
    expect(inserts[2].params[3]).toBe('TRANSFER');
  });

  it('seeds English names when asked for the en locale', async () => {
    adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
    adapter.queueAll('FROM payment_method', []);

    const result = await ensureDefaultPaymentMethods('en');

    expect(result.map((method) => method.name)).toEqual(['Cash', 'Card', 'Transfer']);
  });

  it('is idempotent: leaves a complete existing set untouched', async () => {
    adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
    adapter.queueAll('FROM payment_method', [
      { ...PAYMENT_METHOD_ROW, id: 'pm-card', name: 'Card', type: 'CARD', is_default: 0, sort_order: 1 },
      { ...PAYMENT_METHOD_ROW, id: 'pm-transfer', name: 'Transfer', type: 'TRANSFER', is_default: 0, sort_order: 2 },
      PAYMENT_METHOD_ROW,
    ]);

    const result = await ensureDefaultPaymentMethods('es');

    expect(result.map((method) => method.type)).toEqual(['CASH', 'CARD', 'TRANSFER']);
    expect(adapter.calls.some((call) => call.sql.includes('INSERT INTO payment_method'))).toBe(false);
  });

  it('self-heals a partial set by inserting only the missing types', async () => {
    adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
    adapter.queueAll('FROM payment_method', [PAYMENT_METHOD_ROW]); // CASH only

    const result = await ensureDefaultPaymentMethods('es');

    const inserts = adapter.calls.filter((call) => call.sql.includes('INSERT INTO payment_method'));
    expect(inserts).toHaveLength(2);
    expect(inserts.map((call) => call.params[3])).toEqual(['CARD', 'TRANSFER']);
    expect(result.map((method) => method.type)).toEqual(['CASH', 'CARD', 'TRANSFER']);
  });

  it('never resurrects an inactive method and filters it from the active list', async () => {
    adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
    adapter.queueAll('FROM payment_method', [
      { ...PAYMENT_METHOD_ROW, is_active: 0 }, // hidden CASH
      { ...PAYMENT_METHOD_ROW, id: 'pm-card', name: 'Card', type: 'CARD', is_default: 0, sort_order: 1 },
      { ...PAYMENT_METHOD_ROW, id: 'pm-transfer', name: 'Transfer', type: 'TRANSFER', is_default: 0, sort_order: 2 },
    ]);

    const result = await ensureDefaultPaymentMethods('es');

    expect(adapter.calls.some((call) => call.sql.includes('INSERT INTO payment_method'))).toBe(false);
    expect(result.map((method) => method.type)).toEqual(['CARD', 'TRANSFER']);
  });
});
