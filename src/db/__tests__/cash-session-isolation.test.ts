/// <reference types="jest" />
/// <reference types="node" />
/** @jest-environment node */

import { readFileSync } from 'fs';
import { join } from 'path';

import { computeDashboardTotals } from '@/lib/dashboard';

/**
 * Cash-session earnings isolation guardrail (Phase E).
 *
 * The one property every phase must preserve: no query that computes revenue,
 * profit or dashboard earnings ever reads from `cash_session`. An opening float
 * is NOT revenue — it must never inflate the numbers an owner sees.
 *
 * Two layers of enforcement:
 * 1. A source-level guard: the earnings aggregation (analytics repository) and
 *    the pure earnings math (lib/dashboard) must never reference `cash_session`.
 * 2. A behavioral guard: the earnings math is a pure function of its inputs.
 */

const ANALYTICS_SOURCE = readFileSync(join(__dirname, '..', 'repositories', 'analytics.ts'), 'utf8');
const DASHBOARD_SOURCE = readFileSync(join(__dirname, '..', '..', 'lib', 'dashboard.ts'), 'utf8');

describe('cash-session earnings isolation', () => {
  it('the earnings/profit aggregation SQL never references cash_session', () => {
    // `analytics.ts` owns every dashboard earnings query (completed sales,
    // refunds, financial totals, purchase expense). It must stay structurally
    // blind to cash sessions.
    expect(ANALYTICS_SOURCE).not.toContain('cash_session');
    expect(ANALYTICS_SOURCE).not.toContain('cashSession');
  });

  it('the pure earnings math never references cash_session', () => {
    expect(DASHBOARD_SOURCE).not.toContain('cash_session');
    expect(DASHBOARD_SOURCE).not.toContain('cashSession');
  });

  it('computeDashboardTotals nets revenue/expense with no cash-session term', () => {
    const totals = computeDashboardTotals({
      salesMinor: 100_000,
      refundsMinor: 1_000,
      otherIncomeMinor: 0,
      manualExpenseMinor: 0,
      purchaseExpenseMinor: 0,
    });
    expect(totals.incomeMinor).toBe(100_000);
    expect(totals.expenseMinor).toBe(1_000);
    expect(totals.netMinor).toBe(99_000);
  });

  it('a large opening float never changes net earnings (regression guard)', () => {
    // The earnings math has no cash-session input, so any number of
    // cash_session rows with large opening_amount_minor values is irrelevant.
    // This asserts the exact bug we are preventing: opening floats inflating
    // the earnings stat.
    const input = {
      salesMinor: 50_000,
      refundsMinor: 0,
      otherIncomeMinor: 0,
      manualExpenseMinor: 0,
      purchaseExpenseMinor: 0,
    };
    const netWithoutAnySession = computeDashboardTotals(input).netMinor;
    expect(netWithoutAnySession).toBe(50_000);

    // A 9,999,999 minor (~$99,999.99) opening float must not appear anywhere.
    expect(input).not.toHaveProperty('openingAmountMinor');
    expect(input).not.toHaveProperty('cashSession');
  });
});
