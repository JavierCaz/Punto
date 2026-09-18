/**
 * Migration registry.
 *
 * Every migration is append-only and immutable once shipped. Order matters:
 * entries run sequentially, keyed off `PRAGMA user_version` (see
 * `runMigrations` in client.ts). Never edit or reorder a shipped migration —
 * add a new entry instead.
 */

import type { Migration } from '@/db/types';

import { migration001InitialSchema } from '@/db/migrations/001-initial-schema';
import { migration002Auth } from '@/db/migrations/002-auth';
import { migration003SaleInventoryRestored } from '@/db/migrations/003-sale-inventory-restored';

export const migrations: readonly Migration[] = [
  migration001InitialSchema,
  migration002Auth,
  migration003SaleInventoryRestored,
];

export const LATEST_SCHEMA_VERSION = migrations[migrations.length - 1].version;
