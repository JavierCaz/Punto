/**
 * @jest-environment node
 *
 * Unit tests for the pure backup format + validation (no expo/DB imports).
 * These pin the deterministic serialization, the normalization of rows to
 * schema column order, and every validation guard that protects the import
 * path from a corrupt or hostile file.
 */

import {
  BACKUP_APP_NAME,
  BACKUP_FORMAT,
  BACKUP_FORMAT_VERSION,
  BACKUP_TABLES,
  buildBackupDocument,
  buildBackupFileName,
  emptyBackupTables,
  parseBackupJson,
  serializeBackup,
  summarizeBackup,
  validateBackupDocument,
} from '@/lib/backup-format';
import type { BackupColumn, BackupSchema, BackupTableName, BackupTables } from '@/lib/backup-format';

const EXPECTED_SCHEMA_VERSION = 2;

const DEFAULT_COLUMNS: BackupColumn[] = [{ name: 'id', type: 'TEXT', notNull: true, pk: true }];

function makeSchema(
  overrides: Partial<Record<BackupTableName, BackupColumn[]>> = {},
): BackupSchema {
  const schema = {} as BackupSchema;
  for (const table of BACKUP_TABLES) {
    const fallback = table === 'app_metadata' ? [{ name: 'key', type: 'TEXT', notNull: true, pk: true }] : DEFAULT_COLUMNS;
    schema[table] = { columns: overrides[table] ?? fallback };
  }
  return schema;
}

function makeRawDoc(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    format: BACKUP_FORMAT,
    formatVersion: BACKUP_FORMAT_VERSION,
    schemaVersion: EXPECTED_SCHEMA_VERSION,
    exportedAt: '2026-09-17T12:00:00.000Z',
    app: { name: BACKUP_APP_NAME, version: '1.0.0' },
    tables: emptyBackupTables(),
    ...overrides,
  };
}

const PRODUCT_COLUMNS: BackupColumn[] = [
  { name: 'id', type: 'TEXT', notNull: true, pk: true },
  { name: 'name', type: 'TEXT', notNull: true, pk: false },
  { name: 'price_minor', type: 'INTEGER', notNull: true, pk: false },
  { name: 'description', type: 'TEXT', notNull: false, pk: false },
];

describe('backup format — build & serialize', () => {
  it('creates every table key in canonical order', () => {
    const tables = emptyBackupTables();
    expect(Object.keys(tables)).toEqual([...BACKUP_TABLES]);
    for (const table of BACKUP_TABLES) {
      expect(tables[table]).toEqual([]);
    }
  });

  it('builds a document with canonical table order regardless of input order', () => {
    const tables = emptyBackupTables();
    tables.product.push({ id: 'p1' });
    const reversed = Object.fromEntries(Object.entries(tables).reverse()) as typeof tables;

    const doc = buildBackupDocument({
      schemaVersion: EXPECTED_SCHEMA_VERSION,
      exportedAt: '2026-09-17T12:00:00.000Z',
      tables: reversed,
    });

    expect(Object.keys(doc.tables)).toEqual([...BACKUP_TABLES]);
    expect(doc.format).toBe(BACKUP_FORMAT);
    expect(doc.formatVersion).toBe(BACKUP_FORMAT_VERSION);
    expect(doc.app).toEqual({ name: BACKUP_APP_NAME, version: '0.0.0' });
    expect(doc.tables.product).toEqual([{ id: 'p1' }]);
  });

  it('serializes deterministically for identical data', () => {
    const tables = emptyBackupTables();
    tables.category.push({ id: 'c1' });
    tables.product.push({ id: 'p2' }, { id: 'p1' });

    const input = {
      schemaVersion: EXPECTED_SCHEMA_VERSION,
      exportedAt: '2026-09-17T12:00:00.000Z',
      tables,
    };
    expect(serializeBackup(buildBackupDocument(input))).toBe(
      serializeBackup(buildBackupDocument(input)),
    );
  });

  it('summarizes per-table and total rows', () => {
    const tables = emptyBackupTables();
    tables.product.push({ id: 'p1' }, { id: 'p2' });
    tables.category.push({ id: 'c1' });

    const stats = summarizeBackup(
      buildBackupDocument({
        schemaVersion: EXPECTED_SCHEMA_VERSION,
        exportedAt: '2026-09-17T12:00:00.000Z',
        tables,
      }),
    );

    expect(stats.totalRows).toBe(3);
    expect(stats.perTable.product).toBe(2);
    expect(stats.perTable.category).toBe(1);
    expect(stats.perTable.business).toBe(0);
  });

  it('names files with a UTC timestamp', () => {
    expect(buildBackupFileName(new Date('2026-09-17T14:30:05.000Z'))).toBe(
      'punto-backup-20260917-143005.json',
    );
  });
});

describe('backup format — parse', () => {
  it('parses valid JSON', () => {
    expect(parseBackupJson('{"a":1}')).toEqual({ ok: true, value: { a: 1 } });
  });

  it('rejects empty and whitespace-only input', () => {
    expect(parseBackupJson('').ok).toBe(false);
    expect(parseBackupJson('   ').ok).toBe(false);
  });

  it('rejects invalid JSON with a path error', () => {
    const result = parseBackupJson('{not json');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0].path).toBe('$');
      expect(result.errors[0].message).toContain('invalid JSON');
    }
  });
});

describe('backup format — validation', () => {
  const schema = makeSchema({ product: PRODUCT_COLUMNS });

  function validate(raw: unknown) {
    return validateBackupDocument(raw, schema, { expectedSchemaVersion: EXPECTED_SCHEMA_VERSION });
  }

  function validProductRow(): Record<string, unknown> {
    return { id: 'p1', name: 'Latte', price_minor: 4500, description: null };
  }

  function docWithProduct(rows: unknown[]): Record<string, unknown> {
    const tables = emptyBackupTables();
    tables.product = rows as BackupTables['product'];
    return makeRawDoc({ tables });
  }

  it('accepts a valid document and normalizes rows in schema column order', () => {
    const result = validate(docWithProduct([validProductRow()]));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Object.keys(result.document.tables.product[0])).toEqual([
        'id',
        'name',
        'price_minor',
        'description',
      ]);
      expect(result.stats.totalRows).toBe(1);
      expect(result.stats.perTable.product).toBe(1);
    }
  });

  it('rejects a non-object payload', () => {
    expect(validate('nope').ok).toBe(false);
    expect(validate(null).ok).toBe(false);
    expect(validate([]).ok).toBe(false);
  });

  it('rejects the wrong format marker or version', () => {
    expect(validate(makeRawDoc({ format: 'other' })).ok).toBe(false);
    expect(validate(makeRawDoc({ formatVersion: 2 })).ok).toBe(false);
  });

  it('rejects an unsupported schema version, including newer files', () => {
    const older = validate(makeRawDoc({ schemaVersion: 1 }));
    const newer = validate(makeRawDoc({ schemaVersion: 99 }));
    expect(older.ok).toBe(false);
    expect(newer.ok).toBe(false);
    if (newer.ok === false) {
      expect(newer.errors.some((e) => e.path === '$.schemaVersion')).toBe(true);
    }
  });

  it('requires every known table and rejects unknown tables', () => {
    const missing = { ...makeRawDoc().tables as Record<string, unknown> };
    delete missing.sale;
    expect(validate(makeRawDoc({ tables: missing })).ok).toBe(false);

    const tables = emptyBackupTables() as Record<string, unknown>;
    tables.hacker = [];
    expect(validate(makeRawDoc({ tables })).ok).toBe(false);
  });

  it('rejects a table that is not an array', () => {
    const tables = emptyBackupTables() as Record<string, unknown>;
    tables.product = {};
    expect(validate(makeRawDoc({ tables })).ok).toBe(false);
  });

  it('rejects unknown columns and prototype-pollution keys', () => {
    const unknownColumn = validate(docWithProduct([{ ...validProductRow(), evil: 1 }]));
    expect(unknownColumn.ok).toBe(false);
    if (!unknownColumn.ok) {
      expect(unknownColumn.errors.some((e) => e.message === 'unknown column')).toBe(true);
    }

    const protoRow = JSON.parse(
      '{"id":"p1","name":"Latte","price_minor":4500,"description":null,"__proto__":{"polluted":true}}',
    ) as Record<string, unknown>;
    const proto = validate(docWithProduct([protoRow]));
    expect(proto.ok).toBe(false);
    if (!proto.ok) {
      expect(proto.errors.some((e) => e.message === 'forbidden key')).toBe(true);
    }
  });

  it('requires every schema column to be present (nulls included)', () => {
    const { description, ...withoutDescription } = validProductRow();
    void description;
    const result = validate(docWithProduct([withoutDescription]));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.message === 'missing column')).toBe(true);
    }
  });

  it('rejects null in a NOT NULL column and missing PK values', () => {
    const nullName = validate(docWithProduct([{ ...validProductRow(), name: null }]));
    expect(nullName.ok).toBe(false);

    const nullPk = validate(docWithProduct([{ ...validProductRow(), id: null }]));
    expect(nullPk.ok).toBe(false);
    if (!nullPk.ok) {
      expect(nullPk.errors.some((e) => e.message === 'primary key must not be null')).toBe(true);
    }
  });

  it('rejects duplicate primary keys', () => {
    const result = validate(docWithProduct([validProductRow(), { ...validProductRow(), name: 'Otro' }]));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.message === 'duplicate primary key')).toBe(true);
    }
  });

  it('rejects values whose type does not match the column affinity', () => {
    expect(validate(docWithProduct([{ ...validProductRow(), name: 5 }])).ok).toBe(false);
    expect(validate(docWithProduct([{ ...validProductRow(), price_minor: '4500' }])).ok).toBe(false);
    expect(validate(docWithProduct([{ ...validProductRow(), price_minor: 45.5 }])).ok).toBe(false);
    // 1e999 parses to Infinity — must not slip through a typeof number check.
    expect(validate(docWithProduct([{ ...validProductRow(), price_minor: Number.POSITIVE_INFINITY }])).ok).toBe(false);
  });

  it('allows null in a nullable column', () => {
    expect(validate(docWithProduct([{ ...validProductRow(), description: null }])).ok).toBe(true);
  });
});
