# Graph Report - punto  (2026-09-22)

## Corpus Check
- 295 files · ~217,652 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 4, .css 2)

## Summary
- 2086 nodes · 7734 edges · 91 communities (83 shown, 8 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 112 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `22fde2a8`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- repositories/index.ts
- getDb
- accent-store.ts
- repoError
- cash-session-repository.ts
- dialog/index.ts
- payment-method.ts
- permissions.ts
- suppliers.tsx
- sales.tsx
- dependencies
- useTheme
- themed-text.tsx
- onboarding.tsx
- package.json
- recipe.ts
- catalog-save.ts
- purchase.ts
- sale.ts
- accent-options.tsx
- expo
- backup.tsx
- catalog-form.ts
- products.tsx
- cart-store.ts
- backup-format.ts
- auth/index.ts
- finance.ts
- backup.ts
- use-dashboard.ts
- scripts
- receipt-view.tsx
- validation.ts
- auth-repository.ts
- dashboard.ts
- main.js
- payment.ts
- setup.test.tsx
- category.ts
- dashboard.test.tsx
- app/_layout.tsx
- assets.d.ts
- wizard-step.tsx
- language-store.ts
- cart-math.ts
- migrations/index.ts
- backup-roundtrip.integration.test.ts
- Domain Model & Schema
- static-server.js
- hash.ts
- auth-repository.test.ts
- expenses.test.tsx
- electron/package.json
- app-tabs.tsx
- COEP/COOP Header Injection
- reset-project.js
- Offline-First Architecture
- pbkdf2.ts
- pos.tsx
- theme-store.ts
- devDependencies
- skia-web.web.ts
- scripts
- getBusinessId
- Expo SDK 57 Stack Baseline
- db/index.ts
- tsconfig.json
- Theme Accent Personalization
- theme.ts
- app.config.ts
- animated-icon.web.tsx
- export-web.mjs
- (tabs)/index.tsx
- income-trend-chart.tsx
- inventory-item.ts
- Android Adaptive Icon
- Punto App Icon
- eslint.config.js
- receipt.test.tsx
- wizard.ts
- metro.config.js
- i18n/index.ts
- Expo Icon Composition (Icon Composer Layer Stack)
- exportDatabase
- Punto Splash Icon
- Expo Logo Image
- Punto Favicon
- Brand Glow Backdrop Asset

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 170 edges
2. `getDb()` - 103 edges
3. `getBusinessId()` - 102 edges
4. `react-native` - 90 edges
5. `repoError` - 80 edges
6. `withTransaction()` - 78 edges
7. `Spacing` - 77 edges
8. `ThemedText()` - 74 edges
9. `react` - 72 edges
10. `react-i18next` - 71 edges

## Surprising Connections (you probably didn't know these)
- `Web Support (static rendering)` --semantically_similar_to--> `Punto Desktop (Electron shell)`  [INFERRED] [semantically similar]
  README.md → electron/README.md
- `getDb() Singleton & Migrations` --implements--> `Local SQLite Source of Truth`  [INFERRED]
  README.md → AGENTS.md
- `Offline-First (README)` --references--> `Offline-First Architecture`  [EXTRACTED]
  README.md → AGENTS.md
- `Punto Tech Stack Table` --references--> `Expo SDK 57 Stack Baseline`  [EXTRACTED]
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

## Communities (91 total, 8 thin omitted)

### Community 0 - "repositories/index.ts"
Cohesion: 0.07
Nodes (59): CompletedSalePoint, PeriodTotals, SaleRange, TopProduct, assertSufficientStock(), computeChangeMinor(), computeIngredientCostMinor(), computeRecipeConsumptionMilli() (+51 more)

### Community 1 - "getDb"
Cohesion: 0.09
Nodes (48): OPEN_SESSION_ROW, DATABASE_NAME, getDb(), init(), resetDbForTesting(), runMigrations(), resetBusinessIdForTesting(), resetBusinessScope() (+40 more)

### Community 2 - "accent-store.ts"
Cohesion: 0.29
Nodes (8): Accent, DEFAULT_ACCENT, isAccent(), AccentStoreState, BusinessProfileLoader, BusinessProfileSnapshot, useAccentStore, loadProfile

### Community 3 - "repoError"
Cohesion: 0.13
Nodes (58): SupplierEditScreen(), load(), closeSessionWithTxn(), openSessionWithTxn(), computeLineSubtotalMinor(), archiveCategoryWithTxn(), createCategoryWithTxn(), updateCategoryWithTxn() (+50 more)

### Community 4 - "cash-session-repository.ts"
Cohesion: 0.10
Nodes (30): ElapsedParts, elapsedSince(), isStale(), getActiveSession(), hasAnySession(), CashSessionStoreState, STALE_SESSION_HOURS, CASH_SESSION_ERROR (+22 more)

### Community 5 - "dialog/index.ts"
Cohesion: 0.29
Nodes (9): DialogTone, DialogHost(), ConfirmDialogOptions, ConfirmDialogToggle, DialogRequest, DialogStoreState, dismissDialog(), MessageDialogOptions (+1 more)

### Community 6 - "payment-method.ts"
Cohesion: 0.11
Nodes (25): ACCENT_COLORS, AccentColor, BusinessProfile, BusinessProfilePatch, BusinessRow, isAccentColor(), isLocaleCode(), LOCALE_CODES (+17 more)

### Community 7 - "permissions.ts"
Cohesion: 0.18
Nodes (15): setAuthorizationPin(), AUTH_FORBIDDEN, AuthActor, can(), CAPABILITIES, Capability, EMPLOYEE_CAPABILITIES, ForbiddenError (+7 more)

### Community 8 - "suppliers.tsx"
Cohesion: 0.09
Nodes (26): styles, styles, styles, PurchaseForm(), PurchaseFormPayload, PurchaseFormProps, PurchaseLineIssue, PurchaseLineValue (+18 more)

### Community 9 - "sales.tsx"
Cohesion: 0.08
Nodes (33): CloseCashSessionScreen(), row(), CashSessionDetailScreen(), employeeName(), ExpenseEditScreen(), load(), fullName(), ReceiptScreen() (+25 more)

### Community 10 - "dependencies"
Cohesion: 0.04
Nodes (45): dependencies, dayjs, expo, expo-clipboard, expo-constants, expo-crypto, expo-dev-client, expo-device (+37 more)

### Community 11 - "useTheme"
Cohesion: 0.08
Nodes (28): ref_expo_router_ui, CashSessionLayout(), CategoriesLayout(), ExpensesLayout(), IngredientsLayout(), InventoryLayout(), ProductsLayout(), PurchasesLayout() (+20 more)

### Community 12 - "themed-text.tsx"
Cohesion: 0.07
Nodes (52): styles, styles, styles, styles, AppDialogProps, styles, TONE_ICONS, CartPanelProps (+44 more)

### Community 13 - "onboarding.tsx"
Cohesion: 0.08
Nodes (30): expo-file-system, expo-image-picker, expo-localization, ErrorField, ErrorMessageKey, INITIAL_CURRENCY, OnboardingError, OnboardingStep (+22 more)

### Community 14 - "package.json"
Cohesion: 0.05
Nodes (37): main, name, private, version, eslint, eslint-config-expo, expo, expo-clipboard (+29 more)

### Community 15 - "recipe.ts"
Cohesion: 0.23
Nodes (17): getRecipeByProductId(), listRecipes(), mapRecipeItemRow(), mapRecipeItems(), mapRecipeRow(), Recipe, RecipeItem, RecipeItemRow (+9 more)

### Community 16 - "catalog-save.ts"
Cohesion: 0.08
Nodes (35): ProductImagePicker(), handlePick(), src_db_index_adjustquantity, src_db_index_createinventoryitemwithstock, src_db_index_createproductwithstock, src_db_index_deletesupplieritem, src_db_index_listsupplieritems, src_db_index_manual_adjustment_reason (+27 more)

### Community 17 - "purchase.ts"
Cohesion: 0.13
Nodes (28): recordMovementWithTxn(), decodeCursor(), DEFAULT_PAGE_LIMIT, encodeCursor(), keysetWhere(), Page, PageQuery, cancelPurchase() (+20 more)

### Community 18 - "sale.ts"
Cohesion: 0.15
Nodes (23): getSessionById(), listSessions(), mapRow(), archiveSoftWhere, intOrNull(), str(), strOrNull(), HELD_SALE_TTL_HOURS (+15 more)

### Community 19 - "accent-options.tsx"
Cohesion: 0.12
Nodes (23): AccentOptions(), AccentOptionsProps, styles, ACCENTS, src_constants_theme_accent, ACCENT_PALETTES, src_constants_theme_accents, buildPalette() (+15 more)

### Community 20 - "expo"
Cohesion: 0.07
Nodes (28): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, predictiveBackGestureEnabled, projectId, reactCompiler (+20 more)

### Community 21 - "backup.tsx"
Cohesion: 0.13
Nodes (24): BackupScreen(), load(), formatValidationErrors(), styles, mockAdminUser, mockReplace, mockResetToOnboarding, mockSignOut (+16 more)

### Community 22 - "catalog-form.ts"
Cohesion: 0.11
Nodes (23): CategoriesScreen(), styles, src_db_index_createproductinput, src_db_index_recipeiteminput, src_db_index_updateproductinput, buildProductCreateInput(), buildProductUpdateInput(), buildRecipeItems() (+15 more)

### Community 23 - "products.tsx"
Cohesion: 0.09
Nodes (55): expo-router, styles, InventoryItemEditScreen(), load(), ProductEditScreen(), load(), styles, PurchaseEditScreen() (+47 more)

### Community 24 - "cart-store.ts"
Cohesion: 0.06
Nodes (51): cash, completedSale, heldDetail, heldSale, mockCatalog, mockCheckoutSale, mockCreateHeldSale, mockEnsureMethods (+43 more)

### Community 25 - "backup-format.ts"
Cohesion: 0.11
Nodes (22): affinityOf(), BACKUP_APP_NAME, BACKUP_APP_VERSION, BACKUP_FORMAT, BACKUP_FORMAT_VERSION, BACKUP_LIMITS, BackupColumn, BackupParseResult (+14 more)

### Community 26 - "auth/index.ts"
Cohesion: 0.15
Nodes (23): businessExists(), AUTH_PHASES, AuthStoreState, isAuthPhase(), OnboardingOutcome, resolveAuthPhase(), SESSION_STORAGE_KEY, SignInOutcome (+15 more)

### Community 27 - "finance.ts"
Cohesion: 0.17
Nodes (20): createFinancialCategory(), CreateFinancialCategoryInput, DEFAULT_FINANCIAL_CATEGORIES, DefaultFinancialCategoryLanguage, ensureDefaultFinancialCategories(), FinancialCategoryRow, FinancialTransaction, FinancialTransactionFilter (+12 more)

### Community 28 - "backup.ts"
Cohesion: 0.16
Nodes (16): BackupImportResult, clearAllData(), deleteAllRows(), ExportDatabaseOptions, formatValidationErrors(), importDatabase(), ImportDatabaseOptions, ImportMode (+8 more)

### Community 29 - "use-dashboard.ts"
Cohesion: 0.13
Nodes (18): src_db_index_completedsalepoint, src_db_index_countheldsales, src_db_index_expirestaleheldsales, src_db_index_getcompletedsalestotals, src_db_index_getpurchaseexpensetotal, src_db_index_getrefundedsalestotals, src_db_index_listcompletedsalesinrange, src_db_index_listtopproducts (+10 more)

### Community 30 - "scripts"
Cohesion: 0.08
Nodes (24): scripts, android, build:all, build:android, build:dev, build:dev:android, build:dev:ios, build:ios (+16 more)

### Community 31 - "receipt-view.tsx"
Cohesion: 0.13
Nodes (13): BannerKey, ReceiptView(), ReceiptViewProps, resolveBanner(), STATUS_BANNER, STATUS_LABEL_KEY, STATUS_TONE, StatusLabelKey (+5 more)

### Community 32 - "validation.ts"
Cohesion: 0.10
Nodes (28): LoginScreen(), OnboardingScreen(), handleSubmit(), AddEmployeeScreen(), EditEmployeeScreen(), mockBack, mockFind, mockUpdate (+20 more)

### Community 33 - "auth-repository.ts"
Cohesion: 0.24
Nodes (10): archiveEmployee(), BusinessRow, EmployeeRow, getBusiness(), ManagerPinResult, nowIso(), onboardBusiness(), UpdateEmployeeInput (+2 more)

### Community 34 - "dashboard.ts"
Cohesion: 0.18
Nodes (16): averageTicketMinor(), bucketSalesByPeriod(), CompletedSaleRow, DASHBOARD_PERIODS, DashboardTotalsInput, DateLike, dayRange, evenlySpacedTicks() (+8 more)

### Community 35 - "main.js"
Cohesion: 0.15
Nodes (18): ALLOWED_PERMISSIONS, { app, BrowserWindow, dialog, session, shell }, bootstrap(), configurePermissions(), createWindow(), fs, gotTheLock, installCrossOriginIsolationHeaders() (+10 more)

### Community 36 - "payment.ts"
Cohesion: 0.15
Nodes (18): PaymentPanel(), withoutKey(), card, cash, src_db_index_moneyminor, src_db_index_paymentinput, src_db_index_paymentmethod, PaymentMethod (+10 more)

### Community 37 - "setup.test.tsx"
Cohesion: 0.10
Nodes (19): mockArchiveSupplier, mockBack, mockCompleteSetup, mockCreateSupplier, mockGetBusinessProfile, mockGetRecipeByProductId, mockListCategories, mockListInventoryItems (+11 more)

### Community 38 - "category.ts"
Cohesion: 0.21
Nodes (12): RFC-4122, CategoryEditScreen(), load(), archiveCategory(), CategoryRow, createCategory(), CreateCategoryInput, getCategoryById() (+4 more)

### Community 39 - "dashboard.test.tsx"
Cohesion: 0.11
Nodes (15): mockCompletedSales, mockCompletedTotals, mockExpireHeld, mockFinancialTotals, mockHeld, mockListEmployees, mockLowStock, mockNavigate (+7 more)

### Community 40 - "app/_layout.tsx"
Cohesion: 0.15
Nodes (14): expo-splash-screen, expo-status-bar, react-native-worklets, RootLayout(), hydrateStores(), AnimatedSplashOverlay(), glowKeyframe, keyframe (+6 more)

### Community 42 - "wizard-step.tsx"
Cohesion: 0.28
Nodes (7): styles, WizardProgress(), WizardProgressProps, styles, WizardStep(), WizardStepProps, getWizardStep()

### Community 43 - "language-store.ts"
Cohesion: 0.33
Nodes (7): ref_expo_sqlite_kv_store, zustand, isSupportedLanguage(), LANGUAGE_STORAGE_KEY, SUPPORTED_LANGUAGES, useLanguageStore, mockMemory

### Community 44 - "cart-math.ts"
Cohesion: 0.31
Nodes (7): src_db_index_quantitymilli, src_db_index_saleitem, src_db_index_saleiteminput, SaleItem, cartLineSubtotalMinor(), cartLineToSaleItemInput(), saleItemToCartLine()

### Community 45 - "migrations/index.ts"
Cohesion: 0.22
Nodes (10): Database, migration001InitialSchema, migration002Auth, migration003SaleInventoryRestored, migration004ManagerRefundAuth, migration005CashSession, LATEST_SCHEMA_VERSION, migrations (+2 more)

### Community 46 - "backup-roundtrip.integration.test.ts"
Cohesion: 0.16
Nodes (11): ADMIN, buildSchema(), createAdapter(), Row, SEED, snapshot(), SqliteDb, SqliteModule (+3 more)

### Community 47 - "Domain Model & Schema"
Cohesion: 0.21
Nodes (15): Catalog Domain, Earnings / Dashboard, Domain Model & Schema, Employees Domain, Income & Outcome Tracking, Ingredients Domain, Stock / Inventory Domain, Payments Domain (split payment) (+7 more)

### Community 48 - "static-server.js"
Cohesion: 0.18
Nodes (12): createStaticServer(), fs, fsp, getContentType(), http, isLoopbackHost(), MIME_TYPES, path (+4 more)

### Community 49 - "hash.ts"
Cohesion: 0.27
Nodes (14): expo-crypto, signIn(), verifyManagerAuthorizationPin(), ManagerPinSheet(), constantTimeEqualHex(), deriveKey(), generateSalt(), HashOptions (+6 more)

### Community 50 - "auth-repository.test.ts"
Cohesion: 0.13
Nodes (12): ManagerPinScreen(), hasAuthorizationPin(), DEFAULT_LOCKOUT, LockoutConfig, LockoutState, loginLimiter, MANAGER_PIN_LIMITER_KEY, managerPinLimiter (+4 more)

### Community 51 - "expenses.test.tsx"
Cohesion: 0.11
Nodes (15): ExpensesScreen(), mockBack, mockCreateTransaction, mockEnsureCategories, mockGetProfile, mockListCategories, mockListPaymentMethods, mockListSuppliers (+7 more)

### Community 52 - "electron/package.json"
Cohesion: 0.15
Nodes (12): author, description, devDependencies, electron, electron-builder, license, main, name (+4 more)

### Community 53 - "app-tabs.tsx"
Cohesion: 0.29
Nodes (5): ref_expo_router_unstable_native_tabs, AppTabs(), TAB_LABEL_KEY, TabIconName, TABS

### Community 54 - "COEP/COOP Header Injection"
Cohesion: 0.23
Nodes (12): electron-builder Configuration, extraResources dist/ Copy, NSIS / AppImage / DMG Targets, COEP/COOP Header Injection, Cross-Origin Isolation Assertion, Loopback HTTP Server for dist/, main.js (Electron main process), Punto Desktop (Electron shell) (+4 more)

### Community 55 - "reset-project.js"
Cohesion: 0.13
Nodes (13): ref_fs, ref_path, ref_readline, exampleDirPath, fs, oldDirs, path, readline (+5 more)

### Community 56 - "Offline-First Architecture"
Cohesion: 0.15
Nodes (17): Architecture Principles, i18n (es + en) Convention, JSON Import/Export Backup, Local SQLite Source of Truth, Money, Data & Language Conventions, Offline-First Architecture, Zustand Global State, OPFS Origin-Private SQLite Database (+9 more)

### Community 57 - "pbkdf2.ts"
Cohesion: 0.18
Nodes (10): ref_noble_hashes_pbkdf2_js, ref_noble_hashes_sha2_js, ref_noble_hashes_utils_js, react-native-quick-crypto, PBKDF2_DK_BYTES, PBKDF2_DK_BYTES, noblePbkdf2Hex(), PBKDF2_DK_BYTES (+2 more)

### Community 58 - "pos.tsx"
Cohesion: 0.12
Nodes (30): CashSessionHistoryScreen(), employeeName(), ProductsScreen(), PurchasesScreen(), DashboardScreen(), ActiveSheet, fullName(), PosScreen() (+22 more)

### Community 59 - "theme-store.ts"
Cohesion: 0.23
Nodes (13): NOTE: @testing-library/react-native v14 ships an async `render` (React 19) —, styles, ThemeSwitch(), useEffectiveColorScheme(), mockMemory, ColorScheme, isThemeMode(), resolveEffectiveScheme() (+5 more)

### Community 60 - "devDependencies"
Cohesion: 0.20
Nodes (10): devDependencies, eslint, eslint-config-expo, jest, jest-expo, react-test-renderer, @testing-library/react-native, @types/jest (+2 more)

### Community 61 - "skia-web.web.ts"
Cohesion: 0.40
Nodes (3): ref_canvaskit_wasm_bin_full_canvaskit_wasm, ref_shopify_react_native_skia_lib_module_web, ensureSkiaWeb()

### Community 62 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, dev, dist, dist:linux, dist:mac, dist:win, export:web, pack (+1 more)

### Community 63 - "getBusinessId"
Cohesion: 0.11
Nodes (42): closeSession(), openSession(), countHeldSales(), getCompletedSalesTotals(), getFinancialTotals(), getPurchaseExpenseTotal(), getRefundedSalesTotals(), listCompletedSalesInRange() (+34 more)

### Community 64 - "Expo SDK 57 Stack Baseline"
Cohesion: 0.14
Nodes (14): Anvil (sibling Expo 57 app), Brand Personality, Dev / Preview / Release Build Tracks, Expo Router (file-based), Expo SDK 57, Punto Product Vision, Punto Product & Engineering Guide, Expo SDK 57 Stack Baseline (+6 more)

### Community 65 - "db/index.ts"
Cohesion: 0.07
Nodes (53): styles, IngredientsScreen(), styles, formatSignedQuantity(), InventoryDetailScreen(), load(), resolveSupplierForItem(), styles (+45 more)

### Community 66 - "tsconfig.json"
Cohesion: 0.25
Nodes (7): expo/tsconfig.base, compilerOptions, paths, strict, extends, include, @/assets/*

### Community 69 - "Theme Accent Personalization"
Cohesion: 0.18
Nodes (12): Business Profile Domain, Color Palette & Accessibility Tokens, Definition of Done, Mobile Design Patterns, Platform Layout & Responsiveness, 8pt Spacing Grid & Touch Targets, Tablet Split-View POS, Theme Accent Personalization (+4 more)

### Community 70 - "theme.ts"
Cohesion: 0.05
Nodes (85): ref_expo_vector_icons_materialcommunityicons, react, react-i18next, react-native, react-native-safe-area-context, styles, styles, CredentialKind (+77 more)

### Community 74 - "animated-icon.web.tsx"
Cohesion: 0.20
Nodes (7): expo-image, react-native-reanimated, src_components_animated_icon_module, glowKeyframe, keyframe, logoKeyframe, styles

### Community 75 - "export-web.mjs"
Cohesion: 0.33
Nodes (5): projectRoot, result, ref_node_child_process, ref_node_path, ref_node_url

### Community 76 - "(tabs)/index.tsx"
Cohesion: 0.21
Nodes (10): IncomeTrendChart, PERIOD_LABEL_KEY, PeriodChip(), styles, TopProductsChart, styles, TopProductsChart(), TopProductsChartProps (+2 more)

### Community 77 - "income-trend-chart.tsx"
Cohesion: 0.29
Nodes (7): victory-native, IncomeTrendChart(), IncomeTrendChartProps, styles, formatTrendLabel(), MAX_TREND_AXIS_TICKS, TrendAxisTick

### Community 78 - "inventory-item.ts"
Cohesion: 0.08
Nodes (27): getMetadata(), getSetupCompleted(), nextDocumentNumber(), nextPurchaseNumber(), nextSaleNumber(), setMetadata(), setSetupCompleted(), DatabaseAdapter (+19 more)

### Community 79 - "Android Adaptive Icon"
Cohesion: 0.60
Nodes (5): Android Adaptive Icon Background Layer, Android Adaptive Icon, Android Adaptive Icon Foreground Mark, Adaptive Icon Layer Separation Design, Android Adaptive Icon Monochrome Layer

### Community 80 - "Punto App Icon"
Cohesion: 0.60
Nodes (5): Blue Radial Gradient Background, Punto Brand Identity, Chevron / Upward Caret Glyph, Subtle Crosshair Grid Pattern, Punto App Icon

### Community 81 - "eslint.config.js"
Cohesion: 0.40
Nodes (4): { defineConfig }, expoConfig, ref_eslint_config, ref_eslint_config_expo_flat

### Community 83 - "receipt.test.tsx"
Cohesion: 0.14
Nodes (13): cash, completedSale, mockBack, mockGetSaleById, mockListPaymentMethods, mockRefundSale, mockRefundSaleAuthorized, mockReplace (+5 more)

### Community 84 - "wizard.ts"
Cohesion: 0.29
Nodes (4): WIZARD_STEP_COUNT, WIZARD_STEPS, WizardStepDescriptor, WizardStepId

### Community 85 - "metro.config.js"
Cohesion: 0.50
Nodes (3): config, { getDefaultConfig }, ref_expo_metro_config

### Community 86 - "i18n/index.ts"
Cohesion: 0.05
Nodes (45): dayjs, ref_dayjs_locale_en, ref_dayjs_locale_es, i18next, @testing-library/react-native, mockCompleteOnboarding, mockPickBusinessLogo, mockReplace (+37 more)

### Community 87 - "Expo Icon Composition (Icon Composer Layer Stack)"
Cohesion: 1.00
Nodes (3): Expo Icon Composition (Icon Composer Layer Stack), Expo Symbol (White Chevron Mark), Icon Grid Overlay (Transparent 1024x1024)

### Community 88 - "exportDatabase"
Cohesion: 0.39
Nodes (8): makeDocument(), exportDatabase(), normalizeRow(), makeImportDoc(), buildBackupDocument(), emptyBackupTables(), docWithProduct(), makeRawDoc()

### Community 89 - "Punto Splash Icon"
Cohesion: 1.00
Nodes (3): Punto Splash Icon, Punto Brand Mark (Splash), App Splash Screen Identity

## Ambiguous Edges - Review These
- `Punto Brand Mark (Splash)` → `Punto Splash Icon`  [AMBIGUOUS]
  assets/images/splash-icon.png · relation: conceptually_related_to

## Knowledge Gaps
- **669 isolated node(s):** `AppVariant`, `name`, `slug`, `version`, `orientation` (+664 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 808 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Punto Brand Mark (Splash)` and `Punto Splash Icon`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `useTheme()` connect `useTheme` to `accent-store.ts`, `repoError`, `cash-session-repository.ts`, `suppliers.tsx`, `sales.tsx`, `themed-text.tsx`, `onboarding.tsx`, `catalog-save.ts`, `accent-options.tsx`, `backup.tsx`, `catalog-form.ts`, `products.tsx`, `receipt-view.tsx`, `validation.ts`, `payment.ts`, `category.ts`, `app/_layout.tsx`, `wizard-step.tsx`, `auth-repository.test.ts`, `expenses.test.tsx`, `app-tabs.tsx`, `pos.tsx`, `theme-store.ts`, `db/index.ts`, `theme.ts`, `(tabs)/index.tsx`, `income-trend-chart.tsx`, `i18n/index.ts`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Why does `react` connect `theme.ts` to `suppliers.tsx`, `sales.tsx`, `useTheme`, `themed-text.tsx`, `onboarding.tsx`, `package.json`, `backup.tsx`, `catalog-form.ts`, `products.tsx`, `cart-store.ts`, `use-dashboard.ts`, `receipt-view.tsx`, `validation.ts`, `dashboard.test.tsx`, `app/_layout.tsx`, `wizard-step.tsx`, `expenses.test.tsx`, `app-tabs.tsx`, `pos.tsx`, `db/index.ts`, `(tabs)/index.tsx`, `receipt.test.tsx`, `i18n/index.ts`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **What connects `AppVariant`, `name`, `slug` to the rest of the system?**
  _669 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `repositories/index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07115384615384615 - nodes in this community are weakly interconnected._
- **Should `getDb` be split into smaller, more focused modules?**
  _Cohesion score 0.08544087491455912 - nodes in this community are weakly interconnected._