/**
 * @jest-environment node
 *
 * Cash-session repository tests against the scripted RecordingAdapter fake
 * (no native SQLite — see AGENTS §9.4). Covers the open/close money math and the
 * two invariants: refuse a second OPEN session, refuse to close a non-OPEN one.
 */

import { getDb } from '@/db/client';

import {
  closeSession,
  getSessionSummary,
  openSession,
} from '@/cash-session/cash-session-repository';
import { CASH_SESSION_ERROR } from '@/cash-session/cash-session-types';
import { resetBusinessIdForTesting } from '@/db/repositories/business-scope';
import { makeFakeDb } from '@/db/repositories/__tests__/fakes/fake-db';
import { RecordingAdapter } from '@/db/repositories/__tests__/fakes/recording-adapter';

jest.mock('@/db/client', () => ({ getDb: jest.fn() }));
jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => 'uuid-test'),
  getRandomBytesAsync: jest.fn(async () => new Uint8Array(16)),
}));

const OPEN_SESSION_ROW = {
  id: 'session-1',
  business_id: 'biz-1',
  status: 'OPEN',
  opening_amount_minor: 50000,
  counted_amount_minor: null,
  expected_amount_minor: null,
  difference_minor: null,
  opened_by_employee_id: 'emp-1',
  closed_by_employee_id: null,
  opened_at: '2026-09-22T10:00:00.000Z',
  closed_at: null,
  opening_notes: null,
  closing_notes: null,
};

describe('cash-session repository', () => {
  let adapter: RecordingAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new RecordingAdapter();
    (getDb as jest.Mock).mockResolvedValue(makeFakeDb(adapter));
    resetBusinessIdForTesting();
  });

  describe('openSession', () => {
    it('opens a session and returns the mapped row', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst("status = 'OPEN'", null);
      adapter.queueFirst('WHERE id = ?', OPEN_SESSION_ROW);

      const result = await openSession({ openingAmountMinor: 50000, employeeId: 'emp-1' });

      expect(result.id).toBe('session-1');
      expect(result.status).toBe('OPEN');
      expect(result.openingAmountMinor).toBe(50000);

      const insert = adapter.calls.find((call) => call.sql.includes('INSERT INTO cash_session'));
      expect(insert).toBeDefined();
      expect(insert?.params).toContain(50000);
      expect(insert?.params).toContain('emp-1');
    });

    it('refuses a second session while one is OPEN', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst("status = 'OPEN'", { id: 'session-existing' });

      await expect(
        openSession({ openingAmountMinor: 1000 }),
      ).rejects.toThrow(CASH_SESSION_ERROR.ALREADY_OPEN);

      expect(adapter.calls.some((call) => call.sql.includes('INSERT INTO cash_session'))).toBe(false);
    });
  });

  describe('closeSession', () => {
    it('computes expected and difference from opening + cash sales', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      // Load the OPEN session.
      adapter.queueFirst('AND business_id = ?', OPEN_SESSION_ROW);
      // Cash payments tagged to the session: 25000 minor.
      adapter.queueFirst("pm.type = 'CASH'", { cash_total: 25000 });
      // Select-back after the UPDATE.
      adapter.queueFirst('WHERE id = ? LIMIT 1', {
        ...OPEN_SESSION_ROW,
        status: 'CLOSED',
        counted_amount_minor: 80000,
        expected_amount_minor: 75000,
        difference_minor: 5000,
        closed_by_employee_id: 'emp-2',
        closed_at: '2026-09-22T22:00:00.000Z',
        closing_notes: 'short by coins',
      });

      const result = await closeSession({
        sessionId: 'session-1',
        countedAmountMinor: 80000,
        employeeId: 'emp-2',
        notes: 'short by coins',
      });

      expect(result.status).toBe('CLOSED');
      expect(result.expectedAmountMinor).toBe(75000); // 50000 opening + 25000 cash
      expect(result.differenceMinor).toBe(5000); // 80000 - 75000

      const update = adapter.calls.find((call) => call.sql.includes('UPDATE cash_session'));
      expect(update).toBeDefined();
      expect(update?.params).toContain(80000); // counted
      expect(update?.params).toContain(75000); // expected
      expect(update?.params).toContain(5000); // difference
      expect(update?.params).toContain('emp-2');
    });

    it('treats a missing session as NOT_FOUND', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('AND business_id = ?', null);

      await expect(
        closeSession({ sessionId: 'nope', countedAmountMinor: 0 }),
      ).rejects.toThrow('REPO_NOT_FOUND');
    });

    it('refuses to close a session that is not OPEN', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('AND business_id = ?', { ...OPEN_SESSION_ROW, status: 'CLOSED' });

      await expect(
        closeSession({ sessionId: 'session-1', countedAmountMinor: 0 }),
      ).rejects.toThrow(CASH_SESSION_ERROR.NOT_OPEN);
    });
  });

  describe('getSessionSummary', () => {
    it('returns the sales breakdown by payment method', async () => {
      adapter.queueFirst('SELECT id FROM business', { id: 'biz-1' });
      adapter.queueFirst('COUNT(DISTINCT p.sale_id)', {
        cash_total: 30000,
        card_total: 15000,
        transfer_total: 5000,
        sale_count: 4,
      });

      const summary = await getSessionSummary('session-1');

      expect(summary).toEqual({
        cashSalesMinor: 30000,
        cardSalesMinor: 15000,
        transferSalesMinor: 5000,
        saleCount: 4,
      });
    });
  });
});
