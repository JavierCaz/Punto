import {
  getDb,
  getBusinessId,
  int,
  intOrNull,
  mapSqliteError,
  newId,
  nowIso,
  REPO_ERROR,
  repoError,
  str,
  strOrNull,
  withTransaction,
  type DatabaseAdapter,
} from '@/db';

import {
  CASH_SESSION_ERROR,
  isCashSessionStatus,
  type CashSession,
  type CloseSessionInput,
  type OpenSessionInput,
  type SessionSummary,
} from '@/cash-session/cash-session-types';

/**
 * Cash session data access — apertura/cierre de caja (migration 005).
 *
 * Structural isolation (feature plan guardrail): these queries ONLY touch
 * `cash_session` and the `payment.cash_session_id` tag. No revenue, profit or
 * dashboard-earnings query ever joins or reads this table, so an opening float
 * can never inflate the numbers an owner sees.
 *
 * Invariants enforced here:
 * - `openSession` refuses to open a second session while one is OPEN for the
 *   business (single-register v1) — `CASH_SESSION_ALREADY_OPEN`.
 * - `closeSession` computes `expected = opening + Σ cash payments` and
 *   `difference = counted − expected` inside the close transaction, and refuses
 *   to close a session that is not OPEN — `CASH_SESSION_NOT_OPEN`.
 */

// ---------------------------------------------------------------------------
// Row shape + mapper
// ---------------------------------------------------------------------------


const CASH_SESSION_COLUMNS = `
  id, business_id, status, opening_amount_minor, counted_amount_minor,
  expected_amount_minor, difference_minor, opened_by_employee_id,
  closed_by_employee_id, opened_at, closed_at, opening_notes, closing_notes`;

function mapRow(row: Record<string, unknown>): CashSession {
  const status = row.status;
  if (!isCashSessionStatus(status)) {
    throw repoError(
      REPO_ERROR.INVALID_STATE,
      `unexpected cash_session status in DB: ${String(status)}`,
    );
  }
  return {
    id: str(row.id),
    businessId: str(row.business_id),
    status,
    openingAmountMinor: int(row.opening_amount_minor),
    countedAmountMinor: intOrNull(row.counted_amount_minor),
    expectedAmountMinor: intOrNull(row.expected_amount_minor),
    differenceMinor: intOrNull(row.difference_minor),
    openedByEmployeeId: strOrNull(row.opened_by_employee_id),
    closedByEmployeeId: strOrNull(row.closed_by_employee_id),
    openedAt: str(row.opened_at),
    closedAt: strOrNull(row.closed_at),
    openingNotes: strOrNull(row.opening_notes),
    closingNotes: strOrNull(row.closing_notes),
  };
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/** The OPEN session for the business, or null when none is open. */
export async function getActiveSession(): Promise<CashSession | null> {
  const db = await getDb();
  const businessId = await getBusinessId();
  const row = await db.getFirstAsync<Record<string, unknown>>(
    `SELECT ${CASH_SESSION_COLUMNS} FROM cash_session
      WHERE business_id = ? AND status = 'OPEN'
      ORDER BY opened_at DESC, id DESC
      LIMIT 1`,
    businessId,
  );
  return row ? mapRow(row) : null;
}

/** A single session by id, or null when missing (business-scoped). */
export async function getSessionById(id: string): Promise<CashSession | null> {
  const db = await getDb();
  const businessId = await getBusinessId();
  const row = await db.getFirstAsync<Record<string, unknown>>(
    `SELECT ${CASH_SESSION_COLUMNS} FROM cash_session
      WHERE id = ? AND business_id = ?
      LIMIT 1`,
    id,
    businessId,
  );
  return row ? mapRow(row) : null;
}

/** All sessions for the business, most recently opened first. */
export async function listSessions(): Promise<CashSession[]> {
  const db = await getDb();
  const businessId = await getBusinessId();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT ${CASH_SESSION_COLUMNS} FROM cash_session
      WHERE business_id = ?
      ORDER BY opened_at DESC, id DESC`,
    businessId,
  );
  return rows.map(mapRow);
}

/**
 * True when the business has ever used cash sessions. The "never used" signal
 * lets the POS stay fully silent for a business that ignores the feature
 * (feature plan Phase B: no nag, no banner until a session has been opened).
 */
export async function hasAnySession(): Promise<boolean> {
  const db = await getDb();
  const businessId = await getBusinessId();
  const row = await db.getFirstAsync<{ id: string }>(
    `SELECT id FROM cash_session WHERE business_id = ? LIMIT 1`,
    businessId,
  );
  return row != null;
}

/** Sales-by-payment-method breakdown for a session (drives close + detail). */
export async function getSessionSummary(sessionId: string): Promise<SessionSummary> {
  const db = await getDb();
  const businessId = await getBusinessId();
  const row = await db.getFirstAsync<Record<string, unknown>>(
    `SELECT
       COALESCE(SUM(CASE WHEN pm.type = 'CASH' THEN p.amount_minor ELSE 0 END), 0) AS cash_total,
       COALESCE(SUM(CASE WHEN pm.type = 'CARD' THEN p.amount_minor ELSE 0 END), 0) AS card_total,
       COALESCE(SUM(CASE WHEN pm.type = 'TRANSFER' THEN p.amount_minor ELSE 0 END), 0) AS transfer_total,
       COUNT(DISTINCT p.sale_id) AS sale_count
     FROM payment p
     JOIN payment_method pm ON pm.id = p.payment_method_id
     WHERE p.cash_session_id = ? AND p.business_id = ?`,
    sessionId,
    businessId,
  );
  return {
    cashSalesMinor: int(row?.cash_total),
    cardSalesMinor: int(row?.card_total),
    transferSalesMinor: int(row?.transfer_total),
    saleCount: int(row?.sale_count),
  };
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

/** Open a session for the business, refusing a second concurrent OPEN session. */
export async function openSession(input: OpenSessionInput): Promise<CashSession> {
  const businessId = await getBusinessId();
  return withTransaction((txn) => openSessionWithTxn(txn, businessId, input));
}

async function openSessionWithTxn(
  txn: DatabaseAdapter,
  businessId: string,
  input: OpenSessionInput,
): Promise<CashSession> {
  const active = await txn.getFirstAsync<{ id: string }>(
    `SELECT id FROM cash_session
      WHERE business_id = ? AND status = 'OPEN'
      LIMIT 1`,
    businessId,
  );
  if (active) {
    throw new Error(CASH_SESSION_ERROR.ALREADY_OPEN);
  }

  const id = newId();
  const timestamp = nowIso();
  try {
    await txn.runAsync(
      `INSERT INTO cash_session
         (id, business_id, status, opening_amount_minor, opened_by_employee_id,
          opened_at, opening_notes)
       VALUES (?, ?, 'OPEN', ?, ?, ?, ?)`,
      id,
      businessId,
      input.openingAmountMinor,
      input.employeeId ?? null,
      timestamp,
      input.notes ?? null,
    );
  } catch (error) {
    throw mapSqliteError(error);
  }

  const row = await txn.getFirstAsync<Record<string, unknown>>(
    `SELECT ${CASH_SESSION_COLUMNS} FROM cash_session WHERE id = ? LIMIT 1`,
    id,
  );
  if (!row) {
    throw repoError(REPO_ERROR.NOT_FOUND, `cash session not found after open: ${id}`);
  }
  return mapRow(row);
}

/** Close an OPEN session, computing expected/difference inside the transaction. */
export async function closeSession(input: CloseSessionInput): Promise<CashSession> {
  const businessId = await getBusinessId();
  return withTransaction((txn) => closeSessionWithTxn(txn, businessId, input));
}

async function closeSessionWithTxn(
  txn: DatabaseAdapter,
  businessId: string,
  input: CloseSessionInput,
): Promise<CashSession> {
  const row = await txn.getFirstAsync<Record<string, unknown>>(
    `SELECT ${CASH_SESSION_COLUMNS} FROM cash_session
      WHERE id = ? AND business_id = ?
      LIMIT 1`,
    input.sessionId,
    businessId,
  );
  if (!row) {
    throw repoError(REPO_ERROR.NOT_FOUND, `cash session not found: ${input.sessionId}`);
  }
  const session = mapRow(row);
  if (session.status !== 'OPEN') {
    throw new Error(CASH_SESSION_ERROR.NOT_OPEN);
  }

  // expected = opening float + Σ cash payments tagged to this session.
  const cashRow = await txn.getFirstAsync<{ cash_total: number }>(
    `SELECT COALESCE(SUM(p.amount_minor), 0) AS cash_total
       FROM payment p
       JOIN payment_method pm ON pm.id = p.payment_method_id
      WHERE p.cash_session_id = ? AND p.business_id = ? AND pm.type = 'CASH'`,
    input.sessionId,
    businessId,
  );
  const cashSalesMinor = int(cashRow?.cash_total);
  const expectedAmountMinor = session.openingAmountMinor + cashSalesMinor;
  const differenceMinor = input.countedAmountMinor - expectedAmountMinor;

  const timestamp = nowIso();
  try {
    await txn.runAsync(
      `UPDATE cash_session
          SET status = 'CLOSED',
              counted_amount_minor = ?,
              expected_amount_minor = ?,
              difference_minor = ?,
              closed_by_employee_id = ?,
              closed_at = ?,
              closing_notes = ?
        WHERE id = ? AND business_id = ?`,
      input.countedAmountMinor,
      expectedAmountMinor,
      differenceMinor,
      input.employeeId ?? null,
      timestamp,
      input.notes ?? null,
      input.sessionId,
      businessId,
    );
  } catch (error) {
    throw mapSqliteError(error);
  }

  const updated = await txn.getFirstAsync<Record<string, unknown>>(
    `SELECT ${CASH_SESSION_COLUMNS} FROM cash_session WHERE id = ? LIMIT 1`,
    input.sessionId,
  );
  if (!updated) {
    throw repoError(REPO_ERROR.NOT_FOUND, `cash session not found after close: ${input.sessionId}`);
  }
  return mapRow(updated);
}
