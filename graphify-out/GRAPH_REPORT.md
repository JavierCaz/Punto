# Graph Report - punto  (2026-09-18)

## Corpus Check
- 268 files · ~204,376 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 4, .css 2)

## Summary
- 1952 nodes · 7086 edges · 95 communities (88 shown, 7 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 108 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1bd39fee`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- repositories/index.ts
- getDb
- products.tsx
- payment-method.ts
- ThemedText
- expenses.test.tsx
- inventory-item.ts
- theme.ts
- db/index.ts
- i18n/index.ts
- dependencies
- useTheme
- sale.ts
- business-profile-editor.tsx
- package.json
- use-dashboard.ts
- catalog-save.ts
- catalog-form.ts
- pos-checkout.test.tsx
- theme.test.ts
- expo
- backup.tsx
- getBusinessId
- Spacing
- cart-store.ts
- backup.ts
- auth/index.ts
- business-logo.ts
- dashboard.test.tsx
- mapSqliteError
- scripts
- formatMoney
- normalizeUsername
- auth-repository.ts
- dashboard.ts
- main.js
- payment-panel.tsx
- setup.test.tsx
- inventory-detail.test.tsx
- income-trend-chart.tsx
- app/_layout.tsx
- sales.tsx
- withTransaction
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
- secondary-button.tsx
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
- InventoryItem
- tsconfig.json
- react-native
- product-image.ts
- Color Palette & Accessibility Tokens
- app-tabs.web.tsx
- Architecture Principles
- Punto Product & Engineering Guide
- app.config.ts
- animated-icon.web.tsx
- export-web.mjs
- (tabs)/index.tsx
- validation.ts
- Theme Accent Personalization
- Android Adaptive Icon
- Punto App Icon
- eslint.config.js
- dayjs.ts
- team-edit.test.tsx
- dialog/index.ts
- metro.config.js
- i18n/types.ts
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

## Communities (95 total, 7 thin omitted)

### Community 0 - "repositories/index.ts"
Cohesion: 0.06
Nodes (82): CompletedSalePoint, PeriodTotals, SaleRange, TopProduct, assertSufficientStock(), computeChangeMinor(), computeIngredientCostMinor(), computeRecipeConsumptionMilli() (+74 more)

### Community 1 - "getDb"
Cohesion: 0.11
Nodes (37): ADMIN_ROW, EMPLOYEE_ROW, DATABASE_NAME, getDb(), resetDbForTesting(), resetBusinessIdForTesting(), RunResult, isRepoError() (+29 more)

### Community 2 - "products.tsx"
Cohesion: 0.15
Nodes (22): styles, styles, ProductFormProps, styles, ProductImageError, src_db_index_archiveproduct, src_db_index_category, src_db_index_computerecipecostminor (+14 more)

### Community 3 - "payment-method.ts"
Cohesion: 0.22
Nodes (17): RFC-4122, newId(), createPaymentMethod(), CreatePaymentMethodInput, createPaymentMethodWithTxn(), DEFAULT_PAYMENT_METHODS, DefaultPaymentMethodLanguage, ensureDefaultPaymentMethods() (+9 more)

### Community 4 - "ThemedText"
Cohesion: 0.09
Nodes (26): ErrorKey, FormErrors, styles, ErrorKey, FormErrors, styles, CategoryFormProps, styles (+18 more)

### Community 5 - "expenses.test.tsx"
Cohesion: 0.11
Nodes (19): ExpenseEditScreen(), load(), mockBack, mockCreateTransaction, mockEnsureCategories, mockGetProfile, mockListCategories, mockListPaymentMethods (+11 more)

### Community 6 - "inventory-item.ts"
Cohesion: 0.11
Nodes (41): ACCENT_COLORS, AccentColor, BusinessProfile, BusinessProfilePatch, BusinessRow, isAccentColor(), isLocaleCode(), LOCALE_CODES (+33 more)

### Community 7 - "theme.ts"
Cohesion: 0.09
Nodes (28): expo-image, CartLineRow(), CartLineRowProps, styles, CartPanelProps, styles, ProductCardProps, styles (+20 more)

### Community 8 - "db/index.ts"
Cohesion: 0.10
Nodes (44): expo-router, react, styles, styles, styles, styles, styles, styles (+36 more)

### Community 9 - "i18n/index.ts"
Cohesion: 0.07
Nodes (28): @testing-library/react-native, mockCompleteOnboarding, mockPickBusinessLogo, mockReplace, Queries, mockCatalog, mockHeaderOptions, SegmentedControl() (+20 more)

### Community 10 - "dependencies"
Cohesion: 0.04
Nodes (45): dependencies, dayjs, expo, expo-clipboard, expo-constants, expo-crypto, expo-dev-client, expo-device (+37 more)

### Community 11 - "useTheme"
Cohesion: 0.07
Nodes (31): ref_expo_router_unstable_native_tabs, CategoriesLayout(), ExpensesLayout(), IngredientsLayout(), InventoryLayout(), ProductsScreen(), styles, ProductsLayout() (+23 more)

### Community 12 - "sale.ts"
Cohesion: 0.15
Nodes (33): computeLineSubtotalMinor(), repoError, addSaleItem(), addSaleItemWithTxn(), assertStatus(), cancelSale(), cancelSaleWithTxn(), checkoutSale() (+25 more)

### Community 13 - "business-profile-editor.tsx"
Cohesion: 0.08
Nodes (30): ErrorField, ErrorMessageKey, INITIAL_CURRENCY, OnboardingError, OnboardingStep, styles, AccentOptions(), AccentOptionsProps (+22 more)

### Community 14 - "package.json"
Cohesion: 0.05
Nodes (38): main, name, private, version, eslint, eslint-config-expo, expo, expo-clipboard (+30 more)

### Community 15 - "use-dashboard.ts"
Cohesion: 0.13
Nodes (18): src_db_index_completedsalepoint, src_db_index_countheldsales, src_db_index_expirestaleheldsales, src_db_index_getfinancialtotals, src_db_index_getpurchaseexpensetotal, src_db_index_getrefundedsalestotals, src_db_index_listcompletedsalesinrange, src_db_index_listlowstockitems (+10 more)

### Community 16 - "catalog-save.ts"
Cohesion: 0.09
Nodes (29): resolveSupplierForItem(), src_db_index_createinventoryitemwithstock, src_db_index_createproductwithstock, src_db_index_deletesupplieritem, src_db_index_manual_adjustment_reason, src_db_index_setrecipeactive, src_db_index_updateinventoryitem, src_db_index_updateproduct (+21 more)

### Community 17 - "catalog-form.ts"
Cohesion: 0.11
Nodes (27): CategoriesScreen(), InventoryItemForm(), ProductForm(), PurchaseForm(), src_db_index_createproductinput, src_db_index_recipeiteminput, src_db_index_updateproductinput, buildProductCreateInput() (+19 more)

### Community 18 - "pos-checkout.test.tsx"
Cohesion: 0.07
Nodes (25): cash, completedSale, heldDetail, heldSale, mockCatalog, mockCheckoutSale, mockCreateHeldSale, mockEnsureMethods (+17 more)

### Community 19 - "theme.test.ts"
Cohesion: 0.09
Nodes (29): Accent, ACCENTS, DEFAULT_ACCENT, isAccent(), src_constants_theme_accent, ACCENT_PALETTES, src_constants_theme_accents, buildPalette() (+21 more)

### Community 20 - "expo"
Cohesion: 0.07
Nodes (28): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, predictiveBackGestureEnabled, projectId, reactCompiler (+20 more)

### Community 21 - "backup.tsx"
Cohesion: 0.14
Nodes (23): BackupScreen(), load(), formatValidationErrors(), styles, mockReplace, mockResetToOnboarding, mockSignOut, src_db_index_clearalldata (+15 more)

### Community 22 - "getBusinessId"
Cohesion: 0.18
Nodes (26): CategoryEditScreen(), load(), countHeldSales(), getCompletedSalesTotals(), getFinancialTotals(), getPurchaseExpenseTotal(), getRefundedSalesTotals(), listCompletedSalesInRange() (+18 more)

### Community 23 - "Spacing"
Cohesion: 0.07
Nodes (42): react-i18next, styles, styles, styles, styles, styles, styles, CategoryForm() (+34 more)

### Community 24 - "cart-store.ts"
Cohesion: 0.07
Nodes (34): cash, completedSale, mockBack, mockGetSaleById, mockListPaymentMethods, mockRefundSale, mockReplace, src_db_index_addsaleitem (+26 more)

### Community 25 - "backup.ts"
Cohesion: 0.07
Nodes (53): makeDocument(), BackupImportResult, clearAllData(), deleteAllRows(), exportDatabase(), ExportDatabaseOptions, formatValidationErrors(), importDatabase() (+45 more)

### Community 26 - "auth/index.ts"
Cohesion: 0.14
Nodes (24): businessExists(), AUTH_PHASES, AuthStoreState, isAuthPhase(), OnboardingOutcome, resolveAuthPhase(), SESSION_STORAGE_KEY, SignInOutcome (+16 more)

### Community 27 - "business-logo.ts"
Cohesion: 0.13
Nodes (19): expo-image-picker, handlePick(), BusinessProfileEditor(), handleSave(), load(), CURRENCY_CODES, DEFAULT_CURRENCY, isCurrencyCode() (+11 more)

### Community 28 - "dashboard.test.tsx"
Cohesion: 0.11
Nodes (15): mockCompletedSales, mockCompletedTotals, mockExpireHeld, mockFinancialTotals, mockHeld, mockListEmployees, mockLowStock, mockNavigate (+7 more)

### Community 29 - "mapSqliteError"
Cohesion: 0.19
Nodes (27): nowIso(), mapSqliteError(), createFinancialCategoryWithTxn(), ensureDefaultFinancialCategories(), archiveInventoryItemWithTxn(), reconcileItemFromLedgerWithTxn(), archiveProductWithTxn(), cancelPurchaseWithTxn() (+19 more)

### Community 30 - "scripts"
Cohesion: 0.08
Nodes (24): scripts, android, build:all, build:android, build:dev, build:dev:android, build:dev:ios, build:ios (+16 more)

### Community 31 - "formatMoney"
Cohesion: 0.12
Nodes (26): ExpensesScreen(), PurchasesScreen(), DashboardScreen(), fullName(), PosScreen(), BannerKey, ReceiptView(), ReceiptViewProps (+18 more)

### Community 32 - "normalizeUsername"
Cohesion: 0.23
Nodes (13): OnboardingScreen(), handleSubmit(), AddEmployeeScreen(), EditEmployeeScreen(), createEmployee(), nowIso(), onboardBusiness(), toPublicEmployee() (+5 more)

### Community 33 - "auth-repository.ts"
Cohesion: 0.19
Nodes (14): LoginScreen(), TeamScreen(), archiveEmployee(), BusinessRow, EmployeeRow, getBusiness(), listActiveEmployees(), mapEmployeeRow() (+6 more)

### Community 34 - "dashboard.ts"
Cohesion: 0.16
Nodes (18): SalesScreen(), averageTicketMinor(), bucketSalesByPeriod(), CompletedSaleRow, computeDashboardTotals(), DASHBOARD_PERIODS, DashboardTotalsInput, DateLike (+10 more)

### Community 35 - "main.js"
Cohesion: 0.15
Nodes (18): ALLOWED_PERMISSIONS, { app, BrowserWindow, dialog, session, shell }, bootstrap(), configurePermissions(), createWindow(), fs, gotTheLock, installCrossOriginIsolationHeaders() (+10 more)

### Community 36 - "payment-panel.tsx"
Cohesion: 0.16
Nodes (20): METHOD_ICONS, PaymentPanel(), PaymentPanelProps, styles, withoutKey(), card, cash, src_db_index_paymentinput (+12 more)

### Community 37 - "setup.test.tsx"
Cohesion: 0.10
Nodes (19): mockArchiveSupplier, mockBack, mockCompleteSetup, mockCreateSupplier, mockGetBusinessProfile, mockGetRecipeByProductId, mockListCategories, mockListInventoryItems (+11 more)

### Community 38 - "inventory-detail.test.tsx"
Cohesion: 0.10
Nodes (20): adjustmentMovement, freeTextAdjustment, item, mockAdjust, mockGetItem, mockGetProfile, mockHeaderOptions, mockListMovements (+12 more)

### Community 39 - "income-trend-chart.tsx"
Cohesion: 0.18
Nodes (11): victory-native, IncomeTrendChart(), IncomeTrendChartProps, styles, dailyMonth, hourlyDay, mockCartesianProps, monthlyYears (+3 more)

### Community 40 - "app/_layout.tsx"
Cohesion: 0.15
Nodes (14): expo-splash-screen, expo-status-bar, react-native-worklets, RootLayout(), hydrateStores(), AnimatedSplashOverlay(), glowKeyframe, keyframe (+6 more)

### Community 41 - "sales.tsx"
Cohesion: 0.22
Nodes (8): DATE_FILTERS, DateRangeFilter, FilterChip(), STATUS_LABEL_KEY, styles, src_db_index_salefilter, src_db_index_salestatus, src_db_index_salestotals

### Community 42 - "withTransaction"
Cohesion: 0.09
Nodes (34): SupplierEditScreen(), load(), createProductWithStock(), DatabaseAdapter, archiveInventoryItem(), archiveProduct(), archiveSupplier(), createSupplier() (+26 more)

### Community 43 - "language-store.ts"
Cohesion: 0.27
Nodes (9): ref_expo_sqlite_kv_store, zustand, SupportedLanguage, isSupportedLanguage(), LANGUAGE_STORAGE_KEY, LanguageStoreState, SUPPORTED_LANGUAGES, useLanguageStore (+1 more)

### Community 44 - "cart-math.ts"
Cohesion: 0.21
Nodes (14): CartPanel(), useCartErrorMessage(), src_db_index_moneyminor, src_db_index_quantitymilli, src_db_index_saleitem, src_db_index_saleiteminput, SaleItem, cartItemCount() (+6 more)

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

### Community 53 - "secondary-button.tsx"
Cohesion: 0.11
Nodes (24): ref_expo_vector_icons_materialcommunityicons, CredentialKind, LoginErrorKey, LoginStep, styles, fullName(), MoreScreen(), styles (+16 more)

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
Cohesion: 0.42
Nodes (8): getMetadata(), nextDocumentNumber(), nextPurchaseNumber(), nextSaleNumber(), setMetadata(), setSetupCompleted(), mockDb, mockWithTransaction

### Community 59 - "theme-store.ts"
Cohesion: 0.31
Nodes (9): mockMemory, ColorScheme, isThemeMode(), resolveEffectiveScheme(), THEME_MODE_STORAGE_KEY, THEME_MODES, ThemeMode, ThemeStoreState (+1 more)

### Community 60 - "devDependencies"
Cohesion: 0.20
Nodes (10): devDependencies, eslint, eslint-config-expo, jest, jest-expo, react-test-renderer, @testing-library/react-native, @types/jest (+2 more)

### Community 61 - "getBusinessProfile"
Cohesion: 0.18
Nodes (31): InventoryItemEditScreen(), load(), IngredientsScreen(), formatSignedQuantity(), InventoryDetailScreen(), load(), ProductEditScreen(), load() (+23 more)

### Community 62 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, dev, dist, dist:linux, dist:mac, dist:win, export:web, pack (+1 more)

### Community 63 - "finance.ts"
Cohesion: 0.14
Nodes (25): createFinancialCategory(), CreateFinancialCategoryInput, createFinancialTransaction(), createFinancialTransactionWithTxn(), DEFAULT_FINANCIAL_CATEGORIES, DefaultFinancialCategoryLanguage, FinancialCategoryRow, FinancialTransactionRow (+17 more)

### Community 64 - "Expo SDK 57 Stack Baseline"
Cohesion: 0.25
Nodes (8): Anvil (sibling Expo 57 app), Dev / Preview / Release Build Tracks, Expo Router (file-based), Expo SDK 57, Expo SDK 57 Stack Baseline, Testing Strategy (pyramid), Build Variants & EAS Profiles, Testing Setup (jest-expo)

### Community 65 - "InventoryItem"
Cohesion: 0.15
Nodes (11): currentItems, unit, mockItems, mockUnits, categories, inventoryItems, suppliers, src_db_index_ensuredefaultunits (+3 more)

### Community 66 - "tsconfig.json"
Cohesion: 0.25
Nodes (7): expo/tsconfig.base, compilerOptions, paths, strict, extends, include, @/assets/*

### Community 67 - "react-native"
Cohesion: 0.19
Nodes (9): react-native, react-native-safe-area-context, ActiveSheet, styles, BottomSheet(), BottomSheetProps, styles, PulseHighlight() (+1 more)

### Community 68 - "product-image.ts"
Cohesion: 0.31
Nodes (8): expo-file-system, ProductImagePicker(), handlePick(), deleteProductImage(), deriveProductImageExtension(), fileExtension(), pickProductImage(), ProductImagePickResult

### Community 69 - "Color Palette & Accessibility Tokens"
Cohesion: 0.29
Nodes (7): Color Palette & Accessibility Tokens, Definition of Done, Mobile Design Patterns, Platform Layout & Responsiveness, 8pt Spacing Grid & Touch Targets, Tablet Split-View POS, Typography System (native + monospace)

### Community 70 - "app-tabs.web.tsx"
Cohesion: 0.20
Nodes (8): ref_expo_router_ui, CustomTabList(), styles, TAB_LABEL_KEY, TabButton(), TabIconName, TABS, MaxContentWidth

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
Cohesion: 0.25
Nodes (7): PERIOD_LABEL_KEY, PeriodChip(), styles, styles, TopProductsChart(), TopProductsChartProps, src_db_index_held_sale_ttl_hours

### Community 77 - "validation.ts"
Cohesion: 0.22
Nodes (8): PASSWORD_MIN_LENGTH, PIN_MAX_LENGTH, PIN_MIN_LENGTH, PIN_PATTERN, USERNAME_MAX_LENGTH, USERNAME_MIN_LENGTH, USERNAME_PATTERN, ValidationIssue

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

### Community 83 - "team-edit.test.tsx"
Cohesion: 0.29
Nodes (5): mockBack, mockFind, mockUpdate, findActiveEmployeeById(), PublicEmployee

### Community 84 - "dialog/index.ts"
Cohesion: 0.26
Nodes (10): AppDialog(), DialogTone, DialogHost(), ConfirmDialogOptions, ConfirmDialogToggle, DialogRequest, DialogStoreState, dismissDialog() (+2 more)

### Community 85 - "metro.config.js"
Cohesion: 0.50
Nodes (3): config, { getDefaultConfig }, ref_expo_metro_config

### Community 86 - "i18n/types.ts"
Cohesion: 0.33
Nodes (5): i18next, CustomTypeOptions, i18next, NestedKeys, TranslationKey

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
- **638 isolated node(s):** `AppVariant`, `name`, `slug`, `version`, `orientation` (+633 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 763 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Punto Brand Mark (Splash)` and `Punto Splash Icon`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `useTheme()` connect `useTheme` to `products.tsx`, `ThemedText`, `expenses.test.tsx`, `theme.ts`, `db/index.ts`, `i18n/index.ts`, `business-profile-editor.tsx`, `catalog-form.ts`, `theme.test.ts`, `backup.tsx`, `getBusinessId`, `Spacing`, `business-logo.ts`, `formatMoney`, `normalizeUsername`, `auth-repository.ts`, `dashboard.ts`, `payment-panel.tsx`, `income-trend-chart.tsx`, `app/_layout.tsx`, `sales.tsx`, `withTransaction`, `cart-math.ts`, `secondary-button.tsx`, `getBusinessProfile`, `react-native`, `product-image.ts`, `app-tabs.web.tsx`, `(tabs)/index.tsx`, `dialog/index.ts`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **Why does `react-native` connect `react-native` to `products.tsx`, `ThemedText`, `theme.ts`, `db/index.ts`, `i18n/index.ts`, `useTheme`, `business-profile-editor.tsx`, `package.json`, `backup.tsx`, `Spacing`, `business-logo.ts`, `formatMoney`, `payment-panel.tsx`, `income-trend-chart.tsx`, `app/_layout.tsx`, `sales.tsx`, `secondary-button.tsx`, `product-image.ts`, `app-tabs.web.tsx`, `animated-icon.web.tsx`, `(tabs)/index.tsx`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **What connects `AppVariant`, `name`, `slug` to the rest of the system?**
  _638 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `repositories/index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0602655771195097 - nodes in this community are weakly interconnected._
- **Should `getDb` be split into smaller, more focused modules?**
  _Cohesion score 0.10528846153846154 - nodes in this community are weakly interconnected._