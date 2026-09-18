# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# Punto — Product & Engineering Guide

> Product: Punto
> Platform: Mobile + Tablet (iOS, Android; Web for preview)
> Architecture: Offline-first, local SQLite
> Product category: POS + Inventory + Business Operations
> Primary audience: Small and medium-sized businesses across multiple industries
> Localization: Español / English
> Data privacy: All data lives on-device by default; backup/portability via JSON import/export

---

# 1. Product Vision

Punto is a simple, modern, offline-first point-of-sale and business management application for small and medium-sized businesses.

Punto must work across different business types without feeling designed specifically for restaurants, retail stores, or any single industry.

Examples of supported businesses:

- Beverage stands
- Cafés / coffee shops
- Restaurants
- Food stands
- Retail stores
- Small shops
- Service businesses
- Barbershops
- Salons
- Other small/medium businesses

The product must feel:

- Simple
- Clear
- Practical
- Reliable
- Modern
- Human
- Professional without being corporate

Core product principle:

> Simple on the surface, powerful underneath.

The user should not need accounting, inventory, or business-management expertise to operate Punto.

---

# 2. Who Uses Punto

Design for the full range between a very small shop and a growing restaurant. The same screens must feel right for both.

**Small example — Matcha street coffee shop**
- 2 employees
- Menu of ~3 drinks (e.g. matcha latte, iced matcha, hojicha latte)
- Needs: fast charge flow, daily earnings, recipe-based stock of ingredients (matcha, milk), no complex inventory

**Medium example — Small restaurant**
- ~6 employees
- Sells hamburgers, hot dogs, sandwiches, chips, sodas, fries
- Buys ingredients from suppliers
- Needs: full catalog, recipes that consume stock, supplier purchases, stock control, low-stock alerts, income/expense tracking, multiple payment types

Both must be served without configuration heavy-forms or industry-specific terminology baked into the UI.

---

# 3. What Punto Must Manage

## 3.1 Core domains

- **Business profile** — name, logo image, main/brand color, currency, locale. Owned by the business owner, not hard-coded.
- **Catalog** — categories and products with prices, images, and the option to track stock per product or not.
- **Recipes** — a menu item (e.g. a matcha latte or hamburger) is composed of ingredients with quantities. Selling the item deducts ingredients.
- **Ingredients** — stockable raw materials with units of measure (g, ml, unit) and optionally tied to a supplier.
- **Suppliers** — who the business buys ingredients/products from, for purchase tracking.
- **Stock / Inventory** — current quantities, low-stock warnings, stock adjustments, and a movement history (in/out) for every item.
- **Sales (POS)** — find product, add to cart, review, charge, confirm. Orders can be held or refunded.
- **Payments** — cash (efectivo), card (tarjeta), transfer (transferencia); a sale may mix methods (split payment). Support amounts given / change for cash.
- **Income & outcome** — track earnings from sales plus expenses and supplier purchases (money going out) so owners understand real business health.
- **Earnings / Dashboard** — understand today's business, spot problems, take action.
- **Employees** — light-touch staff records (who made a sale) suitable for 2–6 person teams.

## 3.2 Customization & white-label

Every business is different, so Punto must be customizable at the business level:

- Business **name** and **logo image** (shown in headers, receipts)
- Business **primary accent color** (recolors brand-tinted UI, see §7.2)
- **Product naming**: terminology must not be hard-coded per industry — the same product list covers drinks, food, retail items, and services
- Configurable labels where useful (e.g. "ingredientes"/"recetas" stay generic; products are just "productos")

Personalization must never ruin visual hierarchy or accessibility (§7 color system remains the framework the accent plugs into).

## 3.3 Data ownership & privacy

- All business data lives in **local SQLite** — no cloud account required to use Punto
- **JSON import/export** is the backup and portability mechanism (whole business data set: profile, catalog, recipes, stock, sales history)
- Offline-first: every screen works with zero connectivity; reliability indicators over heavy shadows/branding

---

# 4. Brand Personality

Punto should communicate:

1. Clarity
2. Confidence
3. Simplicity
4. Control
5. Order
6. Practicality

Punto should NOT feel:

- Corporate
- Bureaucratic
- Complicated
- Financially intimidating
- Overly technical
- Childish
- Gamified
- Restaurant-specific
- Enterprise-oriented

The visual and interaction design should communicate:

> "I understand what is happening in my business."

and:

> "I know what I need to do next."

---

# 5. UX Philosophy

## 5.1 Simple by default

Do not expose advanced functionality unless it is relevant.

Prefer:

- Progressive disclosure
- Contextual actions
- Simple defaults
- Clear labels
- Short forms
- Smart defaults

Avoid:

- Huge configuration forms
- Excessive settings
- Technical terminology
- Unnecessary confirmation dialogs
- Dense tables on mobile
- Screens full of metrics

## 5.2 Prioritize action over information

The primary question of every screen should be:

> What is the user trying to accomplish here?

For operational screens, prioritize actions.

For example:

POS:
1. Find product
2. Add product
3. Review cart
4. Charge
5. Confirm payment

Inventory:
1. See current stock
2. Identify problems (low stock / missing)
3. Adjust stock
4. Review movement history

Dashboard:
1. Understand today's business
2. Identify problems
3. Take action

## 5.3 Progressive disclosure

Do not show every possible option immediately.

Show:

- The most important information first
- Secondary information on demand
- Advanced options behind "Más opciones", menus, expandable sections, or secondary screens

Example:

Product creation should initially show:

- Name
- Image
- Category
- Price
- Inventory tracking

Advanced fields can be under:

> Opciones avanzadas
> (recipe, supplier, tax, barcode…)

---

# 6. Money, Data & Language Conventions

- **Currency & locale** come from the business profile; format prices with the device/business locale (ES / EN).
- **Monospace font** is used strictly for prices, receipt line items, and transaction IDs (§7.3).
- **Dates**: use dayjs for formatting/logic; Spanish and English date formats both required.
- **All user-facing strings must be i18n-ready** from day one (i18next + react-i18next, es + en). Never hard-code UI copy.
- **Decimal handling**: store money/quantities with cents-level precision where required; never use floating-point money math in JS.

---

# 7. Visual Design System

## 7.1 Color palette

The color system uses neutral slate tones paired with an adaptive primary color system. The base palette relies on high-contrast accessibility standards (**WCAG AAA compliant for text**).

| Token | Light Mode Value | Dark Mode Value | Usage |
|---|---|---|---|
| `color-primary-500` | `#2563EB` (Royal Blue) | `#3B82F6` | Primary action buttons, active tab states, focused inputs |
| `color-primary-100` | `#DBEAFE` | `#1E3A8A` | Selection highlights, soft badges |
| `color-neutral-0` | `#FFFFFF` | `#0F172A` | Primary background |
| `color-neutral-50` | `#F8FAFC` | `#1E293B` | Secondary background, card fill |
| `color-neutral-200` | `#E2E8F0` | `#334155` | Borders, dividers, disabled states |
| `color-neutral-600` | `#475569` | `#94A3B8` | Secondary body text, icons |
| `color-neutral-900` | `#0F172A` | `#F8FAFC` | Headings, primary body text |
| `color-success-500` | `#10B981` (Emerald) | `#10B981` | Completed payments, active status, in-stock badges |
| `color-warning-500` | `#F59E0B` (Amber) | `#F59E0B` | Low stock warnings, pending sync, held carts |
| `color-danger-500` | `#EF4444` (Red) | `#EF4444` | Refunds, deleted items, out-of-stock alerts |

## 7.2 Theme accent personalization (white-label light)

To give businesses ownership without ruining visual hierarchy, allow SMB owners to choose one primary brand accent (e.g. Emerald, Indigo, Amber, Slate, Rose) which **dynamically recolors `color-primary-*`** across primary buttons and active states.

- Accent choice is a business-profile setting, persisted locally
- All other semantic colors (`success`, `warning`, `danger`, neutrals) stay fixed so status is never ambiguous
- Text contrast must remain WCAG AAA regardless of chosen accent

## 7.3 Typography system

Utilize **native system fonts** (San Francisco on iOS, Roboto on Android) to minimize bundle size, ensure maximum rendering performance, and preserve system familiarity.

- Primary font family: System default (`System`, `-apple-system`, `Roboto`)
- Monospace font family: (`ui-monospace`, `SFMono-Regular`, `Roboto Mono`) — used strictly for prices, receipt line items, and transaction IDs

| Style | Size / Weight / Line Height | Usage |
|---|---|---|
| **Display** | 32pt / Bold / 40pt | Dashboard stats, charge amount |
| **Heading 1** | 24pt / Bold / 32pt | Screen titles |
| **Heading 2** | 18pt / SemiBold / 24pt | Card titles, modals |
| **Body 1** | 16pt / Regular / 22pt | Primary text, inputs (min touch-target readable text) |
| **Body 2** | 14pt / Regular / 18pt | Labels, captions |
| **Micro / Badge** | 12pt / Medium / 16pt | Status indicators |

## 7.4 Touch targets, radius & spacing grid

Built on a strict **8pt spacing grid** (4pt for micro-alignment).

- **Touch targets**: minimum **48×48dp** for all clickable items on mobile; **56×56dp** on POS action triggers (Charge, Add to Cart)
- **Border radius**:
  - `radius-sm`: 6px — badges, tags
  - `radius-md`: 12px — inputs, primary buttons, bottom sheet cards
  - `radius-lg`: 16px — main structural cards, modals
- **Elevation / shadows**: keep minimal to preserve a modern, flat aesthetic. Use subtle border outlines (`color-neutral-200`) instead of heavy drop shadows for offline reliability indicators and list items

---

# 8. Platform Layout & Responsiveness

The UI dynamically transitions layout behavior based on **screen class** rather than scaling elements up.

```
+-----------------------------------------------------------------------+
| MOBILE (Portrait)               TABLET (Landscape - Split View)       |
| +---------------------+         +-------------------+---------------+ |
| | Screen Content      |         | Catalog / Search  | Active Cart   | |
| |                     |         | (Grid / List)     | & Quick Checkout | |
| |                     |         |                   |               | |
| +---------------------+         |                   |               | |
| | [Nav] [Nav] [Nav]   |         +-------------------+---------------+ |
+-----------------------------------------------------------------------+
```

## 8.1 Mobile design patterns

- **Navigation**: bottom navigation bar (3–5 primary tabs: POS, Orders/Transactions, Inventory, More)
- **Checkout flow**: sequential screen flow — Catalog → Cart Summary Slide-Up → Payment Selection Sheet → Receipt Modal
- **Inputs**: use full-width bottom sheets instead of mid-screen popups for quick editing
- Full-screen flows, large touch targets, stacked content, compact cards, floating actions where appropriate

## 8.2 Tablet design patterns

- **POS uses split view**: catalog/search (grid or list) on the left, active cart + quick checkout pinned on the right — no full-screen cart navigation required
- Bottom tabs may promote to a top bar / side rail on wide screens
- Do NOT simply scale the mobile UI to tablet; keep touch targets ≥ 48dp and avoid mouse-only density

---

# 9. Architecture & Technical Direction

## 9.1 Stack baseline

This project is an **Expo SDK 57 / React Native 0.86 / React 19** app (Expo Router v57 file-based routing with typed routes; React Compiler enabled). Confirm every API against the versioned Expo docs (see top note).

### Currently installed

`expo`, `expo-router`, `expo-status-bar`, `expo-constants`, `expo-image`, `expo-linking`, `expo-splash-screen`, `expo-system-ui`, `expo-symbols`, `@expo/ui`, `react-native-gesture-handler`, `react-native-reanimated`, `react-native-worklets`, `react-native-safe-area-context`, `react-native-screens`, `react-native-web`, `react-native-svg`.

### Reference stack to adopt (proven in a sibling Expo 57 app — "anvil")

Adopt the following for the matching concern, always via `npx expo install` so versions match SDK 57:

| Concern | Package(s) |
|---|---|
| Local database | `expo-sqlite` (~57.0.x) |
| Global state | `zustand` ^5 |
| i18n (ES/EN) | `i18next` + `react-i18next`, locale detection with `expo-localization` |
| Dates | `dayjs` + `@react-native-community/datetimepicker` |
| File import/export (JSON backup) | `expo-document-picker`, `expo-file-system`, `expo-sharing`, `expo-clipboard` |
| Haptics feedback | `expo-haptics` |
| Media (product/business images) | `expo-image` (already present) + `expo-media-library` if gallery pick needed |
| Charts (dashboard, optional later) | `victory-native` |
| App metadata / device | `expo-application`, `expo-device`, `expo-constants` |
| Development client | `expo-dev-client` — enables the dev/preview build workflow below |

Dev/test tooling baseline to mirror: `typescript`, `eslint` + `eslint-config-expo`, `jest-expo` + `@testing-library/react-native`, `react-test-renderer`. Configure the jest `transformIgnorePatterns` exactly like the sibling app (cover `react-native-*`, `expo*`, `react-navigation`, `@react-navigation/*`, `react-native-svg`, `victory-native`, etc.). Standard scripts (mirror anvil): `lint`, `test`/`test:watch`, and `build:android` / `build:ios` / `build:all` EAS build scripts with `expo-version` bumping.

## 9.2 Architecture principles

- **Offline-first**: local SQLite is the source of truth. No remote sync in v1; JSON export/import covers backup & portability.
- **Routing**: file-based routes under `src/app/`; deep-linkable screens (receipt, product edit) via `expo-router`.
- **State**: zustand stores for UI/session state; persistent domain data stays in SQLite (single source of truth).
- **Theming**: light/dark derived from system (`useColorScheme`) with in-app override; tokens from §7 exposed as typed theme constants (see existing `src/constants/theme.ts`) extended with the full §7 palette.
- **Domain model**: tables/entities for `business_profile`, `categories`, `products`, `recipes`, `ingredients`, `suppliers`, `stock_movements`, `sales`/`orders`, `payments`, `expenses`, `employees` (§3.1). Schema versioned; migrations handled at SQLite open.
- **i18n**: all copy through `t()` — Spanish first (`es`), English (`en`); format money/dates via business locale.
- **Privacy**: no analytics/telemetry of business data; permissions used only for explicit user actions (file export).
## 9.3 Conventions

- TypeScript strict; no `any`/`@ts-ignore`
- Path alias `@/` → `src/`
- Small components: `src/components/`, screens under `src/app/`
- Keep existing flat, border-based visual style — borders over shadows, 8pt spacing
- Money values rendered in monospace; action buttons on POS ≥ 56dp
- Follow §7 tokens; never introduce ad-hoc hex colors in screens

## 9.4 Testing strategy

Testing is a first-class part of every feature. Follow the pyramid, keep tests fast and offline (no network, no real SQLite in unit tests unless integration-tested).

- **Unit tests** — pure business logic: money math (never float), recipe/stock calculations, i18n formatting, JSON import/export mapping/validation, state reducers.
- **Component tests** — `@testing-library/react-native`: screens and reusable components, key flows (POS add-to-cart → charge, stock adjustment, settings). Render via `t()`; assert i18n keys resolve for es and en.
- **Integration/flow tests** — zustand stores wired to a mocked/in-memory data layer; navigation flow tests for critical journeys.
- **Data layer tests** — SQLite schema/migrations and queries tested against `expo-sqlite` in a test build; JSON round-trip (export → import) preserves data.
- **Tooling** — `jest-expo` preset with the sibling `transformIgnorePatterns`; mock Expo native modules (`expo-sqlite`, `expo-image`, `expo-haptics`, file-system, etc.) where needed; `eslint` (eslint-config-expo) enforced in CI.
- **Do not** delete or weaken failing tests to make CI green — fix the underlying code.

Definition of done for every change: unit + component tests updated/added, `lint` clean, full `test` suite green on top of the §10 visual checks.

## 9.5 Development, preview & release builds

Three build tracks from the start (all via EAS + `expo-dev-client`):

1. **Development builds** (`eas build --profile development`) — dev client binary with Metro. Daily driver for feature work: fast reload, dev menu, debugging on device/simulator. Run against the local dev server.
2. **Preview builds** (`eas build --profile preview`) — near-production binary (production JS/minified, dev-client launcher kept or a clean release build per team preference) distributed via EAS Update / TestFlight / internal track. Used for QA, testers, and stakeholder demos; must exercise real tablet split-view and dark mode.
3. **Release builds** — store-ready (App Store / Play Store) builds at release time.

- Use `npx expo run:ios` / `run:android` for local dev builds; `expo-dev-client` package stays installed so both dev and preview binaries share the same native code.
- Keep EAS profiles (`development`, `preview`, `production`) and `app.json` versioning (`expo-version`) maintained in-repo; bump versions before each build.
- Anything merged should at minimum build and pass tests; preview-worthy milestones are deployed to the preview track for device verification.
- Test matrix: phone portrait (primary), tablet landscape (split-view POS, §8.2), light + dark mode, es + en locale.

---

# 10. Definition of Done (visual/product)

- Screen answers "What is the user trying to accomplish here?" with a clear next action
- Works on mobile portrait AND tablet landscape (split view where specified, §8)
- All copy i18n-ready (es/en); dark mode + light mode both checked
- Uses §7 tokens/typography/spacing; text meets WCAG AAA against its background
- Works fully offline; business data only in SQLite until user explicitly exports JSON
- Primary action per screen is reachable within thumb reach / one tap on mobile

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
