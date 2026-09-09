# Punto

> Simple, modern, **offline-first** point-of-sale and business management for small and medium-sized businesses — cafés, food stands, retail stores, barbershops, service businesses.
> **Simple on the surface, powerful underneath.**

All business data lives in **local SQLite** on the device. No cloud account required to use Punto; JSON import/export is the backup & portability mechanism. UI copy is i18n-ready in **Spanish (es, default) and English (en)**.

- **Product & engineering guide:** [`AGENTS.md`](./AGENTS.md) — read it before contributing. It defines the design system, UX philosophy, data conventions, and "definition of done".
- **Status:** early development. The SQLite domain schema (migration 001) models catalog, recipes, ingredients, suppliers, inventory ledger, sales/payments, expenses, and employees; screens are being built incrementally on top.

## Tech stack

| Concern | Choice |
|---|---|
| Framework | [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/) · React Native 0.86 · React 19 (React Compiler enabled) |
| Routing | [Expo Router](https://docs.expo.dev/router/introduction) (file-based, `src/app/`, typed routes) |
| Database | [`expo-sqlite`](https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/) — local, single source of truth |
| State | `zustand` for UI/session state (theme override, …) |
| i18n | `i18next` + `react-i18next`, locale detection via `expo-localization` (es-first) |
| Dates / formatting | `dayjs` + locale-aware money/number helpers |
| Native dev client | `expo-dev-client` (dev + preview binaries share native code) |
| Testing | `jest-expo` + `@testing-library/react-native` |
| Lint / types | `eslint` (`eslint-config-expo`) · TypeScript strict (`tsc --noEmit`) |

> ⚠️ Expo APIs change fast — always check the versioned docs at `https://docs.expo.dev/versions/v57.0.0/` before writing code.

## Requirements

- Node.js 20 LTS or newer
- npm
- An [Expo account](https://expo.dev) and `eas-cli` (`npx eas-cli login`) for builds
- A device/simulator: Android Studio emulator, iOS simulator, or a physical device with a **development build** installed (Expo Go works for quick tries but is limited)

## Getting started

```bash
npm install
npx expo start
```

`expo start` targets the **development variant** ("Punto Dev", scheme `puntodev`) by default so the local dev server matches the dev-client binary installed on your device. Open with:

- `a` — Android emulator · `i` — iOS simulator
- `w` — **web** (see [Web support](#web-support) — requires `metro.config.js`)
- QR code — physical device running the development build

Typical local commands:

| Command | What it does |
|---|---|
| `npm start` | Start the dev server (`expo start`) |
| `npm run android` / `npm run ios` | Start and open on a simulator/emulator |
| `npm run web` | Start and open in the browser |
| `npm run typecheck` | `tsc --noEmit` (strict) |
| `npm run lint` | `expo lint` |
| `npm test` / `npm run test:watch` | Jest suite |

## Build variants (dev + preview + production)

Development **and** preview builds are meant to be installed **side by side on the same device**. Each build track therefore gets its own native identity, derived from the EAS build profile in [`app.config.ts`](./app.config.ts):

| Profile (`EAS_BUILD_PROFILE`) | App name | Android package | iOS bundle id | Scheme |
|---|---|---|---|---|
| `development` | Punto Dev | `com.javiercaz.punto.dev` | `com.javiercaz.punto.dev` | `puntodev` |
| `preview` | Punto Preview | `com.javiercaz.punto.preview` | `com.javiercaz.punto.preview` | `puntopreview` |
| `production` | Punto | `com.javiercaz.punto` | `com.javiercaz.punto` | `punto` |

- Distinct package/bundle ids are what let both apps live on one device; distinct schemes keep deep links unambiguous.
- Static config (plugins, icons, splash, web output) lives in `app.json`. Only the identity fields above are computed at config-eval time.
- No profile set (local `expo start`, `expo run:*`) → **development** variant. Override explicitly with `EAS_BUILD_PROFILE=production npx expo start` if ever needed.

### Build tracks

Track config lives in [`eas.json`](./eas.json) (`appVersionSource: "remote"` — versions auto-increment on EAS).

| Track | Profile | Build shape | Used for |
|---|---|---|---|
| **Development** | `development` | Dev client (`developmentClient: true`), internal APK, fast reload + dev menu | Daily driver: run against the local Metro server on a real device/emulator |
| **Preview** | `preview` | Near-production release binary (minified JS, no dev launcher), internal APK | QA / demos — must exercise real tablet split-view and dark mode |
| **Production** | `production` | Store release (AAB / archive), version auto-incremented | App Store / Play Store |

```bash
# Development (dev client)
npm run build:dev            # both platforms
npm run build:dev:android    # or per platform
npm run build:dev:ios

# Preview (internal release)
npm run build:preview
npm run build:preview:android
npm run build:preview:ios

# Production (store)
npm run build:android
npm run build:ios
npm run build:all
```

EAS manages signing credentials automatically (Android keystore; iOS uses your Apple account — first build of each variant prompts for setup). Builds are downloaded from the EAS dashboard / CLI; dev & preview produce APKs you can install directly.

## Web support

Web runs via `react-native-web` with **static rendering** (`web.output: "static"`).

`expo-sqlite` web support is in **alpha** (wa-sqlite engine in a web worker). To make it bundle, [`metro.config.js`](./metro.config.js) **must stay in the repo** — it registers `.wasm` as a Metro asset and adds `COEP`/`COOP` headers on the dev server (required for `SharedArrayBuffer`). Without it, web bundling fails (`Worker chunk not found … expo-sqlite/web/worker.ts`).

- If Metro is running when you add/change `metro.config.js`, **restart** it (`npx expo start --clear`) — config is only read at startup.
- **Deploying to a web host:** the COEP/COOP headers must also be served by the host (on EAS Hosting, via the `expo-router` plugin `headers` config) or SQLite fails at runtime.
- **Data note:** on web the database lives in the browser's origin-private file system — a fresh, empty, per-origin database. It is not the same data as your device's native SQLite.

## Project structure

```
src/
├── app/            # expo-router routes (file-based). _layout.tsx boots i18n,
│   │               #   the DB (schema + migrations) and theme before first paint
│   ├── index.tsx   # Home tab
│   └── explore.tsx # Explore tab (placeholder)
├── components/     # Small reusable components (+ .web.tsx platform variants)
├── constants/      # Design tokens: theme.ts (colors, typography, spacing, radius)
├── db/             # SQLite layer
│   ├── client.ts   #   getDb() singleton; opens DB + runs migrations
│   ├── migrations/ #   append-only, immutable, PRAGMA user_version-keyed
│   ├── types.ts
│   └── index.ts    #   public barrel — import data access from '@/db'
├── hooks/          # use-db-bootstrap, use-theme, use-color-scheme (+ .web)
├── i18n/           # i18next bootstrap + locales (es first, en), format helpers
├── lib/            # dayjs setup (locale-aware)
└── theme/          # theme-store.ts — persisted light/dark/system override
```

## Architecture & conventions

From AGENTS.md §6, §9 — honor these on every change:

- **Offline-first:** `expo-sqlite` is the source of truth; `getDb()` (module singleton in `src/db/client.ts`) opens the DB and runs pending migrations before the UI renders. No network, no remote sync; JSON export/import is the only portability mechanism.
- **Money** is `INTEGER` minor units (cents) — never floats. Tax rates are integer basis points (`_bp`, e.g. `1600` = 16.00%).
- **Quantities** are `INTEGER × 1000` milli-units of the row's unit (0.5 g = `500`). Formatting goes through `@/i18n/format` helpers — the only place these become display strings.
- **Timestamps** are ISO-8601 UTC `TEXT`.
- **Deletes:** soft-delete via `archived_at` for catalog/suppliers/employees; ledger/history rows are never hard-deleted.
- **Inventory:** `inventory_movement` is the single stock ledger (INITIAL_STOCK / PURCHASE / SALE / WASTE / ADJUSTMENT / RETURN); refunds post RETURN movements that invert the SALE.
- **i18n:** every user-facing string goes through `t()` (`es` canonical, `en` key-parity-checked). Money/dates format per the business locale.
- **Theming:** tokens only — never ad-hoc hex colors in screens. Light/dark follows the system with an in-app override (`theme-store`, persisted via `expo-sqlite/kv-store`).
- **Code:** TypeScript strict, no `any` / `@ts-ignore`; path alias `@/` → `src/`.

## Testing

First-class, pyramid-shaped, fast and offline (see AGENTS.md §9.4):

- Unit tests for pure logic (money/quantity math, i18n, migrations).
- Component tests with `@testing-library/react-native`.
- No real SQLite in unit tests — native modules (`expo-sqlite`, `expo-image`, …) are mocked; `jest.config.js` mirrors the sibling app's `transformIgnorePatterns`.

```bash
npm test          # full suite (jest)
npm run lint      # eslint (eslint-config-expo)
npm run typecheck # tsc --noEmit
```

Definition of done: unit/component tests added or updated, `lint` clean, full `test` suite green, light+dark mode and es+en checked.

## Resources

- [Expo SDK 57 docs](https://docs.expo.dev/versions/v57.0.0/) · [Expo Router](https://docs.expo.dev/router/introduction) · [expo-sqlite](https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/) · [EAS Build](https://docs.expo.dev/build/introduction/) · [expo-dev-client](https://docs.expo.dev/develop/development-builds/introduction/)
