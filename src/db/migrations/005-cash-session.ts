import type { Migration } from '@/db/types';

/**
 * Migration 005 — cash session (apertura/cierre de caja).
 *
 * A `cash_session` records the cash float an employee places in the register at
 * the start of a shift and reconciles at close. It is structurally isolated from
 * `sale`, `payment`-as-revenue and `financial_transaction`: no revenue/profit/
 * earnings query ever reads this table, so the opening float can never leak into
 * the numbers an owner sees on the dashboard (see AGENTS §3.1 and the feature
 * plan guardrail).
 *
 * Design decisions:
 * - `status` is `OPEN` or `CLOSED`. Only one session may be OPEN per business at
 *   a time (single-register v1) — the repository enforces this, and the
 *   `idx_cash_session_business_status` index makes the "is there an open session"
 *   lookup cheap.
 * - Money is INTEGER minor units (cents). `opening_amount_minor` is required;
 *   `counted_amount_minor` (what's physically in the drawer) and the derived
 *   `expected_amount_minor` / `difference_minor` are NULL until close, when the
 *   repository computes `expected = opening + Σ cash payments` and
 *   `difference = counted − expected` inside the close transaction.
 * - `opened_by_employee_id` / `closed_by_employee_id` are attribution-only
 *   pointers (`ON DELETE SET NULL`). A session is BUSINESS-scoped, not
 *   employee-scoped: any active employee can close a session opened by someone
 *   else (light-touch team model).
 * - `opened_at` / `closed_at` are ISO-8601 UTC TEXT; `opening_notes` is the
 *   optional note captured at open, `closing_notes` the optional note captured at
 *   close (often used to explain a shortage).
 * - `payment.cash_session_id` tags every payment made while a session is open
 *   (all methods, not just cash), so the shift's sales-by-method summary and the
 *   expected-drawer amount are computable without joining back through `sale`.
 *   It is NULL when no session was open at checkout.
 */
export const migration005CashSession: Migration = {
  version: 5,
  name: '005-cash-session',
  up: [
    `CREATE TABLE cash_session (
      id                     TEXT PRIMARY KEY,
      business_id            TEXT NOT NULL,
      status                 TEXT NOT NULL DEFAULT 'OPEN'
                             CHECK (status IN ('OPEN', 'CLOSED')),
      opening_amount_minor   INTEGER NOT NULL DEFAULT 0 CHECK (opening_amount_minor >= 0),
      counted_amount_minor   INTEGER CHECK (counted_amount_minor >= 0),
      expected_amount_minor  INTEGER CHECK (expected_amount_minor >= 0),
      difference_minor       INTEGER,
      opened_by_employee_id  TEXT,
      closed_by_employee_id  TEXT,
      opened_at              TEXT NOT NULL,
      closed_at              TEXT,
      opening_notes          TEXT,
      closing_notes          TEXT,
      FOREIGN KEY (business_id) REFERENCES business(id) ON DELETE CASCADE,
      FOREIGN KEY (opened_by_employee_id) REFERENCES employee(id) ON DELETE SET NULL,
      FOREIGN KEY (closed_by_employee_id) REFERENCES employee(id) ON DELETE SET NULL
    );`,

    // SQLite allows ADD COLUMN with REFERENCES only when the default is NULL.
    `ALTER TABLE payment ADD COLUMN cash_session_id TEXT
       REFERENCES cash_session(id) ON DELETE SET NULL;`,

    // Fast "is there an open session for this business" lookup.
    `CREATE INDEX idx_cash_session_business_status
       ON cash_session(business_id, status);`,
  ],
};
