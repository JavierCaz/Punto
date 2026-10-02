# Graph Report - punto  (2026-10-02)

## Corpus Check
- 309 files · ~225,580 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 4, .css 2)

## Summary
- 2171 nodes · 8121 edges · 103 communities (95 shown, 8 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 117 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `fcedfce0`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- repositories/index.ts
- client.ts
- theme.test.ts
- repoError
- cash-session-repository.ts
- listSuppliers
- int
- permissions.ts
- theme.ts
- sales.test.tsx
- dependencies
- useTheme
- themed-text.tsx
- business-logo.ts
- package.json
- reports/index.tsx
- catalog-save.ts
- inventory-detail.test.tsx
- cashflow-report-html.ts
- contrast.ts
- expo
- backup.tsx
- catalog-form.ts
- db/index.ts
- cart-store.ts
- backup-format.ts
- auth/index.ts
- finance.ts
- backup.ts
- use-dashboard.ts
- scripts
- receipt-view.test.tsx
- useAuthStore
- auth-repository.ts
- dashboard.ts
- main.js
- payment-panel.tsx
- setup.test.tsx
- i18n/index.ts
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
- pos-checkout.test.tsx
- COEP/COOP Header Injection
- reset-project.js
- Offline-First Architecture
- pbkdf2.ts
- pos.tsx
- theme-store.ts
- devDependencies
- skia-web.web.ts
- scripts
- getDb
- Expo SDK 57 Stack Baseline
- detail.tsx
- tsconfig.json
- BusinessProfileEditor
- Color Palette & Accessibility Tokens
- react-native
- report-pdf.native.test.ts
- validation.ts
- app.config.ts
- animated-icon.web.tsx
- export-web.mjs
- (tabs)/index.tsx
- income-trend-chart.tsx
- withTransaction
- Android Adaptive Icon
- Punto App Icon
- eslint.config.js
- lib/cashflow-report.ts
- receipt/[id].tsx
- product-image.ts
- metro.config.js
- src_i18n_index_i18n
- Expo Icon Composition (Icon Composer Layer Stack)
- backup.test.ts
- Punto Splash Icon
- cashflow-report-fixtures.ts
- Expo Logo Image
- Punto Favicon
- Brand Glow Backdrop Asset
- Architecture Principles
- Punto Product & Engineering Guide
- i18n/types.ts
- onboarding.test.tsx
- pos-tablet.test.tsx
- Theme Accent Personalization
- Product

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 176 edges
2. `getDb()` - 109 edges
3. `getBusinessId()` - 108 edges
4. `react-native` - 92 edges
5. `repoError` - 83 edges
6. `Spacing` - 79 edges
7. `withTransaction()` - 78 edges
8. `ThemedText()` - 76 edges
9. `react` - 73 edges
10. `react-i18next` - 72 edges

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

## Communities (103 total, 8 thin omitted)

### Community 0 - "repositories/index.ts"
Cohesion: 0.06
Nodes (93): CompletedSalePoint, PeriodTotals, SaleRange, TopProduct, assertSufficientStock(), computeChangeMinor(), computeIngredientCostMinor(), computeRecipeConsumptionMilli() (+85 more)

### Community 1 - "client.ts"
Cohesion: 0.11
Nodes (32): OPEN_SESSION_ROW, DATABASE_NAME, init(), resetDbForTesting(), runMigrations(), resetBusinessIdForTesting(), RunResult, SqlValue (+24 more)

### Community 2 - "theme.test.ts"
Cohesion: 0.13
Nodes (18): Accent, ACCENTS, DEFAULT_ACCENT, isAccent(), src_constants_theme_accent, ACCENT_PALETTES, src_constants_theme_accents, ColorScale (+10 more)

### Community 3 - "repoError"
Cohesion: 0.09
Nodes (80): SetupSuppliersScreen(), SupplierEditScreen(), load(), closeSessionWithTxn(), openSessionWithTxn(), toBusinessProfile(), updateBusinessProfileWithTxn(), archiveCategoryWithTxn() (+72 more)

### Community 4 - "cash-session-repository.ts"
Cohesion: 0.09
Nodes (32): ElapsedParts, elapsedSince(), isStale(), closeSession(), openSession(), CashSessionStoreState, STALE_SESSION_HOURS, CASH_SESSION_ERROR (+24 more)

### Community 5 - "listSuppliers"
Cohesion: 0.11
Nodes (38): CategoryEditScreen(), load(), InventoryItemEditScreen(), load(), ProductEditScreen(), load(), PurchaseEditScreen(), load() (+30 more)

### Community 6 - "int"
Cohesion: 0.09
Nodes (42): RFC-4122, mapRow(), ACCENT_COLORS, AccentColor, BusinessProfilePatch, BusinessRow, isAccentColor(), isLocaleCode() (+34 more)

### Community 7 - "permissions.ts"
Cohesion: 0.21
Nodes (12): AUTH_FORBIDDEN, AuthActor, can(), CAPABILITIES, Capability, EMPLOYEE_CAPABILITIES, isForbiddenError(), ROLE_CAPABILITIES (+4 more)

### Community 8 - "theme.ts"
Cohesion: 0.07
Nodes (35): ErrorField, ErrorMessageKey, INITIAL_CURRENCY, OnboardingError, OnboardingStep, styles, AccentOptions(), AccentOptionsProps (+27 more)

### Community 9 - "sales.test.tsx"
Cohesion: 0.13
Nodes (11): mockGetProfile, mockGetSalesTotals, mockListEmployees, mockListPaymentMethods, mockListSales, mockPush, mockUseCan, src_db_index_getsalestotals (+3 more)

### Community 10 - "dependencies"
Cohesion: 0.04
Nodes (46): dependencies, dayjs, expo, expo-clipboard, expo-constants, expo-crypto, expo-dev-client, expo-device (+38 more)

### Community 11 - "useTheme"
Cohesion: 0.07
Nodes (40): expo-router, ref_expo_router_ui, ref_expo_router_unstable_native_tabs, CashSessionLayout(), CategoriesLayout(), ExpensesLayout(), IngredientsLayout(), InventoryLayout() (+32 more)

### Community 12 - "themed-text.tsx"
Cohesion: 0.08
Nodes (29): styles, BottomSheet(), BottomSheetProps, styles, CashSessionOpenSheetProps, styles, FormField(), FormFieldProps (+21 more)

### Community 13 - "business-logo.ts"
Cohesion: 0.17
Nodes (11): expo-file-system, expo-image-picker, BusinessLogoPicker(), handlePick(), BusinessLogoPickResult, deriveImageExtension(), fileExtension(), pickBusinessLogo() (+3 more)

### Community 14 - "package.json"
Cohesion: 0.06
Nodes (35): main, name, private, version, eslint, eslint-config-expo, expo, expo-clipboard (+27 more)

### Community 15 - "reports/index.tsx"
Cohesion: 0.18
Nodes (22): loadReport(), ReportsScreen(), styles, ADMIN_USER, mockPush, MonthStepper(), src_db_index_cashflowreportdata, src_db_index_getcashflowreportdata (+14 more)

### Community 16 - "catalog-save.ts"
Cohesion: 0.09
Nodes (40): src_db_index_adjustquantity, src_db_index_createinventoryitemwithstock, src_db_index_createproductwithstock, src_db_index_deletesupplieritem, src_db_index_listsupplieritems, src_db_index_manual_adjustment_reason, src_db_index_recipedetail, src_db_index_setrecipeactive (+32 more)

### Community 17 - "inventory-detail.test.tsx"
Cohesion: 0.10
Nodes (19): adjustmentMovement, freeTextAdjustment, item, mockAdjust, mockGetItem, mockGetProfile, mockHeaderOptions, mockListMovements (+11 more)

### Community 18 - "cashflow-report-html.ts"
Cohesion: 0.16
Nodes (16): dayjs, ref_dayjs_locale_en, ref_dayjs_locale_es, SupportedLanguage, LanguageStoreState, businessAddress(), CashflowReportHtmlOptions, escapeHtml() (+8 more)

### Community 19 - "contrast.ts"
Cohesion: 0.44
Nodes (7): contrastRatio(), meetsContrast(), minContrastRatio(), parseHex(), relativeLuminance(), TextSize, WcagLevel

### Community 20 - "expo"
Cohesion: 0.07
Nodes (28): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, predictiveBackGestureEnabled, projectId, reactCompiler (+20 more)

### Community 21 - "backup.tsx"
Cohesion: 0.14
Nodes (22): BackupScreen(), load(), formatValidationErrors(), styles, mockAdminUser, mockReplace, mockResetToOnboarding, mockSignOut (+14 more)

### Community 22 - "catalog-form.ts"
Cohesion: 0.11
Nodes (26): CategoriesScreen(), InventoryItemForm(), PurchaseForm(), src_db_index_createproductinput, src_db_index_recipeiteminput, src_db_index_updateproductinput, buildProductCreateInput(), buildProductUpdateInput() (+18 more)

### Community 23 - "db/index.ts"
Cohesion: 0.06
Nodes (71): react, react-i18next, styles, styles, styles, styles, styles, EMPTY_COUNTS (+63 more)

### Community 24 - "cart-store.ts"
Cohesion: 0.09
Nodes (35): useCartErrorMessage(), src_db_index_addsaleitem, src_db_index_cancelsale, src_db_index_completesale, src_db_index_removesaleitem, src_db_index_updatesaleitemquantity, addSaleItem(), checkoutSale() (+27 more)

### Community 25 - "backup-format.ts"
Cohesion: 0.11
Nodes (24): affinityOf(), BACKUP_APP_NAME, BACKUP_APP_VERSION, BACKUP_FORMAT, BACKUP_FORMAT_VERSION, BACKUP_LIMITS, BACKUP_TABLES, BackupColumn (+16 more)

### Community 26 - "auth/index.ts"
Cohesion: 0.14
Nodes (22): businessExists(), AUTH_PHASES, AuthStoreState, isAuthPhase(), OnboardingOutcome, resolveAuthPhase(), SESSION_STORAGE_KEY, SignInOutcome (+14 more)

### Community 27 - "finance.ts"
Cohesion: 0.21
Nodes (16): ExpenseEditScreen(), load(), createFinancialCategory(), createFinancialTransaction(), DEFAULT_FINANCIAL_CATEGORIES, DefaultFinancialCategoryLanguage, ensureDefaultFinancialCategories(), FinancialCategoryRow (+8 more)

### Community 28 - "backup.ts"
Cohesion: 0.16
Nodes (17): BackupImportResult, clearAllData(), deleteAllRows(), ExportDatabaseOptions, formatValidationErrors(), importDatabase(), ImportDatabaseOptions, ImportMode (+9 more)

### Community 29 - "use-dashboard.ts"
Cohesion: 0.13
Nodes (18): src_db_index_completedsalepoint, src_db_index_countheldsales, src_db_index_expirestaleheldsales, src_db_index_getcompletedsalestotals, src_db_index_getfinancialtotals, src_db_index_getpurchaseexpensetotal, src_db_index_getrefundedsalestotals, src_db_index_listcompletedsalesinrange (+10 more)

### Community 30 - "scripts"
Cohesion: 0.08
Nodes (24): scripts, android, build:all, build:android, build:dev, build:dev:android, build:dev:ios, build:ios (+16 more)

### Community 31 - "receipt-view.test.tsx"
Cohesion: 0.33
Nodes (4): baseSale, paymentMethods, NOTE: @testing-library/react-native v14 ships an async `render` (React 19) —, src_db_index_saledetail

### Community 32 - "useAuthStore"
Cohesion: 0.12
Nodes (28): LoginScreen(), ManagerPinScreen(), OnboardingScreen(), handleSubmit(), AddEmployeeScreen(), ErrorKey, FormErrors, styles (+20 more)

### Community 33 - "auth-repository.ts"
Cohesion: 0.19
Nodes (13): archiveEmployee(), BusinessRow, EmployeeRow, getBusiness(), ManagerPinResult, resolveAuthKind(), setAuthorizationPin(), UpdateEmployeeInput (+5 more)

### Community 34 - "dashboard.ts"
Cohesion: 0.18
Nodes (16): averageTicketMinor(), bucketSalesByPeriod(), CompletedSaleRow, DASHBOARD_PERIODS, DashboardTotalsInput, DateLike, evenlySpacedTicks(), formatTrendLabel() (+8 more)

### Community 35 - "main.js"
Cohesion: 0.15
Nodes (18): ALLOWED_PERMISSIONS, { app, BrowserWindow, dialog, session, shell }, bootstrap(), configurePermissions(), createWindow(), fs, gotTheLock, installCrossOriginIsolationHeaders() (+10 more)

### Community 36 - "payment-panel.tsx"
Cohesion: 0.16
Nodes (20): METHOD_ICONS, PaymentPanel(), PaymentPanelProps, styles, withoutKey(), card, cash, src_db_index_paymentinput (+12 more)

### Community 37 - "setup.test.tsx"
Cohesion: 0.10
Nodes (19): mockArchiveSupplier, mockBack, mockCompleteSetup, mockCreateSupplier, mockGetBusinessProfile, mockGetRecipeByProductId, mockListCategories, mockListInventoryItems (+11 more)

### Community 38 - "i18n/index.ts"
Cohesion: 0.19
Nodes (12): expo-localization, LanguageSwitch(), selectLanguage(), styles, setFormatLocale(), DEFAULT_LANGUAGE, detectLanguage(), resolveLanguage() (+4 more)

### Community 39 - "dashboard.test.tsx"
Cohesion: 0.12
Nodes (14): mockCompletedSales, mockCompletedTotals, mockExpireHeld, mockFinancialTotals, mockHeld, mockListEmployees, mockLowStock, mockNavigate (+6 more)

### Community 40 - "app/_layout.tsx"
Cohesion: 0.15
Nodes (14): expo-splash-screen, expo-status-bar, react-native-worklets, RootLayout(), hydrateStores(), AnimatedSplashOverlay(), glowKeyframe, keyframe (+6 more)

### Community 42 - "wizard-step.tsx"
Cohesion: 0.17
Nodes (10): styles, WizardProgress(), WizardProgressProps, styles, WizardStepProps, getWizardStep(), WIZARD_STEP_COUNT, WIZARD_STEPS (+2 more)

### Community 43 - "language-store.ts"
Cohesion: 0.33
Nodes (7): ref_expo_sqlite_kv_store, zustand, isSupportedLanguage(), LANGUAGE_STORAGE_KEY, SUPPORTED_LANGUAGES, useLanguageStore, mockMemory

### Community 44 - "cart-math.ts"
Cohesion: 0.24
Nodes (11): src_db_index_moneyminor, src_db_index_quantitymilli, src_db_index_saleitem, src_db_index_saleiteminput, computeLineSubtotalMinor(), SaleItem, CartLine, cartLineSubtotalMinor() (+3 more)

### Community 45 - "migrations/index.ts"
Cohesion: 0.22
Nodes (10): Database, migration001InitialSchema, migration002Auth, migration003SaleInventoryRestored, migration004ManagerRefundAuth, migration005CashSession, LATEST_SCHEMA_VERSION, migrations (+2 more)

### Community 46 - "backup-roundtrip.integration.test.ts"
Cohesion: 0.18
Nodes (10): ADMIN, buildSchema(), createAdapter(), Row, SEED, snapshot(), SqliteDb, SqliteModule (+2 more)

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
Nodes (11): hasAuthorizationPin(), DEFAULT_LOCKOUT, LockoutConfig, LockoutState, loginLimiter, MANAGER_PIN_LIMITER_KEY, managerPinLimiter, NowFn (+3 more)

### Community 51 - "expenses.test.tsx"
Cohesion: 0.11
Nodes (15): mockBack, mockCreateTransaction, mockEnsureCategories, mockGetProfile, mockListCategories, mockListPaymentMethods, mockListSuppliers, mockListTransactions (+7 more)

### Community 52 - "electron/package.json"
Cohesion: 0.15
Nodes (12): author, description, devDependencies, electron, electron-builder, license, main, name (+4 more)

### Community 53 - "pos-checkout.test.tsx"
Cohesion: 0.14
Nodes (13): cash, completedSale, heldDetail, heldSale, mockCatalog, mockCheckoutSale, mockCreateHeldSale, mockEnsureMethods (+5 more)

### Community 54 - "COEP/COOP Header Injection"
Cohesion: 0.23
Nodes (12): electron-builder Configuration, extraResources dist/ Copy, NSIS / AppImage / DMG Targets, COEP/COOP Header Injection, Cross-Origin Isolation Assertion, Loopback HTTP Server for dist/, main.js (Electron main process), Punto Desktop (Electron shell) (+4 more)

### Community 55 - "reset-project.js"
Cohesion: 0.14
Nodes (12): ref_fs, ref_path, ref_readline, exampleDirPath, fs, oldDirs, path, readline (+4 more)

### Community 56 - "Offline-First Architecture"
Cohesion: 0.25
Nodes (11): JSON Import/Export Backup, Local SQLite Source of Truth, Offline-First Architecture, OPFS Origin-Private SQLite Database, Origin (host+port) Persistence, expo-sqlite Web Concurrency Sensitivity, getDb() Singleton & Migrations, JSON Export/Import Portability (+3 more)

### Community 57 - "pbkdf2.ts"
Cohesion: 0.18
Nodes (10): ref_noble_hashes_pbkdf2_js, ref_noble_hashes_sha2_js, ref_noble_hashes_utils_js, react-native-quick-crypto, PBKDF2_DK_BYTES, PBKDF2_DK_BYTES, noblePbkdf2Hex(), PBKDF2_DK_BYTES (+2 more)

### Community 58 - "pos.tsx"
Cohesion: 0.06
Nodes (65): CloseCashSessionScreen(), row(), styles, CashSessionDetailScreen(), employeeName(), styles, CashSessionHistoryScreen(), employeeName() (+57 more)

### Community 59 - "theme-store.ts"
Cohesion: 0.31
Nodes (9): mockMemory, ColorScheme, isThemeMode(), resolveEffectiveScheme(), THEME_MODE_STORAGE_KEY, THEME_MODES, ThemeMode, ThemeStoreState (+1 more)

### Community 60 - "devDependencies"
Cohesion: 0.20
Nodes (10): devDependencies, eslint, eslint-config-expo, jest, jest-expo, react-test-renderer, @testing-library/react-native, @types/jest (+2 more)

### Community 61 - "skia-web.web.ts"
Cohesion: 0.40
Nodes (3): ref_canvaskit_wasm_bin_full_canvaskit_wasm, ref_shopify_react_native_skia_lib_module_web, ensureSkiaWeb()

### Community 62 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, dev, dist, dist:linux, dist:mac, dist:win, export:web, pack (+1 more)

### Community 63 - "getDb"
Cohesion: 0.12
Nodes (40): getActiveSession(), getSessionById(), hasAnySession(), listSessions(), getDb(), countHeldSales(), getCompletedSalesTotals(), getFinancialTotals() (+32 more)

### Community 64 - "Expo SDK 57 Stack Baseline"
Cohesion: 0.25
Nodes (8): Anvil (sibling Expo 57 app), Dev / Preview / Release Build Tracks, Expo Router (file-based), Expo SDK 57, Expo SDK 57 Stack Baseline, Testing Strategy (pyramid), Build Variants & EAS Profiles, Testing Setup (jest-expo)

### Community 65 - "detail.tsx"
Cohesion: 0.16
Nodes (22): IngredientsScreen(), formatSignedQuantity(), InventoryDetailScreen(), load(), resolveSupplierForItem(), styles, InventoryScreen(), styles (+14 more)

### Community 66 - "tsconfig.json"
Cohesion: 0.25
Nodes (7): expo/tsconfig.base, compilerOptions, paths, strict, extends, include, @/assets/*

### Community 68 - "BusinessProfileEditor"
Cohesion: 0.29
Nodes (10): BusinessProfileEditor(), handleSave(), load(), CURRENCY_CODES, DEFAULT_CURRENCY, isCurrencyCode(), NOTE: this is a PRODUCT/UI choice, not a schema constraint. The `business`, resolveDefaultCurrency() (+2 more)

### Community 69 - "Color Palette & Accessibility Tokens"
Cohesion: 0.29
Nodes (7): Color Palette & Accessibility Tokens, Definition of Done, Mobile Design Patterns, Platform Layout & Responsiveness, 8pt Spacing Grid & Touch Targets, Tablet Split-View POS, Typography System (native + monospace)

### Community 70 - "react-native"
Cohesion: 0.09
Nodes (60): expo-image, ref_expo_vector_icons_materialcommunityicons, react-native, react-native-safe-area-context, styles, styles, styles, styles (+52 more)

### Community 71 - "report-pdf.native.test.ts"
Cohesion: 0.27
Nodes (8): expo-print, expo-sharing, exportReportPdf(), PAGE_MARGINS, readLogoDataUri(), mockFiles, mockMove, move()

### Community 72 - "validation.ts"
Cohesion: 0.22
Nodes (8): PASSWORD_MIN_LENGTH, PIN_MAX_LENGTH, PIN_MIN_LENGTH, PIN_PATTERN, USERNAME_MAX_LENGTH, USERNAME_MIN_LENGTH, USERNAME_PATTERN, ValidationIssue

### Community 74 - "animated-icon.web.tsx"
Cohesion: 0.22
Nodes (6): react-native-reanimated, src_components_animated_icon_module, glowKeyframe, keyframe, logoKeyframe, styles

### Community 75 - "export-web.mjs"
Cohesion: 0.33
Nodes (5): projectRoot, result, ref_node_child_process, ref_node_path, ref_node_url

### Community 76 - "(tabs)/index.tsx"
Cohesion: 0.17
Nodes (12): victory-native, IncomeTrendChart, PERIOD_LABEL_KEY, PeriodChip(), styles, TopProductsChart, styles, TopProductsChart() (+4 more)

### Community 77 - "income-trend-chart.tsx"
Cohesion: 0.20
Nodes (9): IncomeTrendChart(), IncomeTrendChartProps, styles, dailyMonth, hourlyDay, mockCartesianProps, monthlyYears, MAX_TREND_AXIS_TICKS (+1 more)

### Community 78 - "withTransaction"
Cohesion: 0.07
Nodes (44): expo-sqlite, getMetadata(), getSetupCompleted(), nextDocumentNumber(), nextPurchaseNumber(), nextSaleNumber(), setMetadata(), setSetupCompleted() (+36 more)

### Community 79 - "Android Adaptive Icon"
Cohesion: 0.60
Nodes (5): Android Adaptive Icon Background Layer, Android Adaptive Icon, Android Adaptive Icon Foreground Mark, Adaptive Icon Layer Separation Design, Android Adaptive Icon Monochrome Layer

### Community 80 - "Punto App Icon"
Cohesion: 0.60
Nodes (5): Blue Radial Gradient Background, Punto Brand Identity, Chevron / Upward Caret Glyph, Subtle Crosshair Grid Pattern, Punto App Icon

### Community 81 - "eslint.config.js"
Cohesion: 0.40
Nodes (4): { defineConfig }, expoConfig, ref_eslint_config, ref_eslint_config_expo_flat

### Community 82 - "lib/cashflow-report.ts"
Cohesion: 0.36
Nodes (8): sumMinor(), buildCashflowReport(), byCreatedAt(), CashflowSummary, ExpenseCategoryGroup, groupExpenses(), PREVIOUS_MONTH_DEFAULT_DAYS, computeDashboardTotals()

### Community 83 - "receipt/[id].tsx"
Cohesion: 0.14
Nodes (20): fullName(), ReceiptScreen(), styles, cash, completedSale, mockBack, mockGetSaleById, mockListPaymentMethods (+12 more)

### Community 84 - "product-image.ts"
Cohesion: 0.36
Nodes (7): ProductImagePicker(), handlePick(), deleteProductImage(), deriveProductImageExtension(), fileExtension(), pickProductImage(), ProductImagePickResult

### Community 85 - "metro.config.js"
Cohesion: 0.50
Nodes (3): config, { getDefaultConfig }, ref_expo_metro_config

### Community 86 - "src_i18n_index_i18n"
Cohesion: 0.10
Nodes (13): @testing-library/react-native, SettingsScreen(), mockCatalog, mockHeaderOptions, mockGetBusinessProfile, mockUpdateBusinessProfile, profile, suppliers (+5 more)

### Community 87 - "Expo Icon Composition (Icon Composer Layer Stack)"
Cohesion: 1.00
Nodes (3): Expo Icon Composition (Icon Composer Layer Stack), Expo Symbol (White Chevron Mark), Icon Grid Overlay (Transparent 1024x1024)

### Community 88 - "backup.test.ts"
Cohesion: 0.19
Nodes (14): makeDocument(), exportDatabase(), normalizeRow(), ADMIN, makeImportDoc(), queueAllTables(), queueSchema(), TABLE_INFO (+6 more)

### Community 89 - "Punto Splash Icon"
Cohesion: 1.00
Nodes (3): Punto Splash Icon, Punto Brand Mark (Splash), App Splash Screen Identity

### Community 90 - "cashflow-report-fixtures.ts"
Cohesion: 0.38
Nodes (6): dataFor(), BusinessProfile, CashflowReportData, BUSINESS, entry(), septemberData()

### Community 96 - "Architecture Principles"
Cohesion: 0.33
Nodes (6): Architecture Principles, i18n (es + en) Convention, Money, Data & Language Conventions, Zustand Global State, i18n Bootstrap (es canonical), Money as INTEGER Minor Units

### Community 97 - "Punto Product & Engineering Guide"
Cohesion: 0.33
Nodes (6): Brand Personality, Punto Product Vision, Punto Product & Engineering Guide, CLAUDE.md @AGENTS.md Include, Punto README, Punto Tech Stack Table

### Community 98 - "i18n/types.ts"
Cohesion: 0.33
Nodes (5): i18next, CustomTypeOptions, i18next, NestedKeys, TranslationKey

### Community 99 - "onboarding.test.tsx"
Cohesion: 0.33
Nodes (4): mockCompleteOnboarding, mockPickBusinessLogo, mockReplace, Queries

### Community 100 - "pos-tablet.test.tsx"
Cohesion: 0.33
Nodes (5): mockCatalog, mockEnsureMethods, mockListSales, src_db_index_ensuredefaultpaymentmethods, src_db_index_listsales

### Community 101 - "Theme Accent Personalization"
Cohesion: 0.50
Nodes (5): Business Profile Domain, Theme Accent Personalization, Customization & White-Label, theme-store (persisted light/dark override), Theming via Design Tokens

### Community 102 - "Product"
Cohesion: 0.67
Nodes (3): Product, RecipeDetail, ExistingProduct

## Ambiguous Edges - Review These
- `Punto Brand Mark (Splash)` → `Punto Splash Icon`  [AMBIGUOUS]
  assets/images/splash-icon.png · relation: conceptually_related_to

## Knowledge Gaps
- **687 isolated node(s):** `AppVariant`, `name`, `slug`, `version`, `orientation` (+682 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 828 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Punto Brand Mark (Splash)` and `Punto Splash Icon`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `useTheme()` connect `useTheme` to `theme.test.ts`, `repoError`, `cash-session-repository.ts`, `listSuppliers`, `theme.ts`, `themed-text.tsx`, `business-logo.ts`, `reports/index.tsx`, `backup.tsx`, `catalog-form.ts`, `db/index.ts`, `finance.ts`, `useAuthStore`, `payment-panel.tsx`, `app/_layout.tsx`, `wizard-step.tsx`, `pos.tsx`, `detail.tsx`, `BusinessProfileEditor`, `react-native`, `(tabs)/index.tsx`, `income-trend-chart.tsx`, `receipt/[id].tsx`, `product-image.ts`, `src_i18n_index_i18n`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Why does `getDb()` connect `getDb` to `repositories/index.ts`, `client.ts`, `repoError`, `cash-session-repository.ts`, `listSuppliers`, `int`, `backup.tsx`, `db/index.ts`, `cart-store.ts`, `auth/index.ts`, `finance.ts`, `backup.ts`, `useAuthStore`, `auth-repository.ts`, `app/_layout.tsx`, `backup-roundtrip.integration.test.ts`, `hash.ts`, `auth-repository.test.ts`, `pos.tsx`, `detail.tsx`, `withTransaction`, `receipt/[id].tsx`, `backup.test.ts`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **What connects `AppVariant`, `name`, `slug` to the rest of the system?**
  _687 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `repositories/index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05501618122977346 - nodes in this community are weakly interconnected._
- **Should `client.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11312764670296431 - nodes in this community are weakly interconnected._