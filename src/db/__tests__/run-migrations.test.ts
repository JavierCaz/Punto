/**
 * @jest-environment node
 *
 * Unit test for the migration runner's control flow (recording fake, no native
 * SQLite — AGENTS.md §9.4). Migrations run on the passed connection inside
 * BEGIN IMMEDIATE ... COMMIT, with the user_version bump in the same
 * transaction, and roll back + rethrow when a statement fails.
 */

import { runMigrations, type Database } from '@/db/client';
import { LATEST_SCHEMA_VERSION, migrations } from '@/db/migrations';

type Recording = {
  db: Database;
  execCalls: string[];
};

function createRecordingDb(userVersion: number, failOn?: string): Recording {
  const execCalls: string[] = [];
  const db = {
    getFirstAsync: async (): Promise<{ user_version: number }> => ({ user_version: userVersion }),
    execAsync: async (sql: string): Promise<void> => {
      execCalls.push(sql);
      if (failOn !== undefined && sql.includes(failOn)) {
        throw new Error('migration statement failed');
      }
    },
  };
  return { db: db as unknown as Database, execCalls };
}

describe('runMigrations', () => {
  it('runs every pending statement and bumps user_version inside a transaction', async () => {
    const { db, execCalls } = createRecordingDb(0);

    await runMigrations(db);

    for (const migration of migrations) {
      for (const statement of migration.up) {
        expect(execCalls).toContain(statement);
      }
      expect(execCalls).toContain(`PRAGMA user_version = ${migration.version}`);
    }
    expect(execCalls.filter((sql) => sql === 'BEGIN IMMEDIATE')).toHaveLength(migrations.length);
    expect(execCalls.filter((sql) => sql === 'COMMIT')).toHaveLength(migrations.length);
  });

  it("bumps user_version after each migration's statements, before COMMIT", async () => {
    const { db, execCalls } = createRecordingDb(0);

    await runMigrations(db);

    for (const migration of migrations) {
      const versionIndex = execCalls.indexOf(`PRAGMA user_version = ${migration.version}`);
      expect(versionIndex).toBeGreaterThanOrEqual(0);
      for (const statement of migration.up) {
        expect(execCalls.indexOf(statement)).toBeLessThan(versionIndex);
      }
      expect(execCalls.indexOf('COMMIT', versionIndex)).toBeGreaterThan(versionIndex);
    }
  });

  it('rolls back and rethrows when a migration statement fails', async () => {
    const { db, execCalls } = createRecordingDb(0, 'CREATE TABLE business');

    await expect(runMigrations(db)).rejects.toThrow('migration statement failed');

    expect(execCalls).toContain('BEGIN IMMEDIATE');
    expect(execCalls).toContain('ROLLBACK');
    expect(execCalls).not.toContain('COMMIT');
  });

  it('skips all migrations when the schema is already current', async () => {
    const { db, execCalls } = createRecordingDb(LATEST_SCHEMA_VERSION);

    await runMigrations(db);

    expect(execCalls).toEqual([]);
  });
});
