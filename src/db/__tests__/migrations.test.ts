/// <reference types="jest" />

/**
 * @jest-environment node
 *
 * Metadata tests for the migration registry. These run in the plain Node
 * environment (no React Native, no native SQLite) and verify the *shape* of
 * the migration list: ordering, versioning, and structural invariants that the
 * runner relies on. Actual schema execution against SQLite is covered by the
 * integration test suite (see AGENTS.md §9.4 — data layer tests run in a test
 * build / real SQLite, not in jest unit tests).
 */

import { LATEST_SCHEMA_VERSION, migrations } from '@/db/migrations';
import type { Migration } from '@/db/types';

describe('migration registry', () => {
  it('is non-empty and sorted by ascending unique versions starting at 1', () => {
    expect(migrations.length).toBeGreaterThan(0);

    const versions = migrations.map((m) => m.version);
    expect(versions[0]).toBe(1);
    expect(new Set(versions).size).toBe(versions.length);
    expect(versions).toEqual([...versions].sort((a, b) => a - b));

    expect(LATEST_SCHEMA_VERSION).toBe(versions[versions.length - 1]);
  });

  it('every migration has a name and at least one SQL statement', () => {
    for (const migration of migrations) {
      expect(migration.name.length).toBeGreaterThan(0);
      expect(migration.up.length).toBeGreaterThan(0);
      for (const statement of migration.up) {
        expect(typeof statement).toBe('string');
        expect(statement.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('defines every core domain table exactly once across the schema', () => {
    const sql = migrations.flatMap((m: Migration) => m.up).join('\n');

    // Tables that must exist for §3.1 core domains.
    const expectedTables = [
      'business',
      'category',
      'product',
      'recipe',
      'recipe_item',
      'inventory_item',
      'unit',
      'inventory_movement',
      'supplier',
      'supplier_item',
      'purchase',
      'purchase_item',
      'payment_method',
      'sale',
      'sale_item',
      'payment',
      'financial_category',
      'financial_transaction',
      'employee',
      'app_metadata',
    ];

    for (const table of expectedTables) {
      const count = (sql.match(new RegExp(`CREATE TABLE ${table}\\b`, 'g')) ?? []).length;
      expect(count).toBe(1);
    }
  });

  it('stores money as INTEGER minor units and quantities scaled to integers', () => {
    const sql = migrations.flatMap((m: Migration) => m.up).join('\n');

    // Money columns must never be REAL/FLOAT.
    expect(sql).not.toMatch(/(?:price|amount|total|subtotal|tax|discount|cost)_minor\s+(?:REAL|FLOAT)/i);

    // Prices, payments and totals must be INTEGER NOT NULL.
    expect(sql).toMatch(/price_minor\s+INTEGER NOT NULL/i);
    expect(sql).toMatch(/amount_minor\s+INTEGER NOT NULL/i);

    // Quantity columns are integer (milli-unit) not REAL.
    expect(sql).not.toMatch(/quantity\s+REAL/i);
    expect(sql).toMatch(/quantity\s+INTEGER NOT NULL/i);
  });

  it('models direct-stock products through the inventory_item bridge column', () => {
    const sql = migrations.flatMap((m: Migration) => m.up).join('\n');
    expect(sql).toMatch(/inventory_item_id\s+TEXT UNIQUE/);
  });

  it('supports held and refunded sales plus partial-unique archived names', () => {
    const sql = migrations.flatMap((m: Migration) => m.up).join('\n');

    expect(sql).toContain("'HELD'");
    expect(sql).toContain("'REFUNDED'");
    expect(sql).toMatch(/WHERE archived_at IS NULL/i);
  });

  it('adds employee auth columns and scoped indexes (migration 002)', () => {
    const sql = migrations.flatMap((m: Migration) => m.up).join('\n');

    expect(sql).toMatch(/ALTER TABLE employee ADD COLUMN role TEXT NOT NULL DEFAULT 'EMPLOYEE'/);
    expect(sql).toMatch(/ALTER TABLE employee ADD COLUMN username TEXT/);
    expect(sql).toMatch(/ALTER TABLE employee ADD COLUMN password_hash TEXT/);
    expect(sql).toMatch(/ALTER TABLE employee ADD COLUMN pin_hash TEXT/);
    expect(sql).toMatch(/CREATE UNIQUE INDEX uq_employee_username/);
    expect(sql).toMatch(/CHECK \(role IN \('ADMIN', 'EMPLOYEE'\)\)/);
  });

  it('adds the refund inventory-restore flag (migration 003)', () => {
    const sql = migrations.flatMap((m: Migration) => m.up).join('\n');

    expect(sql).toMatch(/ALTER TABLE sale ADD COLUMN inventory_restored INTEGER/);
    expect(sql).toMatch(/CHECK \(inventory_restored IN \(0, 1\)\)/);
  });
});
