/**
 * @jest-environment node
 *
 * Integration test for JSON backup round-tripping against a REAL SQLite engine
 * (Node 22's built-in `node:sqlite`). The schema is built from the same
 * migration list the app ships, a fully populated business is seeded, then:
 *
 *   export → serialize → clear → import → compare raw rows byte-for-byte
 *
 * It also proves the two safety guarantees the unit tests cannot: an import
 * that violates a foreign key rolls back completely (prior data intact), and a
 * non-empty target is refused unless the caller opts into replace.
 *
 * `node:sqlite` requires Node ≥ 22.5; on older runtimes the suite skips with a
 * clear message rather than failing.
 */

import type { Database } from '@/db/client';
import { getDb } from '@/db/client';
import { migrations } from '@/db/migrations';
import { clearAllData, exportDatabase, importDatabase, isDatabaseEmpty } from '@/db/repositories/backup';
import { REPO_ERROR, isRepoError } from '@/db/repositories/errors';
import { BACKUP_TABLES, serializeBackup } from '@/lib/backup-format';
import type { BackupDocument } from '@/lib/backup-format';

jest.mock('@/db/client', () => ({ getDb: jest.fn() }));

/** Minimal actor fixture for the authorization asserts. */
const ADMIN = { role: 'ADMIN' } as const;

// --- node:sqlite capability gate ------------------------------------------

interface SqliteStatement {
  get(...params: unknown[]): unknown;
  all(...params: unknown[]): unknown[];
  run(...params: unknown[]): { changes: number | bigint; lastInsertRowid: number | bigint };
}

interface SqliteDb {
  exec(sql: string): void;
  prepare(sql: string): SqliteStatement;
  close(): void;
}

interface SqliteModule {
  DatabaseSync: new (path: string) => SqliteDb;
}

let DatabaseSyncCtor: SqliteModule['DatabaseSync'] | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const sqliteModule = require('node:sqlite') as SqliteModule;
  DatabaseSyncCtor = sqliteModule.DatabaseSync;
} catch {
  DatabaseSyncCtor = null;
}

const describeSqlite = DatabaseSyncCtor ? describe : describe.skip;

if (!DatabaseSyncCtor) {
  console.warn('Skipping backup integration test: node:sqlite requires Node >= 22.5');
}

// --- adapter over node:sqlite ---------------------------------------------

type Row = Record<string, unknown>;

function createAdapter(sqlite: SqliteDb): Database {
  const adapter = {
    execAsync: async (source: string): Promise<void> => {
      sqlite.exec(source);
    },
    getFirstAsync: async <T>(source: string, ...params: unknown[]): Promise<T | null> => {
      const row = sqlite.prepare(source).get(...params);
      return (row ?? null) as T | null;
    },
    getAllAsync: async <T>(source: string, ...params: unknown[]): Promise<T[]> => {
      return sqlite.prepare(source).all(...params) as T[];
    },
    runAsync: async (source: string, ...params: unknown[]) => {
      const result = sqlite.prepare(source).run(...params);
      return {
        changes: Number(result.changes),
        lastInsertRowId: Number(result.lastInsertRowid),
      };
    },
  };
  return adapter as unknown as Database;
}

// --- schema + seed ---------------------------------------------------------

function buildSchema(sqlite: SqliteDb): void {
  for (const migration of migrations) {
    for (const statement of migration.up) {
      sqlite.exec(statement);
    }
    sqlite.exec(`PRAGMA user_version = ${migration.version}`);
  }
}

const SEED: [string, ...unknown[]][] = [
  // Business profile.
  [
    `INSERT INTO business (id, name, legal_name, currency_code, locale, accent_color,
       tax_enabled, default_tax_rate_bp, inventory_enabled, allow_negative_inventory,
       low_stock_alerts_enabled, receipt_enabled, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    'biz-1', 'Café Punto', 'Café Punto S.A. de C.V.', 'MXN', 'es', 'emerald',
    1, 1600, 1, 0, 1, 1, 1, '2026-01-01T00:00:00.000Z', '2026-01-02T00:00:00.000Z',
  ],
  // Units.
  [`INSERT INTO unit (id, business_id, name, symbol, type, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    'u-g', 'biz-1', 'Gramo', 'g', 'weight', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'],
  [`INSERT INTO unit (id, business_id, name, symbol, type, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    'u-ml', 'biz-1', 'Mililitro', 'ml', 'volume', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'],
  [`INSERT INTO unit (id, business_id, name, symbol, type, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    'u-pza', 'biz-1', 'Pieza', 'pza', 'count', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'],
  // Categories.
  [`INSERT INTO category (id, business_id, name, sort_order, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    'cat-1', 'biz-1', 'Bebidas', 1, 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'],
  [`INSERT INTO category (id, business_id, name, sort_order, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    'cat-2', 'biz-1', 'Snacks', 2, 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'],
  // Employees (ADMIN + staff).
  [`INSERT INTO employee (id, business_id, first_name, last_name, username, role, password_hash, pin_hash, is_active, last_login_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    'emp-admin', 'biz-1', 'Ana', 'Dueña', 'ana', 'ADMIN', 'pbkdf2-sha256$1000$salt$dk', null, 1, '2026-01-02T08:00:00.000Z', '2026-01-01T00:00:00.000Z', '2026-01-02T08:00:00.000Z'],
  [`INSERT INTO employee (id, business_id, first_name, last_name, username, role, password_hash, pin_hash, is_active, last_login_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    'emp-1', 'biz-1', 'Luis', null, 'luis', 'EMPLOYEE', null, 'pbkdf2-sha256$1000$salt2$dk2', 1, null, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'],
  // Payment methods.
  [`INSERT INTO payment_method (id, business_id, name, type, is_default, is_active, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    'pm-cash', 'biz-1', 'Efectivo', 'CASH', 1, 1, 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'],
  [`INSERT INTO payment_method (id, business_id, name, type, is_default, is_active, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    'pm-card', 'biz-1', 'Tarjeta', 'CARD', 0, 1, 2, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'],
  // Financial categories.
  [`INSERT INTO financial_category (id, business_id, name, type, is_system, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    'fc-exp', 'biz-1', 'Gastos operativos', 'EXPENSE', 1, 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'],
  [`INSERT INTO financial_category (id, business_id, name, type, is_system, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    'fc-inc', 'biz-1', 'Otros ingresos', 'INCOME', 1, 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'],
  // Inventory items.
  [`INSERT INTO inventory_item (id, business_id, name, unit_id, current_quantity, minimum_quantity, unit_cost_minor, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    'ii-matcha', 'biz-1', 'Matcha en polvo', 'u-g', 692000, 100000, 120, 1, '2026-01-01T00:00:00.000Z', '2026-01-03T00:00:00.000Z'],
  [`INSERT INTO inventory_item (id, business_id, name, unit_id, current_quantity, minimum_quantity, unit_cost_minor, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    'ii-milk', 'biz-1', 'Leche', 'u-ml', 4000000, 500000, 25, 1, '2026-01-01T00:00:00.000Z', '2026-01-03T00:00:00.000Z'],
  [`INSERT INTO inventory_item (id, business_id, name, unit_id, current_quantity, minimum_quantity, unit_cost_minor, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    'ii-chips', 'biz-1', 'Bolsa de papas', 'u-pza', 99000, 12000, 900, 1, '2026-01-01T00:00:00.000Z', '2026-01-03T00:00:00.000Z'],
  // Products.
  [`INSERT INTO product (id, business_id, category_id, name, price_minor, inventory_item_id, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    'prod-matcha', 'biz-1', 'cat-1', 'Matcha Latte', 4500, null, 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'],
  [`INSERT INTO product (id, business_id, category_id, name, price_minor, inventory_item_id, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    'prod-chips', 'biz-1', 'cat-2', 'Papas', 1800, 'ii-chips', 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'],
  // Supplier + link.
  [`INSERT INTO supplier (id, business_id, name, phone, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    'sup-1', 'biz-1', 'Distribuidora Matcha', '555-0100', 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'],
  [`INSERT INTO supplier_item (id, supplier_id, inventory_item_id, supplier_sku, purchase_price_minor, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    'si-1', 'sup-1', 'ii-matcha', 'MTC-1KG', 115, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'],
  // Recipe + items.
  [`INSERT INTO recipe (id, business_id, product_id, name, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    'rec-matcha', 'biz-1', 'prod-matcha', 'Receta Matcha Latte', 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'],
  [`INSERT INTO recipe_item (id, recipe_id, inventory_item_id, quantity, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    'ri-1', 'rec-matcha', 'ii-matcha', 8000, 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'],
  [`INSERT INTO recipe_item (id, recipe_id, inventory_item_id, quantity, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    'ri-2', 'rec-matcha', 'ii-milk', 150000, 2, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'],
  // Purchase + item.
  [`INSERT INTO purchase (id, business_id, supplier_id, purchase_number, subtotal_minor, tax_minor, discount_minor, total_minor, status, employee_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    'pur-1', 'biz-1', 'sup-1', 'P-000001', 23000, 3680, 0, 26680, 'COMPLETED', 'emp-admin', '2026-01-03T00:00:00.000Z', '2026-01-03T00:00:00.000Z'],
  [`INSERT INTO purchase_item (id, purchase_id, inventory_item_id, quantity, unit_id, unit_cost_minor, subtotal_minor, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    'pi-1', 'pur-1', 'ii-matcha', 200000, 'u-g', 115, 23000, '2026-01-03T00:00:00.000Z'],
  // Movements (ledger).
  [`INSERT INTO inventory_movement (id, business_id, inventory_item_id, type, quantity, unit_id, unit_cost_minor, reason, reference_type, reference_id, employee_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    'im-1', 'biz-1', 'ii-matcha', 'INITIAL_STOCK', 500000, 'u-g', 120, null, null, null, 'emp-admin', '2026-01-01T00:00:00.000Z'],
  [`INSERT INTO inventory_movement (id, business_id, inventory_item_id, type, quantity, unit_id, unit_cost_minor, reason, reference_type, reference_id, employee_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    'im-2', 'biz-1', 'ii-matcha', 'PURCHASE', 200000, 'u-g', 115, null, 'purchase', 'pur-1', 'emp-admin', '2026-01-03T00:00:00.000Z'],
  [`INSERT INTO inventory_movement (id, business_id, inventory_item_id, type, quantity, unit_id, unit_cost_minor, reason, reference_type, reference_id, employee_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    'im-3', 'biz-1', 'ii-matcha', 'SALE', -8000, 'u-g', 120, null, 'sale', 'sale-1', 'emp-1', '2026-01-04T00:00:00.000Z'],
  [`INSERT INTO inventory_movement (id, business_id, inventory_item_id, type, quantity, unit_id, unit_cost_minor, reason, reference_type, reference_id, employee_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    'im-4', 'biz-1', 'ii-chips', 'INITIAL_STOCK', 100000, 'u-pza', 900, null, null, null, 'emp-admin', '2026-01-01T00:00:00.000Z'],
  // Sale + item + payment.
  [`INSERT INTO sale (id, business_id, sale_number, status, subtotal_minor, discount_minor, tax_minor, total_minor, employee_id, notes, created_at, updated_at, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    'sale-1', 'biz-1', 'S-000001', 'COMPLETED', 4500, 0, 720, 5220, 'emp-1', 'Sin azúcar', '2026-01-04T00:00:00.000Z', '2026-01-04T00:00:00.000Z', '2026-01-04T00:00:00.000Z'],
  [`INSERT INTO sale_item (id, sale_id, product_id, product_name, quantity, unit_price_minor, discount_minor, subtotal_minor, unit_cost_minor, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    'sli-1', 'sale-1', 'prod-matcha', 'Matcha Latte', 1000, 4500, 0, 4500, 1200, '2026-01-04T00:00:00.000Z'],
  [`INSERT INTO payment (id, business_id, sale_id, payment_method_id, amount_minor, amount_given_minor, reference, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    'pay-1', 'biz-1', 'sale-1', 'pm-cash', 5220, 6000, null, null, '2026-01-04T00:00:00.000Z'],
  // Expense.
  [`INSERT INTO financial_transaction (id, business_id, category_id, amount_minor, payment_method_id, supplier_id, employee_id, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    'ft-1', 'biz-1', 'fc-exp', 12000, 'pm-cash', 'sup-1', 'emp-admin', 'Gasolina', '2026-01-05T00:00:00.000Z', '2026-01-05T00:00:00.000Z'],
  // Counters.
  [`INSERT INTO app_metadata (key, value) VALUES (?, ?)`, 'sale_number_seq', '1'],
  [`INSERT INTO app_metadata (key, value) VALUES (?, ?)`, 'purchase_number_seq', '1'],
];

function seed(sqlite: SqliteDb): void {
  for (const [sql, ...params] of SEED) {
    sqlite.prepare(sql).run(...params);
  }
}

/** Every row of every domain table, ordered by primary key, as plain objects. */
function snapshot(sqlite: SqliteDb): Record<string, Row[]> {
  const result: Record<string, Row[]> = {};
  for (const table of BACKUP_TABLES) {
    const columns = (sqlite.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map(
      (column) => column.name,
    );
    const rows = sqlite.prepare(`SELECT ${columns.join(', ')} FROM ${table} ORDER BY ${columns[0]} ASC`).all() as Row[];
    result[table] = rows.map((row) => ({ ...row }));
  }
  return result;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

// --- tests -----------------------------------------------------------------

describeSqlite('backup round-trip (real SQLite)', () => {
  let sqlite: SqliteDb;

  beforeEach(() => {
    sqlite = new DatabaseSyncCtor!(':memory:');
    sqlite.exec('PRAGMA foreign_keys = ON;');
    buildSchema(sqlite);
    seed(sqlite);
    (getDb as jest.Mock).mockResolvedValue(createAdapter(sqlite));
  });

  afterEach(() => {
    sqlite.close();
    jest.clearAllMocks();
  });

  it('export → clear → import preserves every row byte-for-byte', async () => {
    const before = snapshot(sqlite);

    const exported = await exportDatabase(ADMIN, { exportedAt: '2026-09-17T12:00:00.000Z' });
    const json = serializeBackup(exported);

    expect(await isDatabaseEmpty()).toBe(false);
    await clearAllData(ADMIN);
    expect(await isDatabaseEmpty()).toBe(true);
    expect(snapshot(sqlite)).toEqual(
      Object.fromEntries(BACKUP_TABLES.map((table) => [table, []])),
    );

    await importDatabase(ADMIN, JSON.parse(json), { mode: 'replace' });

    const after = snapshot(sqlite);
    expect(after).toEqual(before);
    expect(await isDatabaseEmpty()).toBe(false);
    expect(after.app_metadata).toEqual([
      { key: 'purchase_number_seq', value: '1' },
      { key: 'sale_number_seq', value: '1' },
    ]);
    expect(after.inventory_movement.find((row) => row.id === 'im-3')?.quantity).toBe(-8000);
  });

  it('serializes deterministically for the same data', async () => {
    const first = await exportDatabase(ADMIN, { exportedAt: '2026-09-17T12:00:00.000Z' });
    const second = await exportDatabase(ADMIN, { exportedAt: '2026-09-17T12:00:00.000Z' });
    expect(serializeBackup(second)).toBe(serializeBackup(first));
  });

  it('rolls back completely when a file has a dangling foreign key', async () => {
    const before = snapshot(sqlite);
    const exported = await exportDatabase(ADMIN, { exportedAt: '2026-09-17T12:00:00.000Z' });

    const tampered = clone(exported) as BackupDocument;
    tampered.tables.unit = [];

    const error = await importDatabase(ADMIN, tampered, { mode: 'replace' }).catch((e: unknown) => e);

    expect(isRepoError(error, REPO_ERROR.BACKUP_INVALID)).toBe(true);
    expect(snapshot(sqlite)).toEqual(before);
  });

  it('refuses to import over existing data unless replace is requested', async () => {
    const before = snapshot(sqlite);
    const exported = await exportDatabase(ADMIN, { exportedAt: '2026-09-17T12:00:00.000Z' });

    const error = await importDatabase(ADMIN, exported).catch((e: unknown) => e);

    expect(isRepoError(error, REPO_ERROR.BACKUP_CONFLICT)).toBe(true);
    expect(snapshot(sqlite)).toEqual(before);
  });

  it('rejects a document from a different schema version', async () => {
    const exported = await exportDatabase(ADMIN, { exportedAt: '2026-09-17T12:00:00.000Z' });
    const tampered = clone(exported) as BackupDocument;
    tampered.schemaVersion = 99;

    const error = await importDatabase(ADMIN, tampered, { mode: 'replace' }).catch((e: unknown) => e);

    expect(isRepoError(error, REPO_ERROR.BACKUP_INVALID)).toBe(true);
  });
});
