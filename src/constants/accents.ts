/**
 * §7.2 accent vocabulary — the canonical, ordered list of business accents.
 *
 * Shared by the design tokens (`@/constants/theme`) and the data layer
 * (`@/db/repositories/business`, whose migration-001 CHECK constraint accepts
 * exactly these values), so the palette keys and the persisted values cannot
 * drift apart.
 *
 * Ordered for the settings picker: the §7.1 default ("royal") first, then the
 * business-selectable accents. Keeping `royal` selectable means a business can
 * always revert to the Punto default.
 */

export const ACCENTS = ['royal', 'emerald', 'indigo', 'amber', 'slate', 'rose'] as const;

export type Accent = (typeof ACCENTS)[number];

/** §7.1/§7.2 default brand accent (Punto royal blue). */
export const DEFAULT_ACCENT: Accent = 'royal';

/** Runtime guard for accent values crossing the SQLite boundary. */
export function isAccent(value: unknown): value is Accent {
  return typeof value === 'string' && (ACCENTS as readonly string[]).includes(value);
}
