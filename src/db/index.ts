/**
 * Database barrel — public surface for the SQLite layer.
 *
 * Import from '@/db' anywhere you need data access:
 *
 *   import { getDb } from '@/db';
 *
 * Repositories and zustand stores resolve `getDb()` (module singleton) to run
 * queries; components should never open their own database.
 */

export { DATABASE_NAME, getDb, resetDbForTesting, runMigrations } from '@/db/client';
export type { Database } from '@/db/client';
export type { Migration } from '@/db/types';
export { LATEST_SCHEMA_VERSION, migrations } from '@/db/migrations';
