import { getDb } from '@/db/client';
import type { DatabaseAdapter } from '@/db/repositories/database';
import { withTransaction } from '@/db/repositories/transaction';

/**
 * App metadata + monotonic document counters (`app_metadata` table).
 *
 * `app_metadata` is a plain key/value table (migration 001) with no business
 * column — the database holds a single business. It backs human-readable
 * document numbers (`sale_number`, `purchase_number`) which are UNIQUE per
 * business in their own tables.
 *
 * The counter functions take an explicit `txn` and MUST be called from inside
 * the same transaction that inserts the document. Reading the current value and
 * writing the next one is then atomic with the document write, and the
 * `UNIQUE (business_id, *_number)` index on the parent table is the backstop if
 * two callers ever raced outside a transaction.
 */

const SALE_SEQUENCE_KEY = 'sale_number_seq';
const PURCHASE_SEQUENCE_KEY = 'purchase_number_seq';

/** Read a raw metadata value, or `null` when the key has never been written. */
export async function getMetadata(
  txn: DatabaseAdapter,
  key: string,
): Promise<string | null> {
  const row = await txn.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_metadata WHERE key = ?',
    key,
  );
  return row?.value ?? null;
}

/** Upsert a raw metadata value. */
export async function setMetadata(
  txn: DatabaseAdapter,
  key: string,
  value: string,
): Promise<void> {
  await txn.runAsync(
    `INSERT INTO app_metadata (key, value) VALUES (?, ?)
     ON CONFLICT (key) DO UPDATE SET value = excluded.value`,
    key,
    value,
  );
}

/**
 * Reserve and return the next document number for `key`, formatted as
 * `${prefix}-${6-digit zero-padded sequence}` (e.g. `S-000123`).
 *
 * Callers pass the active transaction so the counter bump commits with the
 * document insert.
 */
async function nextDocumentNumber(
  txn: DatabaseAdapter,
  key: string,
  prefix: string,
): Promise<string> {
  const current = await getMetadata(txn, key);
  const parsed = current == null ? 0 : Number(current);
  const next = (Number.isFinite(parsed) && parsed >= 0 ? parsed : 0) + 1;
  await setMetadata(txn, key, String(next));
  return `${prefix}-${String(next).padStart(6, '0')}`;
}

/** Next sale number, e.g. `S-000001`. Call inside the sale-completion txn. */
export function nextSaleNumber(txn: DatabaseAdapter): Promise<string> {
  return nextDocumentNumber(txn, SALE_SEQUENCE_KEY, 'S');
}

/** Next purchase number, e.g. `P-000001`. Call inside the purchase txn. */
export function nextPurchaseNumber(txn: DatabaseAdapter): Promise<string> {
  return nextDocumentNumber(txn, PURCHASE_SEQUENCE_KEY, 'P');
}

/**
 * Guided-setup completion flag. Absence means "not completed yet", so a
 * freshly-created business needs no explicit `'0'` write; only finishing the
 * wizard (or skipping every step) writes `'1'`.
 *
 * Living in `app_metadata` means the flag rides JSON backup/import and is
 * wiped by `clearAllData`, keeping the resume state consistent with the
 * business data it describes.
 */
const SETUP_COMPLETED_KEY = 'setup_completed';

/** Whether the guided setup wizard has been completed (or skipped) already. */
export async function getSetupCompleted(): Promise<boolean> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_metadata WHERE key = ?',
    SETUP_COMPLETED_KEY,
  );
  return row?.value === '1';
}

/** Persist the guided-setup completion flag. */
export async function setSetupCompleted(completed: boolean): Promise<void> {
  await withTransaction(async (txn) => {
    await setMetadata(txn, SETUP_COMPLETED_KEY, completed ? '1' : '0');
  });
}
