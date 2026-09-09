import type { Migration } from '@/db/types';

/**
 * Migration 002 — employee auth (RBAC users/roles, deferred from v1 in 001).
 *
 * Design decisions (see AGENTS.md §3.1 employees, §9.2 domain model, and the
 * auth architecture notes):
 *
 * - The `employee` table is the single people + credentials table: light-touch
 *   staff records (attribution: who made the sale) extended with login
 *   identity. An owner/admin is a regular employee row with role ADMIN; staff
 *   added later get role EMPLOYEE. This keeps sale/employee attribution and
 *   auth in one place — no separate `user` table.
 * - Roles are scoped to what exists today: ADMIN (business owner — full
 *   access, created during first-run onboarding) and EMPLOYEE (staff). Two
 *   roles, deliberately not more (AGENTS §3.1 / product note).
 * - Credential strategy matches the chosen product flow:
 *   - ADMIN signs in with username + password (strong credential for the
 *     account that controls settings + export).
 *   - EMPLOYEE signs in with username + PIN (fast counter login/switching).
 *   `password_hash` / `pin_hash` are mutually exclusive at the app layer
 *   (repository enforces: ADMIN → password, EMPLOYEE → PIN). Hashes are
 *   salted PBKDF2-HMAC-SHA256 strings (see src/lib/hash.ts) stored in the
 *   canonical `pbkdf2-sha256$iterations$salt$dk` TEXT format.
 * - Existing employee rows (pre-auth) keep working: `role` defaults to
 *   EMPLOYEE and the hash columns stay NULL until credentials are assigned —
 *   NULL here means "no login yet", never "empty credential".
 * - `username` is nullable for the same reason (legacy attribution-only rows),
 *   but any row that can log in has one. Uniqueness is per business and
 *   scoped to non-archived rows (partial unique index), mirroring the
 *   name/SKU/barcode conventions from 001.
 * - `last_login_at` tracks the most recent successful sign-in (audit +
 *   "auto-login last user" session restore). Session itself is NOT a DB row:
 *   it is a persisted current-employee id in the app kv-store, validated
 *   against this table on boot.
 */
export const migration002Auth: Migration = {
  version: 2,
  name: '002-auth',
  up: [
    `ALTER TABLE employee ADD COLUMN role TEXT NOT NULL DEFAULT 'EMPLOYEE'
       CHECK (role IN ('ADMIN', 'EMPLOYEE'));`,

    `ALTER TABLE employee ADD COLUMN username TEXT;`,

    // Canonical salted PBKDF2-HMAC-SHA256 strings; mutually exclusive with
    // pin_hash per role (repository-enforced). NULL until credentials exist.
    `ALTER TABLE employee ADD COLUMN password_hash TEXT;`,
    `ALTER TABLE employee ADD COLUMN pin_hash TEXT;`,

    `ALTER TABLE employee ADD COLUMN last_login_at TEXT;`,

    // One active login identity per business. Archived/never-login rows are
    // excluded so usernames can be reused after archiving.
    `CREATE UNIQUE INDEX uq_employee_username
       ON employee(business_id, username)
      WHERE archived_at IS NULL AND username IS NOT NULL;`,

    // Team list + session-restore lookups scan by business and role.
    `CREATE INDEX idx_employee_role
       ON employee(business_id, role)
      WHERE archived_at IS NULL;`,
  ],
};
