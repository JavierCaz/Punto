import type { Migration } from '@/db/types';

/**
 * Migration 004 — manager authorization for employee-initiated refunds.
 *
 * Product decision: an EMPLOYEE may initiate a refund, but a manager must
 * authorize it by entering their authorization PIN. The authorization PIN is a
 * SEPARATE credential from the admin's login password (migration 002):
 *
 * - `employee.authorization_pin_hash` — nullable, ADMIN-only at the repository
 *   layer. NULL means "not configured" (distinct from "wrong PIN"). It never
 *   participates in sign-in, so the login credential invariant from 002
 *   (ADMIN → password, EMPLOYEE → PIN) is untouched.
 * - `sale.refund_authorized_by` — nullable audit pointer to the admin who
 *   authorized an employee-initiated refund. The sale's `employee_id` remains
 *   the original seller, and the RETURN inventory movements keep recording the
 *   performer, so both who-sold and who-authorized stay traceable.
 *
 * `ON DELETE SET NULL` (plus soft-delete archiving) means the audit pointer is
 * cleared only if the admin row is ever hard-deleted, never on archive.
 */
export const migration004ManagerRefundAuth: Migration = {
  version: 4,
  name: '004-manager-refund-auth',
  up: [
    `ALTER TABLE employee ADD COLUMN authorization_pin_hash TEXT;`,

    // SQLite allows ADD COLUMN with REFERENCES only when the default is NULL.
    `ALTER TABLE sale ADD COLUMN refund_authorized_by TEXT
       REFERENCES employee(id) ON DELETE SET NULL;`,
  ],
};
