/**
 * @jest-environment node
 *
 * Backup repository unit tests — driven by the scripted `RecordingAdapter`
 * (no native SQLite). These pin the SQL shape and ordering of export/import/
 * clear, the conflict policy, the validation-before-wipe guarantee, and error
 * mapping. Real rollback/FK behavior is covered by the node:sqlite integration
 * test (`src/db/__tests__/backup-roundtrip.integration.test.ts`).
 */

import { getDb } from '@/db/client';
import { resetBusinessScope } from '@/db/repositories/business-scope';
import {
  clearAllData,
  exportDatabase,
  importDatabase,
  inspectBackup,
  isDatabaseEmpty,
} from '@/db/repositories/backup';
import { REPO_ERROR, isRepoError } from '@/db/repositories/errors';
import { makeFakeDb } from '@/db/repositories/__tests__/fakes/fake-db';
import { RecordingAdapter } from '@/db/repositories/__tests__/fakes/recording-adapter';
import { BACKUP_DELETE_ORDER, BACKUP_TABLES, buildBackupDocument, emptyBackupTables } from '@/lib/backup-format';
import type { BackupTableName } from '@/lib/backup-format';

jest.mock('@/db/client', () => ({ getDb: jest.fn() }));

interface TableInfoRow {
  name: string;
  type: string;
  notnull: number;
  pk: number;
}

const TABLE_INFO: Record<BackupTableName, TableInfoRow[]> = Object.fromEntries(
  BACKUP_TABLES.map((table) =>
    table === 'app_metadata'
      ? [table, [{ name: 'key', type: 'TEXT', notnull: 1, pk: 1 }]]
      : table === 'product'
        ? [
            table,
            [
              { name: 'id', type: 'TEXT', notnull: 1, pk: 1 },
              { name: 'description', type: 'TEXT', notnull: 0, pk: 0 },
            ],
          ]
        : [table, [{ name: 'id', type: 'TEXT', notnull: 1, pk: 1 }]],
  ),
) as Record<BackupTableName, TableInfoRow[]>;

function queueSchema(adapter: RecordingAdapter): void {
  for (const table of BACKUP_TABLES) {
    adapter.queueAll(`PRAGMA table_info(${table})`, TABLE_INFO[table]);
  }
}

function queueAllTables(adapter: RecordingAdapter, rows: Partial<Record<BackupTableName, unknown[]>>): void {
  for (const table of BACKUP_TABLES) {
    adapter.queueAll(`FROM ${table}`, rows[table] ?? []);
  }
}

function makeImportDoc(productRows: { id: string; description: string | null }[] = []) {
  const tables = emptyBackupTables();
  tables.product = productRows;
  return buildBackupDocument({
    schemaVersion: 2,
    exportedAt: '2026-09-17T12:00:00.000Z',
    tables,
  });
}

describe('backup repository', () => {
  let adapter: RecordingAdapter;

  let execCalls: string[];

  beforeEach(() => {
    adapter = new RecordingAdapter();
    execCalls = [];
    const fakeDb = makeFakeDb(adapter);
    const baseExec = fakeDb.execAsync;
    fakeDb.execAsync = async (source: string) => {
      execCalls.push(source);
      await baseExec(source);
    };
    (getDb as jest.Mock).mockResolvedValue(fakeDb);
    resetBusinessScope();
  });

  describe('exportDatabase', () => {
    it('reads the schema, selects every table ordered by primary key, and nulls undefined', async () => {
      queueSchema(adapter);
      queueAllTables(adapter, { product: [{ id: 'p1' }], business: [{ id: 'b1' }] });

      const doc = await exportDatabase({ exportedAt: '2026-09-17T12:00:00.000Z' });

      expect(doc.schemaVersion).toBe(2);
      expect(doc.exportedAt).toBe('2026-09-17T12:00:00.000Z');
      expect(doc.tables.business).toEqual([{ id: 'b1' }]);
      // `description` was absent from the SQLite row → normalized to null.
      expect(doc.tables.product).toEqual([{ id: 'p1', description: null }]);

      const productSelect = adapter.calls.find(
        (call) => call.sql.includes('FROM product'),
      );
      expect(productSelect?.sql).toBe(
        'SELECT id, description FROM product ORDER BY id ASC',
      );
    });

    it('queries every domain table exactly once', async () => {
      queueSchema(adapter);
      queueAllTables(adapter, {});

      await exportDatabase();

      const selects = adapter.calls.filter((call) => call.sql.startsWith('SELECT'));
      expect(selects).toHaveLength(BACKUP_TABLES.length);
      for (const table of BACKUP_TABLES) {
        expect(selects.some((call) => call.sql.includes(`FROM ${table} `))).toBe(true);
      }
    });
  });

  describe('inspectBackup', () => {
    it('accepts a valid document', async () => {
      queueSchema(adapter);

      const result = await inspectBackup(makeImportDoc([{ id: 'p1', description: null }]));

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.stats.perTable.product).toBe(1);
      }
    });

    it('rejects an invalid document with errors', async () => {
      queueSchema(adapter);

      const result = await inspectBackup({ format: 'nope' });

      expect(result.ok).toBe(false);
    });
  });

  describe('importDatabase', () => {
    it('deletes children-first and inserts parents-first inside one transaction', async () => {
      queueSchema(adapter);
      adapter.queueFirst('COUNT(*) AS count FROM business', { count: 0 });

      await importDatabase(makeImportDoc([{ id: 'p1', description: null }]), { mode: 'replace' });

      const deletes = adapter.calls
        .filter((call) => call.sql.startsWith('DELETE FROM'))
        .map((call) => call.sql.replace('DELETE FROM ', ''));
      expect(deletes).toEqual([...BACKUP_DELETE_ORDER]);

      const inserts = adapter.calls.filter((call) => call.sql.startsWith('INSERT INTO'));
      expect(inserts).toHaveLength(1);
      expect(inserts[0].sql).toBe(
        'INSERT INTO product (id, description) VALUES (?, ?)',
      );
      expect(inserts[0].params).toEqual(['p1', null]);

      // FK checks are deferred to COMMIT inside the transaction.
      expect(execCalls).toContain('PRAGMA defer_foreign_keys = ON');
      expect(execCalls).toContain('BEGIN IMMEDIATE');
      expect(execCalls).toContain('COMMIT');
    });

    it('imports into an empty database without an explicit replace mode', async () => {
      queueSchema(adapter);
      adapter.queueFirst('COUNT(*) AS count FROM business', { count: 0 });

      await expect(importDatabase(makeImportDoc(), { mode: 'fail' })).resolves.toBeDefined();
    });

    it('refuses a non-empty target with REPO_BACKUP_CONFLICT and writes nothing', async () => {
      queueSchema(adapter);
      adapter.queueFirst('COUNT(*) AS count FROM business', { count: 1 });

      const error = await importDatabase(makeImportDoc()).catch((e: unknown) => e);

      expect(isRepoError(error, REPO_ERROR.BACKUP_CONFLICT)).toBe(true);
      expect(adapter.calls.some((call) => call.sql.startsWith('DELETE FROM'))).toBe(false);
    });

    it('replaces a non-empty target when mode is replace', async () => {
      queueSchema(adapter);
      adapter.queueFirst('COUNT(*) AS count FROM business', { count: 1 });

      await expect(
        importDatabase(makeImportDoc([{ id: 'p1', description: null }]), { mode: 'replace' }),
      ).resolves.toEqual({ stats: expect.objectContaining({ totalRows: 1 }) });
      expect(adapter.calls.some((call) => call.sql.startsWith('DELETE FROM'))).toBe(true);
    });

    it('rejects an invalid document before touching data', async () => {
      queueSchema(adapter);

      const invalid = { ...makeImportDoc(), format: 'wrong' };
      const error = await importDatabase(invalid).catch((e: unknown) => e);

      expect(isRepoError(error, REPO_ERROR.BACKUP_INVALID)).toBe(true);
      expect(adapter.calls.some((call) => call.sql.startsWith('DELETE FROM'))).toBe(false);
    });

    it('maps a SQLite failure during insert to REPO_BACKUP_INVALID', async () => {
      queueSchema(adapter);
      adapter.queueFirst('COUNT(*) AS count FROM business', { count: 0 });
      adapter.runAsync = jest.fn(async (sql: string) => {
        if (sql.startsWith('INSERT')) {
          throw new Error('FOREIGN KEY constraint failed');
        }
        return { changes: 1, lastInsertRowId: 1 };
      }) as unknown as RecordingAdapter['runAsync'];

      const error = await importDatabase(makeImportDoc([{ id: 'p1', description: null }]), {
        mode: 'replace',
      }).catch((e: unknown) => e);

      expect(isRepoError(error, REPO_ERROR.BACKUP_INVALID)).toBe(true);
    });
  });

  describe('clearAllData', () => {
    it('deletes every table children-first', async () => {
      await clearAllData();

      const deletes = adapter.calls
        .filter((call) => call.sql.startsWith('DELETE FROM'))
        .map((call) => call.sql.replace('DELETE FROM ', ''));
      expect(deletes).toEqual([...BACKUP_DELETE_ORDER]);
    });
  });

  describe('isDatabaseEmpty', () => {
    it('is true when there is no business row', async () => {
      adapter.queueFirst('COUNT(*) AS count FROM business', { count: 0 });
      await expect(isDatabaseEmpty()).resolves.toBe(true);
    });

    it('is false when a business row exists', async () => {
      adapter.queueFirst('COUNT(*) AS count FROM business', { count: 1 });
      await expect(isDatabaseEmpty()).resolves.toBe(false);
    });
  });
});
