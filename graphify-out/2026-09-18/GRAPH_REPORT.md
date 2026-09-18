# Graph Report - punto  (2026-09-18)

## Corpus Check
- 267 files · ~203,440 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 4, .css 2)

## Summary
- 1947 nodes · 7068 edges · 89 communities (83 shown, 6 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 108 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8141b933`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- finance.ts
- getDb
- products.tsx
- repoError
- select-field.tsx
- expenses/edit.tsx
- category.ts
- theme.ts
- db/index.ts
- i18n/index.ts
- dependencies
- useTheme
- sale.ts
- onboarding.tsx
- package.json
- use-dashboard.ts
- catalog-save.ts
- catalog-form.ts
- pos.tsx
- theme.test.ts
- expo
- backup.tsx
- getBusinessId
- react
- receipt/[id].tsx
- backup-format.ts
- auth/index.ts
- business-logo.ts
- dashboard.test.tsx
- recipe.ts
- scripts
- formatMoney
- add.tsx
- auth-repository.ts
- dashboard.ts
- main.js
- payment-panel.tsx
- setup.test.tsx
- inventory-detail.test.tsx
- income-trend-chart.tsx
- app/_layout.tsx
- sales.tsx
- backup.ts
- language-switch.tsx
- cart-math.ts
- migrations/index.ts
- backup-roundtrip.integration.test.ts
- Domain Model & Schema
- static-server.js
- hash.ts
- loginLimiter
- repositories/index.ts
- electron/package.json
- BusinessProfileEditor
- COEP/COOP Header Injection
- reset-project.js
- Offline-First Architecture
- pbkdf2.ts
- app-metadata.ts
- theme-store.ts
- devDependencies
- scripts
- Expo SDK 57 Stack Baseline
- app-tabs.tsx
- tsconfig.json
- backup.test.tsx
- product-image.ts
- Color Palette & Accessibility Tokens
- wizard.ts
- Architecture Principles
- Punto Product & Engineering Guide
- app.config.ts
- export-web.mjs
- Theme Accent Personalization
- Android Adaptive Icon
- Punto App Icon
- eslint.config.js
- dayjs.ts
- team/[id].tsx
- dialog-store.ts
- metro.config.js
- accent-store.ts
- Expo Icon Composition (Icon Composer Layer Stack)
- Punto Splash Icon
- Expo Logo Image
- Punto Favicon
- Brand Glow Backdrop Asset

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 158 edges
2. `getDb()` - 93 edges
3. `getBusinessId()` - 93 edges
4. `react-native` - 83 edges
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

## Communities (89 total, 6 thin omitted)

### Community 0 - "finance.ts"
Cohesion: 0.08
Nodes (44): CompletedSalePoint, SaleRange, CreateFinancialCategoryInput, DEFAULT_FINANCIAL_CATEGORIES, DefaultFinancialCategoryLanguage, FinancialCategoryRow, FinancialTransactionFilter, FinancialTransactionRow (+36 more)

### Community 1 - "getDb"
Cohesion: 0.08
Nodes (47): ADMIN_ROW, EMPLOYEE_ROW, DATABASE_NAME, getDb(), init(), resetDbForTesting(), runMigrations(), resetBusinessIdForTesting() (+39 more)

### Community 2 - "products.tsx"
Cohesion: 0.08
Nodes (55): styles, InventoryItemEditScreen(), load(), ProductEditScreen(), load(), styles, PurchaseEditScreen(), load() (+47 more)

### Community 3 - "repoError"
Cohesion: 0.12
Nodes (65): updateBusinessProfileWithTxn(), archiveCategoryWithTxn(), createCategoryWithTxn(), updateCategoryWithTxn(), nowIso(), mapSqliteError(), repoError, createFinancialCategoryWithTxn() (+57 more)

### Community 4 - "select-field.tsx"
Cohesion: 0.17
Nodes (10): react-native-safe-area-context, ListRow(), OptionRow(), OptionRowProps, RecipeEditor(), RecipeEditorProps, styles, SelectFieldItem (+2 more)

### Community 5 - "expenses/edit.tsx"
Cohesion: 0.11
Nodes (26): ExpenseEditScreen(), load(), styles, ExpensesScreen(), mockBack, mockCreateTransaction, mockEnsureCategories, mockGetProfile (+18 more)

### Community 6 - "category.ts"
Cohesion: 0.11
Nodes (35): BusinessRow, isAccentColor(), isLocaleCode(), mapBusinessRow(), toBusinessProfile(), CategoryRow, getCategoryById(), mapCategoryRow() (+27 more)

### Community 7 - "theme.ts"
Cohesion: 0.07
Nodes (85): ref_expo_vector_icons_materialcommunityicons, react-i18next, react-native, styles, styles, CredentialKind, LoginErrorKey, LoginStep (+77 more)

### Community 8 - "db/index.ts"
Cohesion: 0.07
Nodes (56): styles, IngredientsScreen(), styles, formatSignedQuantity(), InventoryDetailScreen(), load(), resolveSupplierForItem(), styles (+48 more)

### Community 9 - "i18n/index.ts"
Cohesion: 0.07
Nodes (26): i18next, @testing-library/react-native, mockCompleteOnboarding, mockPickBusinessLogo, mockReplace, Queries, mockCatalog, mockHeaderOptions (+18 more)

### Community 10 - "dependencies"
Cohesion: 0.04
Nodes (45): dependencies, dayjs, expo, expo-clipboard, expo-constants, expo-crypto, expo-dev-client, expo-device (+37 more)

### Community 11 - "useTheme"
Cohesion: 0.05
Nodes (44): expo-router, ref_expo_router_ui, CategoriesLayout(), ExpensesLayout(), IngredientsLayout(), InventoryLayout(), ProductsScreen(), ProductsLayout() (+36 more)

### Community 12 - "sale.ts"
Cohesion: 0.12
Nodes (26): assertSufficientStock(), computeChangeMinor(), computeIngredientCostMinor(), computeRecipeConsumptionMilli(), computeRecipeCostMinor(), computeTaxMinor(), getStockStatus(), NOTE: `listLowStockItems` is a broader "needs attention" query — it returns (+18 more)

### Community 13 - "onboarding.tsx"
Cohesion: 0.16
Nodes (16): expo-localization, ErrorField, ErrorMessageKey, INITIAL_CURRENCY, OnboardingError, OnboardingStep, styles, CurrencySwitch() (+8 more)

### Community 14 - "package.json"
Cohesion: 0.05
Nodes (37): main, name, private, version, eslint, eslint-config-expo, expo, expo-clipboard (+29 more)

### Community 15 - "use-dashboard.ts"
Cohesion: 0.13
Nodes (18): src_db_index_completedsalepoint, src_db_index_countheldsales, src_db_index_expirestaleheldsales, src_db_index_getfinancialtotals, src_db_index_getpurchaseexpensetotal, src_db_index_getrefundedsalestotals, src_db_index_listcompletedsalesinrange, src_db_index_listlowstockitems (+10 more)

### Community 16 - "catalog-save.ts"
Cohesion: 0.09
Nodes (31): src_db_index_adjustquantity, src_db_index_createinventoryitemwithstock, src_db_index_createproductwithstock, src_db_index_deletesupplieritem, src_db_index_listsupplieritems, src_db_index_manual_adjustment_reason, src_db_index_recipedetail, src_db_index_setrecipeactive (+23 more)

### Community 17 - "catalog-form.ts"
Cohesion: 0.11
Nodes (24): CategoriesScreen(), src_db_index_createproductinput, src_db_index_recipeiteminput, src_db_index_updateproductinput, buildProductCreateInput(), buildProductUpdateInput(), buildRecipeItems(), canMoveCategory() (+16 more)

### Community 18 - "pos.tsx"
Cohesion: 0.10
Nodes (24): ActiveSheet, fullName(), PosScreen(), styles, cash, completedSale, heldDetail, heldSale (+16 more)

### Community 19 - "theme.test.ts"
Cohesion: 0.13
Nodes (22): AccentOptions(), ACCENTS, src_constants_theme_accent, ACCENT_PALETTES, src_constants_theme_accents, buildPalette(), ColorScale, src_constants_theme_default_accent (+14 more)

### Community 20 - "expo"
Cohesion: 0.07
Nodes (28): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, predictiveBackGestureEnabled, projectId, reactCompiler (+20 more)

### Community 21 - "backup.tsx"
Cohesion: 0.17
Nodes (17): BackupScreen(), load(), formatValidationErrors(), styles, src_db_index_clearalldata, src_db_index_exportdatabase, src_db_index_importdatabase, src_db_index_inspectbackup (+9 more)

### Community 22 - "getBusinessId"
Cohesion: 0.12
Nodes (35): CategoryEditScreen(), load(), SupplierEditScreen(), load(), countHeldSales(), getCompletedSalesTotals(), getFinancialTotals(), getPurchaseExpenseTotal() (+27 more)

### Community 23 - "react"
Cohesion: 0.11
Nodes (20): react, styles, styles, FormFieldProps, styles, SectionHeader(), SectionHeaderProps, styles (+12 more)

### Community 24 - "receipt/[id].tsx"
Cohesion: 0.08
Nodes (47): fullName(), ReceiptScreen(), styles, cash, completedSale, mockBack, mockGetSaleById, mockListPaymentMethods (+39 more)

### Community 25 - "backup-format.ts"
Cohesion: 0.11
Nodes (23): affinityOf(), BACKUP_APP_NAME, BACKUP_APP_VERSION, BACKUP_FORMAT, BACKUP_FORMAT_VERSION, BACKUP_LIMITS, BackupColumn, BackupParseResult (+15 more)

### Community 26 - "auth/index.ts"
Cohesion: 0.15
Nodes (21): AUTH_PHASES, AuthStoreState, isAuthPhase(), OnboardingOutcome, resolveAuthPhase(), SESSION_STORAGE_KEY, SignInOutcome, admin (+13 more)

### Community 27 - "business-logo.ts"
Cohesion: 0.17
Nodes (11): expo-file-system, expo-image-picker, BusinessLogoPicker(), handlePick(), BusinessLogoPickResult, deriveImageExtension(), fileExtension(), pickBusinessLogo() (+3 more)

### Community 28 - "dashboard.test.tsx"
Cohesion: 0.11
Nodes (15): mockCompletedSales, mockCompletedTotals, mockExpireHeld, mockFinancialTotals, mockHeld, mockListEmployees, mockLowStock, mockNavigate (+7 more)

### Community 29 - "recipe.ts"
Cohesion: 0.09
Nodes (37): RFC-4122, createInventoryItemWithStock(), createProductWithStock(), CreateProductWithStockOptions, createInventoryItem(), createInventoryItemWithTxn(), InventoryItemRow, listLowStockItems() (+29 more)

### Community 30 - "scripts"
Cohesion: 0.08
Nodes (24): scripts, android, build:all, build:android, build:dev, build:dev:android, build:dev:ios, build:ios (+16 more)

### Community 31 - "formatMoney"
Cohesion: 0.15
Nodes (20): PurchasesScreen(), DashboardScreen(), ReceiptView(), ReceiptViewProps, STATUS_BANNER, STATUS_LABEL_KEY, STATUS_TONE, StatusLabelKey (+12 more)

### Community 32 - "add.tsx"
Cohesion: 0.14
Nodes (19): OnboardingScreen(), handleSubmit(), AddEmployeeScreen(), ErrorKey, FormErrors, styles, createEmployee(), normalizeUsername() (+11 more)

### Community 33 - "auth-repository.ts"
Cohesion: 0.17
Nodes (20): LoginScreen(), TeamScreen(), archiveEmployee(), BusinessRow, EmployeeRow, getBusiness(), listActiveEmployees(), mapEmployeeRow() (+12 more)

### Community 34 - "dashboard.ts"
Cohesion: 0.16
Nodes (19): SalesScreen(), averageTicketMinor(), bucketSalesByPeriod(), CompletedSaleRow, computeDashboardTotals(), DASHBOARD_PERIODS, DashboardTotalsInput, DateLike (+11 more)

### Community 35 - "main.js"
Cohesion: 0.15
Nodes (18): ALLOWED_PERMISSIONS, { app, BrowserWindow, dialog, session, shell }, bootstrap(), configurePermissions(), createWindow(), fs, gotTheLock, installCrossOriginIsolationHeaders() (+10 more)

### Community 36 - "payment-panel.tsx"
Cohesion: 0.18
Nodes (18): METHOD_ICONS, PaymentPanel(), PaymentPanelProps, styles, withoutKey(), src_db_index_paymentinput, src_db_index_paymentmethod, PaymentMethod (+10 more)

### Community 37 - "setup.test.tsx"
Cohesion: 0.10
Nodes (19): mockArchiveSupplier, mockBack, mockCompleteSetup, mockCreateSupplier, mockGetBusinessProfile, mockGetRecipeByProductId, mockListCategories, mockListInventoryItems (+11 more)

### Community 38 - "inventory-detail.test.tsx"
Cohesion: 0.11
Nodes (18): adjustmentMovement, freeTextAdjustment, item, mockAdjust, mockGetItem, mockGetProfile, mockHeaderOptions, mockListMovements (+10 more)

### Community 39 - "income-trend-chart.tsx"
Cohesion: 0.18
Nodes (11): victory-native, IncomeTrendChart(), IncomeTrendChartProps, styles, dailyMonth, hourlyDay, mockCartesianProps, monthlyYears (+3 more)

### Community 40 - "app/_layout.tsx"
Cohesion: 0.09
Nodes (18): expo-image, expo-splash-screen, expo-status-bar, react-native-reanimated, react-native-worklets, AnimatedSplashOverlay(), glowKeyframe, keyframe (+10 more)

### Community 41 - "sales.tsx"
Cohesion: 0.10
Nodes (17): DATE_FILTERS, DateRangeFilter, FilterChip(), STATUS_LABEL_KEY, styles, mockGetProfile, mockGetSalesTotals, mockListEmployees (+9 more)

### Community 42 - "backup.ts"
Cohesion: 0.14
Nodes (18): BackupImportResult, clearAllData(), deleteAllRows(), ExportDatabaseOptions, formatValidationErrors(), importDatabase(), ImportDatabaseOptions, ImportMode (+10 more)

### Community 43 - "language-switch.tsx"
Cohesion: 0.20
Nodes (13): ref_expo_sqlite_kv_store, LanguageSwitch(), selectLanguage(), styles, detectLanguage(), resolveLanguage(), SupportedLanguage, isSupportedLanguage() (+5 more)

### Community 44 - "cart-math.ts"
Cohesion: 0.20
Nodes (14): CartPanel(), useCartErrorMessage(), src_db_index_moneyminor, src_db_index_quantitymilli, src_db_index_saleitem, src_db_index_saleiteminput, computeLineSubtotalMinor(), SaleItem (+6 more)

### Community 45 - "migrations/index.ts"
Cohesion: 0.29
Nodes (7): Database, migration001InitialSchema, migration002Auth, LATEST_SCHEMA_VERSION, migrations, Recording, Migration

### Community 46 - "backup-roundtrip.integration.test.ts"
Cohesion: 0.16
Nodes (11): buildSchema(), createAdapter(), Row, SEED, snapshot(), SqliteDb, SqliteModule, SqliteStatement (+3 more)

### Community 47 - "Domain Model & Schema"
Cohesion: 0.21
Nodes (15): Catalog Domain, Earnings / Dashboard, Domain Model & Schema, Employees Domain, Income & Outcome Tracking, Ingredients Domain, Stock / Inventory Domain, Payments Domain (split payment) (+7 more)

### Community 48 - "static-server.js"
Cohesion: 0.18
Nodes (12): createStaticServer(), fs, fsp, getContentType(), http, isLoopbackHost(), MIME_TYPES, path (+4 more)

### Community 49 - "hash.ts"
Cohesion: 0.35
Nodes (10): expo-crypto, constantTimeEqualHex(), deriveKey(), generateSalt(), HashOptions, hashSecret(), isHex(), PBKDF2_ITERATIONS (+2 more)

### Community 50 - "loginLimiter"
Cohesion: 0.18
Nodes (5): DEFAULT_LOCKOUT, LockoutConfig, LockoutState, loginLimiter, NowFn

### Community 51 - "repositories/index.ts"
Cohesion: 0.08
Nodes (49): PeriodTotals, TopProduct, ACCENT_COLORS, AccentColor, BusinessProfile, BusinessProfilePatch, LOCALE_CODES, LocaleCode (+41 more)

### Community 52 - "electron/package.json"
Cohesion: 0.15
Nodes (12): author, description, devDependencies, electron, electron-builder, license, main, name (+4 more)

### Community 53 - "BusinessProfileEditor"
Cohesion: 0.39
Nodes (8): RootLayout(), hydrateStores(), BusinessProfileEditor(), handleSave(), load(), updateBusinessProfile(), setLanguage(), deleteBusinessLogo()

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
Cohesion: 0.23
Nodes (13): NOTE: @testing-library/react-native v14 ships an async `render` (React 19) —, styles, ThemeSwitch(), useEffectiveColorScheme(), mockMemory, ColorScheme, isThemeMode(), resolveEffectiveScheme() (+5 more)

### Community 60 - "devDependencies"
Cohesion: 0.20
Nodes (10): devDependencies, eslint, eslint-config-expo, jest, jest-expo, react-test-renderer, @testing-library/react-native, @types/jest (+2 more)

### Community 62 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, dev, dist, dist:linux, dist:mac, dist:win, export:web, pack (+1 more)

### Community 64 - "Expo SDK 57 Stack Baseline"
Cohesion: 0.25
Nodes (8): Anvil (sibling Expo 57 app), Dev / Preview / Release Build Tracks, Expo Router (file-based), Expo SDK 57, Expo SDK 57 Stack Baseline, Testing Strategy (pyramid), Build Variants & EAS Profiles, Testing Setup (jest-expo)

### Community 65 - "app-tabs.tsx"
Cohesion: 0.29
Nodes (5): ref_expo_router_unstable_native_tabs, AppTabs(), TAB_LABEL_KEY, TabIconName, TABS

### Community 66 - "tsconfig.json"
Cohesion: 0.25
Nodes (7): expo/tsconfig.base, compilerOptions, paths, strict, extends, include, @/assets/*

### Community 67 - "backup.test.tsx"
Cohesion: 0.27
Nodes (10): makeDocument(), mockReplace, mockResetToOnboarding, mockSignOut, exportDatabase(), makeImportDoc(), buildBackupDocument(), emptyBackupTables() (+2 more)

### Community 68 - "product-image.ts"
Cohesion: 0.36
Nodes (7): ProductImagePicker(), handlePick(), deleteProductImage(), deriveProductImageExtension(), fileExtension(), pickProductImage(), ProductImagePickResult

### Community 69 - "Color Palette & Accessibility Tokens"
Cohesion: 0.29
Nodes (7): Color Palette & Accessibility Tokens, Definition of Done, Mobile Design Patterns, Platform Layout & Responsiveness, 8pt Spacing Grid & Touch Targets, Tablet Split-View POS, Typography System (native + monospace)

### Community 70 - "wizard.ts"
Cohesion: 0.29
Nodes (4): WIZARD_STEP_COUNT, WIZARD_STEPS, WizardStepDescriptor, WizardStepId

### Community 71 - "Architecture Principles"
Cohesion: 0.33
Nodes (6): Architecture Principles, i18n (es + en) Convention, Money, Data & Language Conventions, Zustand Global State, i18n Bootstrap (es canonical), Money as INTEGER Minor Units

### Community 72 - "Punto Product & Engineering Guide"
Cohesion: 0.33
Nodes (6): Brand Personality, Punto Product Vision, Punto Product & Engineering Guide, CLAUDE.md @AGENTS.md Include, Punto README, Punto Tech Stack Table

### Community 75 - "export-web.mjs"
Cohesion: 0.33
Nodes (5): projectRoot, result, ref_node_child_process, ref_node_path, ref_node_url

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

### Community 82 - "dayjs.ts"
Cohesion: 0.40
Nodes (4): dayjs, ref_dayjs_locale_en, ref_dayjs_locale_es, setDayjsLocale()

### Community 83 - "team/[id].tsx"
Cohesion: 0.21
Nodes (11): EditEmployeeScreen(), ErrorKey, FormErrors, styles, mockBack, mockFind, mockUpdate, businessExists() (+3 more)

### Community 84 - "dialog-store.ts"
Cohesion: 0.20
Nodes (10): zustand, AppDialog(), DialogTone, DialogHost(), ConfirmDialogOptions, DialogRequest, DialogStoreState, dismissDialog() (+2 more)

### Community 85 - "metro.config.js"
Cohesion: 0.50
Nodes (3): config, { getDefaultConfig }, ref_expo_metro_config

### Community 86 - "accent-store.ts"
Cohesion: 0.29
Nodes (8): Accent, DEFAULT_ACCENT, isAccent(), AccentStoreState, BusinessProfileLoader, BusinessProfileSnapshot, useAccentStore, loadProfile

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
- **636 isolated node(s):** `AppVariant`, `name`, `slug`, `version`, `orientation` (+631 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 761 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Punto Brand Mark (Splash)` and `Punto Splash Icon`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `useTheme()` connect `useTheme` to `products.tsx`, `select-field.tsx`, `expenses/edit.tsx`, `theme.ts`, `db/index.ts`, `onboarding.tsx`, `catalog-form.ts`, `pos.tsx`, `theme.test.ts`, `backup.tsx`, `getBusinessId`, `react`, `receipt/[id].tsx`, `business-logo.ts`, `formatMoney`, `add.tsx`, `auth-repository.ts`, `dashboard.ts`, `payment-panel.tsx`, `income-trend-chart.tsx`, `app/_layout.tsx`, `sales.tsx`, `cart-math.ts`, `BusinessProfileEditor`, `theme-store.ts`, `app-tabs.tsx`, `product-image.ts`, `team/[id].tsx`, `dialog-store.ts`, `accent-store.ts`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Why does `react-native` connect `theme.ts` to `products.tsx`, `select-field.tsx`, `expenses/edit.tsx`, `db/index.ts`, `i18n/index.ts`, `useTheme`, `onboarding.tsx`, `package.json`, `pos.tsx`, `backup.tsx`, `react`, `receipt/[id].tsx`, `business-logo.ts`, `formatMoney`, `add.tsx`, `payment-panel.tsx`, `income-trend-chart.tsx`, `app/_layout.tsx`, `sales.tsx`, `language-switch.tsx`, `theme-store.ts`, `product-image.ts`, `team/[id].tsx`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **What connects `AppVariant`, `name`, `slug` to the rest of the system?**
  _636 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `finance.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0824829931972789 - nodes in this community are weakly interconnected._
- **Should `getDb` be split into smaller, more focused modules?**
  _Cohesion score 0.07974683544303797 - nodes in this community are weakly interconnected._