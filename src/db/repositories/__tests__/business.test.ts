/**
 * @jest-environment node
 *
 * Business profile repository tests — driven by the scripted `RecordingAdapter`
 * fake (no native SQLite). These pin the exact SQL shape, parameter order, the
 * 0/1 → boolean mapper, nullable column handling, and the CHECK-constrained
 * `locale` / `accent_color` validation the repository relies on.
 */

import { getDb } from '@/db';
import {
  getBusinessProfile,
  updateBusinessProfile,
} from '@/db/repositories/business';
import type { AccentColor, LocaleCode } from '@/db/repositories/business';
import { resetBusinessIdForTesting } from '@/db/repositories/business-scope';
import { REPO_ERROR, isRepoError } from '@/db/repositories/errors';
import { makeFakeDb } from '@/db/repositories/__tests__/fakes/fake-db';
import { RecordingAdapter } from '@/db/repositories/__tests__/fakes/recording-adapter';

jest.mock('@/db', () => ({ getDb: jest.fn() }));

// A full, live business row as SQLite would surface it (snake_case).
const businessRow = {
  id: 'biz-1',
  name: 'Café Punto',
  legal_name: 'Café Punto S.A.',
  description: 'A coffee shop',
  logo_uri: 'file:///logo.png',
  phone: '555-0100',
  email: 'hola@punto.app',
  address_line1: 'Calle 1',
  city: 'CDMX',
  state: 'CDMX',
  postal_code: '01000',
  country_code: 'MX',
  currency_code: 'MXN',
  locale: 'es',
  accent_color: 'emerald',
  tax_enabled: 1,
  default_tax_rate_bp: 1600,
  inventory_enabled: 1,
  allow_negative_inventory: 0,
  low_stock_alerts_enabled: 1,
  receipt_enabled: 1,
  is_active: 1,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

describe('business repository', () => {
  let adapter: RecordingAdapter;

  beforeEach(() => {
    adapter = new RecordingAdapter();
    (getDb as jest.Mock).mockResolvedValue(makeFakeDb(adapter));
    resetBusinessIdForTesting();
  });

  describe('getBusinessProfile', () => {
    it('maps integer flags to booleans and preserves nulls', async () => {
      adapter.queueFirst('FROM business', {
        ...businessRow,
        legal_name: null,
        description: null,
        logo_uri: null,
        phone: null,
        tax_enabled: 0,
        inventory_enabled: 0,
        allow_negative_inventory: 1,
        low_stock_alerts_enabled: 0,
        receipt_enabled: 0,
        is_active: 0,
      });

      const profile = await getBusinessProfile();

      expect(profile).not.toBeNull();
      expect(profile!.taxEnabled).toBe(false);
      expect(profile!.inventoryEnabled).toBe(false);
      expect(profile!.allowNegativeInventory).toBe(true);
      expect(profile!.lowStockAlertsEnabled).toBe(false);
      expect(profile!.receiptEnabled).toBe(false);
      expect(profile!.isActive).toBe(false);
      expect(profile!.legalName).toBeNull();
      expect(profile!.description).toBeNull();
      expect(profile!.logoUri).toBeNull();
      expect(profile!.phone).toBeNull();
      expect(profile!.locale).toBe('es');
      expect(profile!.accentColor).toBe('emerald');
      expect(profile!.defaultTaxRateBp).toBe(1600);
      expect(profile!.currencyCode).toBe('MXN');
    });

    it('maps 1 flags to true and preserves non-null values', async () => {
      adapter.queueFirst('FROM business', businessRow);

      const profile = await getBusinessProfile();

      expect(profile!.taxEnabled).toBe(true);
      expect(profile!.inventoryEnabled).toBe(true);
      expect(profile!.allowNegativeInventory).toBe(false);
      expect(profile!.lowStockAlertsEnabled).toBe(true);
      expect(profile!.receiptEnabled).toBe(true);
      expect(profile!.isActive).toBe(true);
      expect(profile!.legalName).toBe('Café Punto S.A.');
      expect(profile!.name).toBe('Café Punto');
    });

    it('returns null when no business row exists yet', async () => {
      adapter.queueFirst('FROM business', null);

      const profile = await getBusinessProfile();

      expect(profile).toBeNull();
    });

    it('throws REPO_INVALID_STATE on an unexpected locale', async () => {
      adapter.queueFirst('FROM business', { ...businessRow, locale: 'fr' });

      const error = await getBusinessProfile().catch((e: unknown) => e);
      expect(isRepoError(error, REPO_ERROR.INVALID_STATE)).toBe(true);
    });

    it('throws REPO_INVALID_STATE on an unexpected accent_color', async () => {
      adapter.queueFirst('FROM business', { ...businessRow, accent_color: 'neon' });

      const error = await getBusinessProfile().catch((e: unknown) => e);
      expect(isRepoError(error, REPO_ERROR.INVALID_STATE)).toBe(true);
    });
  });

  describe('updateBusinessProfile', () => {
    it('builds SET from the patch and bumps updated_at', async () => {
      adapter.queueFirst('FROM business', { ...businessRow, name: 'Nuevo Punto', tax_enabled: 0 });

      const result = await updateBusinessProfile({
        name: '  Nuevo Punto  ',
        taxEnabled: false,
      });

      const updateCall = adapter.calls.find((c) => c.sql.includes('UPDATE business'));
      expect(updateCall).toBeDefined();
      expect(updateCall!.sql).toContain('name = ?');
      expect(updateCall!.sql).toContain('tax_enabled = ?');
      expect(updateCall!.sql).toContain('updated_at = ?');
      expect(updateCall!.sql).not.toContain('accent_color = ?');

      // params: [name, tax_enabled, updated_at]
      const params = updateCall!.params;
      expect(params[0]).toBe('Nuevo Punto'); // trimmed
      expect(params[1]).toBe(0); // taxEnabled false → 0
      expect(typeof params[params.length - 1]).toBe('string'); // updated_at

      expect(result.name).toBe('Nuevo Punto');
      expect(result.taxEnabled).toBe(false);
    });

    it('binds NULL when a nullable field is explicitly cleared', async () => {
      adapter.queueFirst('FROM business', { ...businessRow, description: null });

      await updateBusinessProfile({ description: null });

      const updateCall = adapter.calls.find((c) => c.sql.includes('UPDATE business'));
      expect(updateCall).toBeDefined();
      expect(updateCall!.sql).toContain('description = ?');
      expect(updateCall!.params[0]).toBeNull();
    });

    it('throws REPO_NOT_FOUND when no business row exists', async () => {
      adapter.queueFirst('FROM business', null);

      const error = await updateBusinessProfile({ name: 'X' }).catch((e: unknown) => e);
      expect(isRepoError(error, REPO_ERROR.NOT_FOUND)).toBe(true);
    });

    it('throws REPO_INVALID_STATE on an invalid locale with no UPDATE', async () => {
      const error = await updateBusinessProfile({ locale: 'fr' as unknown as LocaleCode }).catch(
        (e: unknown) => e,
      );
      expect(isRepoError(error, REPO_ERROR.INVALID_STATE)).toBe(true);
      expect(adapter.calls.some((c) => c.sql.includes('UPDATE business'))).toBe(false);
    });

    it('throws REPO_INVALID_STATE on an invalid accentColor with no UPDATE', async () => {
      const error = await updateBusinessProfile({ accentColor: 'neon' as unknown as AccentColor }).catch(
        (e: unknown) => e,
      );
      expect(isRepoError(error, REPO_ERROR.INVALID_STATE)).toBe(true);
      expect(adapter.calls.some((c) => c.sql.includes('UPDATE business'))).toBe(false);
    });
  });
});
