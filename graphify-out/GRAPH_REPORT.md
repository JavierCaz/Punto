# Graph Report - punto  (2026-09-18)

## Corpus Check
- 271 files · ~204,964 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 4, .css 2)

## Summary
- 1964 nodes · 7100 edges · 92 communities (83 shown, 9 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 108 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `86758ccb`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- repositories/index.ts
- getDb
- db/index.ts
- repoError
- sales.tsx
- expenses/edit.tsx
- sale.ts
- purchase.ts
- pos.tsx
- src_i18n_index_i18n
- dependencies
- useTheme
- finish.tsx
- ThemedText
- package.json
- payment-panel.tsx
- catalog-save.ts
- supplier.ts
- pos-checkout.test.tsx
- theme.test.ts
- expo
- backup.tsx
- product.ts
- Spacing
- cart-store.ts
- backup.ts
- auth/index.ts
- business-logo.ts
- BusinessProfileEditor
- recipe.ts
- scripts
- format.ts
- validation.ts
- auth-repository.ts
- dashboard.test.tsx
- main.js
- payment.ts
- setup.test.tsx
- detail.tsx
- app-tabs.tsx
- app/_layout.tsx
- assets.d.ts
- getBusinessId
- language-store.ts
- cart-math.ts
- migrations/index.ts
- backup-roundtrip.integration.test.ts
- Domain Model & Schema
- static-server.js
- hash.ts
- loginLimiter
- unit.ts
- electron/package.json
- theme.ts
- COEP/COOP Header Injection
- reset-project.js
- Offline-First Architecture
- pbkdf2.ts
- app-metadata.ts
- theme-store.ts
- devDependencies
- getBusinessProfile
- scripts
- finance.ts
- Expo SDK 57 Stack Baseline
- ingredients.tsx
- tsconfig.json
- product-image.ts
- Color Palette & Accessibility Tokens
- react-native
- Architecture Principles
- Punto Product & Engineering Guide
- app.config.ts
- animated-icon.web.tsx
- export-web.mjs
- (tabs)/index.tsx
- Theme Accent Personalization
- Android Adaptive Icon
- Punto App Icon
- eslint.config.js
- dialog/index.ts
- metro.config.js
- i18n/index.ts
- Expo Icon Composition (Icon Composer Layer Stack)
- transaction.test.ts
- Punto Splash Icon
- Expo Logo Image
- Punto Favicon
- Brand Glow Backdrop Asset

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 158 edges
2. `getDb()` - 93 edges
3. `getBusinessId()` - 93 edges
4. `react-native` - 84 edges
5. `repoError` - 76 edges
6. `withTransaction()` - 74 edges
7. `Spacing` - 70 edges
8. `ThemedText()` - 67 edges
9. `react` - 65 edges
10. `react-i18next` - 63 edges

## Surprising Connections (you probably didn't know these)
- `Web Support (static rendering)` --semantically_similar_to--> `Punto Desktop (Electron shell)`  [INFERRED] [semantically similar]
  README.md → electron/README.md
- `Punto Tech Stack Table` --references--> `Expo SDK 57 Stack Baseline`  [EXTRACTED]
  README.md → AGENTS.md
- `getDb() Singleton & Migrations` --implements--> `Local SQLite Source of Truth`  [INFERRED]
  README.md → AGENTS.md
- `Offline-First (README)` --references--> `Offline-First Architecture`  [EXTRACTED]
  README.md → AGENTS.md
- `theme-store (persisted light/dark override)` --implements--> `Theme Accent Personalization`  [INFERRED]
  README.md → AGENTS.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Punto Core Business Domains** — agents_business_profile, agents_catalog, agents_recipes, agents_ingredients, agents_suppliers, agents_inventory, agents_sales_pos, agents_payments, agents_income_outcome, agents_dashboard, agents_employees [EXTRACTED 1.00]
- **Build & Distribution Tracks** — agents_build_tracks, readme_build_variants, readme_web_support, electron_readme_punto_desktop, electron_readme_web_export, electron_electron_builder_targets [INFERRED 0.75]
- **Expo Icon Layer Stack (Symbol + Grid Guide)** — assets_expo_icon_assets_expo_symbol_2_expo_symbol, assets_expo_icon_assets_grid_grid, assets_expo_icon_assets_expo_symbol_2_expo_icon_composition [INFERRED 0.85]
- **Offline-First Data Layer** — agents_offline_first, agents_local_sqlite, agents_json_import_export, readme_sqlite, readme_json_export, electron_readme_opfs, electron_readme_sqlite_concurrency [INFERRED 0.85]
- **Punto Icon Visual Composition** — assets_images_icon_chevron_glyph, assets_images_icon_blue_gradient_background, assets_images_icon_grid_pattern [INFERRED 0.85]
- **Android Adaptive Icon Layer Set** — assets_images_android_icon_background, assets_images_android_icon_foreground, assets_images_android_icon_monochrome [INFERRED 0.95]

## Communities (92 total, 9 thin omitted)

### Community 0 - "repositories/index.ts"
Cohesion: 0.08
Nodes (48): PeriodTotals, TopProduct, assertSufficientStock(), computeChangeMinor(), computeIngredientCostMinor(), computeLineSubtotalMinor(), computeRecipeConsumptionMilli(), computeRecipeCostMinor() (+40 more)

### Community 1 - "getDb"
Cohesion: 0.11
Nodes (36): ADMIN_ROW, EMPLOYEE_ROW, DATABASE_NAME, getDb(), resetDbForTesting(), resetBusinessIdForTesting(), RunResult, isRepoError() (+28 more)

### Community 2 - "db/index.ts"
Cohesion: 0.09
Nodes (39): CategoriesScreen(), styles, styles, ProductForm(), ProductFormProps, styles, ProductImageError, category (+31 more)

### Community 3 - "repoError"
Cohesion: 0.17
Nodes (40): archiveCategoryWithTxn(), nowIso(), mapSqliteError(), repoError, createFinancialTransactionWithTxn(), newId(), archiveInventoryItemWithTxn(), adjustQuantityWithTxn() (+32 more)

### Community 4 - "sales.tsx"
Cohesion: 0.08
Nodes (26): DATE_FILTERS, DateRangeFilter, FilterChip(), STATUS_LABEL_KEY, styles, ErrorKey, FormErrors, styles (+18 more)

### Community 5 - "expenses/edit.tsx"
Cohesion: 0.11
Nodes (24): ExpenseEditScreen(), load(), styles, mockBack, mockCreateTransaction, mockEnsureCategories, mockGetProfile, mockListCategories (+16 more)

### Community 6 - "sale.ts"
Cohesion: 0.12
Nodes (37): ACCENT_COLORS, AccentColor, BusinessProfile, BusinessProfilePatch, BusinessRow, isAccentColor(), isLocaleCode(), LOCALE_CODES (+29 more)

### Community 7 - "purchase.ts"
Cohesion: 0.11
Nodes (32): RFC-4122, SaleRange, listFinancialTransactions(), InventoryMovement, listMovements(), mapInventoryMovementRow(), MovementFilter, toInventoryMovement() (+24 more)

### Community 8 - "pos.tsx"
Cohesion: 0.11
Nodes (38): expo-router, ref_expo_vector_icons_materialcommunityicons, react, react-native-safe-area-context, styles, styles, styles, ProductsScreen() (+30 more)

### Community 9 - "src_i18n_index_i18n"
Cohesion: 0.09
Nodes (16): @testing-library/react-native, mockCompleteOnboarding, mockPickBusinessLogo, mockReplace, Queries, mockCatalog, mockHeaderOptions, dailyMonth (+8 more)

### Community 10 - "dependencies"
Cohesion: 0.04
Nodes (45): dependencies, dayjs, expo, expo-clipboard, expo-constants, expo-crypto, expo-dev-client, expo-device (+37 more)

### Community 11 - "useTheme"
Cohesion: 0.06
Nodes (40): CategoriesLayout(), ExpensesScreen(), ExpensesLayout(), IngredientsLayout(), InventoryLayout(), ProductsLayout(), PurchasesLayout(), ReceiptLayout() (+32 more)

### Community 12 - "finish.tsx"
Cohesion: 0.13
Nodes (14): EMPTY_COUNTS, SetupCounts, styles, styles, WizardProgress(), WizardProgressProps, styles, WizardStep() (+6 more)

### Community 13 - "ThemedText"
Cohesion: 0.11
Nodes (20): expo-image, ErrorField, ErrorMessageKey, INITIAL_CURRENCY, OnboardingError, OnboardingStep, styles, BusinessLogoError (+12 more)

### Community 14 - "package.json"
Cohesion: 0.05
Nodes (38): main, name, private, version, eslint, eslint-config-expo, expo, expo-clipboard (+30 more)

### Community 15 - "payment-panel.tsx"
Cohesion: 0.16
Nodes (13): MaterialIconName, ListRow(), ListRowProps, styles, OptionRow(), OptionRowProps, METHOD_ICONS, PaymentPanelProps (+5 more)

### Community 16 - "catalog-save.ts"
Cohesion: 0.10
Nodes (31): src_db_index_createinventoryitemwithstock, src_db_index_createproductwithstock, src_db_index_deletesupplieritem, src_db_index_setrecipeactive, src_db_index_updateinventoryitem, src_db_index_updateproduct, src_db_index_upsertrecipe, src_db_index_upsertsupplieritem (+23 more)

### Community 17 - "supplier.ts"
Cohesion: 0.27
Nodes (13): SupplierEditScreen(), load(), archiveSupplier(), createSupplier(), CreateSupplierInput, createSupplierWithTxn(), getSupplierById(), mapSupplierRow() (+5 more)

### Community 18 - "pos-checkout.test.tsx"
Cohesion: 0.07
Nodes (24): cash, completedSale, heldDetail, heldSale, mockCatalog, mockCheckoutSale, mockCreateHeldSale, mockEnsureMethods (+16 more)

### Community 19 - "theme.test.ts"
Cohesion: 0.09
Nodes (28): mockGetBusinessProfile, mockUpdateBusinessProfile, profile, Accent, ACCENTS, DEFAULT_ACCENT, isAccent(), src_constants_theme_accent (+20 more)

### Community 20 - "expo"
Cohesion: 0.07
Nodes (28): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, predictiveBackGestureEnabled, projectId, reactCompiler (+20 more)

### Community 21 - "backup.tsx"
Cohesion: 0.12
Nodes (30): BackupScreen(), load(), formatValidationErrors(), styles, mockReplace, mockResetToOnboarding, mockSignOut, src_db_index_clearalldata (+22 more)

### Community 22 - "product.ts"
Cohesion: 0.14
Nodes (24): CategoryRow, createCategory(), CreateCategoryInput, createCategoryWithTxn(), getCategoryById(), mapCategoryRow(), toCategory(), updateCategory() (+16 more)

### Community 23 - "Spacing"
Cohesion: 0.11
Nodes (26): react-i18next, styles, styles, styles, styles, CategoryForm(), SectionHeader(), SectionHeaderProps (+18 more)

### Community 24 - "cart-store.ts"
Cohesion: 0.07
Nodes (37): fullName(), PosScreen(), cash, completedSale, mockBack, mockGetSaleById, mockListPaymentMethods, mockRefundSale (+29 more)

### Community 25 - "backup.ts"
Cohesion: 0.07
Nodes (46): makeDocument(), BackupImportResult, ExportDatabaseOptions, formatValidationErrors(), ImportDatabaseOptions, ImportMode, insertAllRows(), normalizeRow() (+38 more)

### Community 26 - "auth/index.ts"
Cohesion: 0.14
Nodes (25): DashboardScreen(), businessExists(), onboardBusiness(), AUTH_PHASES, AuthStoreState, isAuthPhase(), OnboardingOutcome, resolveAuthPhase() (+17 more)

### Community 27 - "business-logo.ts"
Cohesion: 0.17
Nodes (11): expo-file-system, expo-image-picker, BusinessLogoPicker(), handlePick(), BusinessLogoPickResult, deriveImageExtension(), fileExtension(), pickBusinessLogo() (+3 more)

### Community 28 - "BusinessProfileEditor"
Cohesion: 0.31
Nodes (9): BusinessProfileEditor(), handleSave(), load(), CURRENCY_CODES, DEFAULT_CURRENCY, isCurrencyCode(), NOTE: this is a PRODUCT/UI choice, not a schema constraint. The `business`, resolveDefaultCurrency() (+1 more)

### Community 29 - "recipe.ts"
Cohesion: 0.23
Nodes (17): getRecipeByProductId(), listRecipes(), mapRecipeItemRow(), mapRecipeItems(), mapRecipeRow(), Recipe, RecipeItem, RecipeItemRow (+9 more)

### Community 30 - "scripts"
Cohesion: 0.08
Nodes (24): scripts, android, build:all, build:android, build:dev, build:dev:android, build:dev:ios, build:ios (+16 more)

### Community 31 - "format.ts"
Cohesion: 0.11
Nodes (23): BannerKey, ReceiptView(), ReceiptViewProps, resolveBanner(), STATUS_BANNER, STATUS_LABEL_KEY, STATUS_TONE, StatusLabelKey (+15 more)

### Community 32 - "validation.ts"
Cohesion: 0.14
Nodes (19): LoginScreen(), OnboardingScreen(), handleSubmit(), AddEmployeeScreen(), EditEmployeeScreen(), resolveAuthKind(), isAuthRole(), normalizeUsername() (+11 more)

### Community 33 - "auth-repository.ts"
Cohesion: 0.16
Nodes (19): TeamScreen(), mockBack, mockFind, mockUpdate, archiveEmployee(), BusinessRow, createEmployee(), EmployeeRow (+11 more)

### Community 34 - "dashboard.test.tsx"
Cohesion: 0.05
Nodes (65): dayjs, ref_dayjs_locale_en, ref_dayjs_locale_es, SalesScreen(), mockCompletedSales, mockCompletedTotals, mockExpireHeld, mockFinancialTotals (+57 more)

### Community 35 - "main.js"
Cohesion: 0.15
Nodes (18): ALLOWED_PERMISSIONS, { app, BrowserWindow, dialog, session, shell }, bootstrap(), configurePermissions(), createWindow(), fs, gotTheLock, installCrossOriginIsolationHeaders() (+10 more)

### Community 36 - "payment.ts"
Cohesion: 0.16
Nodes (17): PaymentPanel(), withoutKey(), card, cash, src_db_index_moneyminor, src_db_index_paymentmethod, PaymentMethod, buildPaymentInputs() (+9 more)

### Community 37 - "setup.test.tsx"
Cohesion: 0.10
Nodes (19): mockArchiveSupplier, mockBack, mockCompleteSetup, mockCreateSupplier, mockGetBusinessProfile, mockGetRecipeByProductId, mockListCategories, mockListInventoryItems (+11 more)

### Community 38 - "detail.tsx"
Cohesion: 0.07
Nodes (43): IngredientsScreen(), formatSignedQuantity(), InventoryDetailScreen(), load(), resolveSupplierForItem(), styles, InventoryScreen(), currentItems (+35 more)

### Community 39 - "app-tabs.tsx"
Cohesion: 0.29
Nodes (5): ref_expo_router_unstable_native_tabs, AppTabs(), TAB_LABEL_KEY, TabIconName, TABS

### Community 40 - "app/_layout.tsx"
Cohesion: 0.15
Nodes (14): expo-splash-screen, expo-status-bar, react-native-worklets, RootLayout(), hydrateStores(), AnimatedSplashOverlay(), glowKeyframe, keyframe (+6 more)

### Community 42 - "getBusinessId"
Cohesion: 0.10
Nodes (42): getBusinessId(), createInventoryItemWithStock(), createProductWithStock(), archiveCategory(), createFinancialTransaction(), archiveInventoryItem(), createInventoryItem(), createInventoryItemWithTxn() (+34 more)

### Community 43 - "language-store.ts"
Cohesion: 0.31
Nodes (8): ref_expo_sqlite_kv_store, SupportedLanguage, isSupportedLanguage(), LANGUAGE_STORAGE_KEY, LanguageStoreState, SUPPORTED_LANGUAGES, useLanguageStore, mockMemory

### Community 44 - "cart-math.ts"
Cohesion: 0.29
Nodes (9): src_db_index_quantitymilli, src_db_index_saleitem, src_db_index_saleiteminput, SaleItem, cartItemCount(), cartLineSubtotalMinor(), cartLineToSaleItemInput(), cartSubtotalMinor() (+1 more)

### Community 45 - "migrations/index.ts"
Cohesion: 0.17
Nodes (12): Database, init(), runMigrations(), migration001InitialSchema, migration002Auth, migration003SaleInventoryRestored, LATEST_SCHEMA_VERSION, migrations (+4 more)

### Community 46 - "backup-roundtrip.integration.test.ts"
Cohesion: 0.21
Nodes (8): buildSchema(), createAdapter(), Row, SEED, snapshot(), SqliteDb, SqliteModule, SqliteStatement

### Community 47 - "Domain Model & Schema"
Cohesion: 0.21
Nodes (15): Catalog Domain, Earnings / Dashboard, Domain Model & Schema, Employees Domain, Income & Outcome Tracking, Ingredients Domain, Stock / Inventory Domain, Payments Domain (split payment) (+7 more)

### Community 48 - "static-server.js"
Cohesion: 0.18
Nodes (12): createStaticServer(), fs, fsp, getContentType(), http, isLoopbackHost(), MIME_TYPES, path (+4 more)

### Community 49 - "hash.ts"
Cohesion: 0.31
Nodes (12): expo-crypto, signIn(), constantTimeEqualHex(), deriveKey(), generateSalt(), HashOptions, hashSecret(), isHex() (+4 more)

### Community 50 - "loginLimiter"
Cohesion: 0.18
Nodes (5): DEFAULT_LOCKOUT, LockoutConfig, LockoutState, loginLimiter, NowFn

### Community 51 - "unit.ts"
Cohesion: 0.30
Nodes (13): UnitType, createUnit(), CreateUnitInput, createUnitWithTxn(), DEFAULT_UNITS, getUnitById(), isUnitType(), mapUnitRow() (+5 more)

### Community 52 - "electron/package.json"
Cohesion: 0.15
Nodes (12): author, description, devDependencies, electron, electron-builder, license, main, name (+4 more)

### Community 53 - "theme.ts"
Cohesion: 0.08
Nodes (33): CredentialKind, LoginErrorKey, LoginStep, styles, styles, AccentOptions(), AccentOptionsProps, styles (+25 more)

### Community 54 - "COEP/COOP Header Injection"
Cohesion: 0.23
Nodes (12): electron-builder Configuration, extraResources dist/ Copy, NSIS / AppImage / DMG Targets, COEP/COOP Header Injection, Cross-Origin Isolation Assertion, Loopback HTTP Server for dist/, main.js (Electron main process), Punto Desktop (Electron shell) (+4 more)

### Community 55 - "reset-project.js"
Cohesion: 0.17
Nodes (10): ref_fs, ref_path, ref_readline, exampleDirPath, fs, oldDirs, path, readline (+2 more)

### Community 56 - "Offline-First Architecture"
Cohesion: 0.25
Nodes (11): JSON Import/Export Backup, Local SQLite Source of Truth, Offline-First Architecture, OPFS Origin-Private SQLite Database, Origin (host+port) Persistence, expo-sqlite Web Concurrency Sensitivity, getDb() Singleton & Migrations, JSON Export/Import Portability (+3 more)

### Community 57 - "pbkdf2.ts"
Cohesion: 0.18
Nodes (10): ref_noble_hashes_pbkdf2_js, ref_noble_hashes_sha2_js, ref_noble_hashes_utils_js, react-native-quick-crypto, PBKDF2_DK_BYTES, PBKDF2_DK_BYTES, noblePbkdf2Hex(), PBKDF2_DK_BYTES (+2 more)

### Community 58 - "app-metadata.ts"
Cohesion: 0.38
Nodes (9): getMetadata(), getSetupCompleted(), nextDocumentNumber(), nextPurchaseNumber(), nextSaleNumber(), setMetadata(), setSetupCompleted(), mockDb (+1 more)

### Community 59 - "theme-store.ts"
Cohesion: 0.31
Nodes (9): mockMemory, ColorScheme, isThemeMode(), resolveEffectiveScheme(), THEME_MODE_STORAGE_KEY, THEME_MODES, ThemeMode, ThemeStoreState (+1 more)

### Community 60 - "devDependencies"
Cohesion: 0.20
Nodes (10): devDependencies, eslint, eslint-config-expo, jest, jest-expo, react-test-renderer, @testing-library/react-native, @types/jest (+2 more)

### Community 61 - "getBusinessProfile"
Cohesion: 0.17
Nodes (28): CategoryEditScreen(), load(), InventoryItemEditScreen(), load(), ProductEditScreen(), load(), PurchaseEditScreen(), load() (+20 more)

### Community 62 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, dev, dist, dist:linux, dist:mac, dist:win, export:web, pack (+1 more)

### Community 63 - "finance.ts"
Cohesion: 0.17
Nodes (20): createFinancialCategory(), CreateFinancialCategoryInput, createFinancialCategoryWithTxn(), DEFAULT_FINANCIAL_CATEGORIES, DefaultFinancialCategoryLanguage, ensureDefaultFinancialCategories(), FinancialCategoryRow, FinancialTransaction (+12 more)

### Community 64 - "Expo SDK 57 Stack Baseline"
Cohesion: 0.25
Nodes (8): Anvil (sibling Expo 57 app), Dev / Preview / Release Build Tracks, Expo Router (file-based), Expo SDK 57, Expo SDK 57 Stack Baseline, Testing Strategy (pyramid), Build Variants & EAS Profiles, Testing Setup (jest-expo)

### Community 65 - "ingredients.tsx"
Cohesion: 0.10
Nodes (29): styles, styles, InventoryItemForm(), InventoryItemFormProps, InventoryItemFormValues, styles, PurchaseForm(), suppliers (+21 more)

### Community 66 - "tsconfig.json"
Cohesion: 0.25
Nodes (7): expo/tsconfig.base, compilerOptions, paths, strict, extends, include, @/assets/*

### Community 68 - "product-image.ts"
Cohesion: 0.43
Nodes (6): ProductImagePicker(), handlePick(), deriveProductImageExtension(), fileExtension(), pickProductImage(), ProductImagePickResult

### Community 69 - "Color Palette & Accessibility Tokens"
Cohesion: 0.29
Nodes (7): Color Palette & Accessibility Tokens, Definition of Done, Mobile Design Patterns, Platform Layout & Responsiveness, 8pt Spacing Grid & Touch Targets, Tablet Split-View POS, Typography System (native + monospace)

### Community 70 - "react-native"
Cohesion: 0.09
Nodes (24): ref_expo_router_ui, react-native, styles, styles, styles, ErrorKey, FormErrors, styles (+16 more)

### Community 71 - "Architecture Principles"
Cohesion: 0.33
Nodes (6): Architecture Principles, i18n (es + en) Convention, Money, Data & Language Conventions, Zustand Global State, i18n Bootstrap (es canonical), Money as INTEGER Minor Units

### Community 72 - "Punto Product & Engineering Guide"
Cohesion: 0.33
Nodes (6): Brand Personality, Punto Product Vision, Punto Product & Engineering Guide, CLAUDE.md @AGENTS.md Include, Punto README, Punto Tech Stack Table

### Community 74 - "animated-icon.web.tsx"
Cohesion: 0.22
Nodes (6): react-native-reanimated, src_components_animated_icon_module, glowKeyframe, keyframe, logoKeyframe, styles

### Community 75 - "export-web.mjs"
Cohesion: 0.33
Nodes (5): projectRoot, result, ref_node_child_process, ref_node_path, ref_node_url

### Community 76 - "(tabs)/index.tsx"
Cohesion: 0.11
Nodes (18): ref_canvaskit_wasm_bin_full_canvaskit_wasm, ref_shopify_react_native_skia_lib_module_web, victory-native, IncomeTrendChart, PERIOD_LABEL_KEY, PeriodChip(), styles, TopProductsChart (+10 more)

### Community 78 - "Theme Accent Personalization"
Cohesion: 0.50
Nodes (5): Business Profile Domain, Theme Accent Personalization, Customization & White-Label, theme-store (persisted light/dark override), Theming via Design Tokens

### Community 79 - "Android Adaptive Icon"
Cohesion: 0.60
Nodes (5): Android Adaptive Icon Background Layer, Android Adaptive Icon, Android Adaptive Icon Foreground Mark, Adaptive Icon Layer Separation Design, Android Adaptive Icon Monochrome Layer

### Community 80 - "Punto App Icon"
Cohesion: 0.60
Nodes (5): Blue Radial Gradient Background, Punto Brand Identity, Chevron / Upward Caret Glyph, Subtle Crosshair Grid Pattern, Punto App Icon

### Community 81 - "eslint.config.js"
Cohesion: 0.40
Nodes (4): { defineConfig }, expoConfig, ref_eslint_config, ref_eslint_config_expo_flat

### Community 84 - "dialog/index.ts"
Cohesion: 0.26
Nodes (10): zustand, DialogTone, DialogHost(), ConfirmDialogOptions, ConfirmDialogToggle, DialogRequest, DialogStoreState, dismissDialog() (+2 more)

### Community 85 - "metro.config.js"
Cohesion: 0.50
Nodes (3): config, { getDefaultConfig }, ref_expo_metro_config

### Community 86 - "i18n/index.ts"
Cohesion: 0.15
Nodes (15): i18next, LanguageSwitch(), selectLanguage(), styles, DEFAULT_LANGUAGE, detectLanguage(), resolveLanguage(), SUPPORTED_LANGUAGES (+7 more)

### Community 87 - "Expo Icon Composition (Icon Composer Layer Stack)"
Cohesion: 1.00
Nodes (3): Expo Icon Composition (Icon Composer Layer Stack), Expo Symbol (White Chevron Mark), Icon Grid Overlay (Transparent 1024x1024)

### Community 89 - "Punto Splash Icon"
Cohesion: 1.00
Nodes (3): Punto Splash Icon, Punto Brand Mark (Splash), App Splash Screen Identity

## Ambiguous Edges - Review These
- `Punto Brand Mark (Splash)` → `Punto Splash Icon`  [AMBIGUOUS]
  assets/images/splash-icon.png · relation: conceptually_related_to

## Knowledge Gaps
- **640 isolated node(s):** `AppVariant`, `name`, `slug`, `version`, `orientation` (+635 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 770 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Punto Brand Mark (Splash)` and `Punto Splash Icon`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `useTheme()` connect `useTheme` to `db/index.ts`, `sales.tsx`, `expenses/edit.tsx`, `pos.tsx`, `finish.tsx`, `ThemedText`, `payment-panel.tsx`, `supplier.ts`, `theme.test.ts`, `backup.tsx`, `Spacing`, `cart-store.ts`, `auth/index.ts`, `business-logo.ts`, `BusinessProfileEditor`, `format.ts`, `validation.ts`, `auth-repository.ts`, `dashboard.test.tsx`, `payment.ts`, `detail.tsx`, `app-tabs.tsx`, `app/_layout.tsx`, `theme.ts`, `getBusinessProfile`, `ingredients.tsx`, `product-image.ts`, `react-native`, `(tabs)/index.tsx`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Why does `react-native` connect `react-native` to `db/index.ts`, `sales.tsx`, `expenses/edit.tsx`, `pos.tsx`, `src_i18n_index_i18n`, `useTheme`, `finish.tsx`, `ThemedText`, `package.json`, `payment-panel.tsx`, `backup.tsx`, `Spacing`, `business-logo.ts`, `format.ts`, `detail.tsx`, `app/_layout.tsx`, `theme.ts`, `ingredients.tsx`, `product-image.ts`, `animated-icon.web.tsx`, `(tabs)/index.tsx`, `i18n/index.ts`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **What connects `AppVariant`, `name`, `slug` to the rest of the system?**
  _640 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `repositories/index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08295625942684766 - nodes in this community are weakly interconnected._
- **Should `getDb` be split into smaller, more focused modules?**
  _Cohesion score 0.10752688172043011 - nodes in this community are weakly interconnected._