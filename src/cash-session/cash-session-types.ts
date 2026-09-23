/**
 * Cash session domain vocabulary (apertura/cierre de caja).
 *
 * This module is deliberately isolated from the revenue domains (`sale`,
 * `payment`-as-revenue, `financial_transaction`) so a cash float can never leak
 * into profit/earnings calculations (feature plan guardrail). Types here mirror
 * the `cash_session` table (migration 005) and the repository's public surface.
 */

export const CASH_SESSION_STATUSES = ['OPEN', 'CLOSED'] as const;
export type CashSessionStatus = (typeof CASH_SESSION_STATUSES)[number];

/** True when `value` is a valid `cash_session.status` CHECK value. */
export function isCashSessionStatus(value: unknown): value is CashSessionStatus {
  return (
    typeof value === 'string' &&
    (CASH_SESSION_STATUSES as readonly string[]).includes(value)
  );
}

/** A cash session row, camelCased (money in INTEGER minor units). */
export interface CashSession {
  id: string;
  businessId: string;
  status: CashSessionStatus;
  /** Opening float, minor units (>= 0). */
  openingAmountMinor: number;
  /** What was physically counted at close; null while OPEN. */
  countedAmountMinor: number | null;
  /** opening + Σ cash payments in the session; null while OPEN. */
  expectedAmountMinor: number | null;
  /** counted − expected; null while OPEN. */
  differenceMinor: number | null;
  openedByEmployeeId: string | null;
  closedByEmployeeId: string | null;
  openedAt: string;
  closedAt: string | null;
  openingNotes: string | null;
  closingNotes: string | null;
}

/** Input required to open a session. */
export interface OpenSessionInput {
  openingAmountMinor: number;
  employeeId?: string | null;
  notes?: string | null;
}

/** Input required to close a session. */
export interface CloseSessionInput {
  sessionId: string;
  countedAmountMinor: number;
  employeeId?: string | null;
  notes?: string | null;
}

/** Sales-by-payment-method breakdown for a session (minor units). */
export interface SessionSummary {
  cashSalesMinor: number;
  cardSalesMinor: number;
  transferSalesMinor: number;
  saleCount: number;
}

/** Repository invariants surfaced as string-coded errors (mirrors auth). */
export const CASH_SESSION_ERROR = {
  /** Refuse to open a second session while one is already OPEN. */
  ALREADY_OPEN: 'CASH_SESSION_ALREADY_OPEN',
  /** Refuse to close a session that is not OPEN (defensive). */
  NOT_OPEN: 'CASH_SESSION_NOT_OPEN',
} as const;
