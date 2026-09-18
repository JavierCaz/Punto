# Graph Report - punto  (2026-09-18)

## Corpus Check
- 277 files · ~209,731 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 4, .css 2)

## Summary
- 2010 nodes · 7346 edges · 96 communities (87 shown, 9 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 109 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2ae11416`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- repositories/index.ts
- backup.ts
- business-profile-editor.tsx
- repoError
- payment-panel.tsx
- dialog/index.ts
- inventory-item.ts
- auth/index.ts
- theme.ts
- sales.test.tsx
- dependencies
- useTheme
- expenses/edit.tsx
- onboarding.tsx
- package.json
- catalog-save.ts
- catalog-save.test.ts
- payment-method.ts
- pos-checkout.test.tsx
- accent-options.tsx
- expo
- backup.tsx
- product-form.tsx
- ThemedText
- cart-store.ts
- backup-format.ts
- useAuthStore
- business-logo.ts
- BackupStats
- use-dashboard.ts
- scripts
- receipt-view.tsx
- validation.ts
- auth-repository.ts
- dashboard.ts
- main.js
- payment.ts
- setup.test.tsx
- inventory-detail.test.tsx
- dashboard.test.tsx
- app/_layout.tsx
- assets.d.ts
- listUnits
- language-switch.tsx
- cart-math.ts
- migrations/index.ts
- createAdapter
- Domain Model & Schema
- static-server.js
- hash.ts
- lockout.ts
- expenses.test.tsx
- electron/package.json
- Architecture Principles
- COEP/COOP Header Injection
- reset-project.js
- Offline-First Architecture
- pbkdf2.ts
- format.ts
- theme-store.ts
- devDependencies
- Punto Product & Engineering Guide
- scripts
- getDb
- Expo SDK 57 Stack Baseline
- db/index.ts
- tsconfig.json
- product-image.ts
- Color Palette & Accessibility Tokens
- react-native
- Theme Accent Personalization
- unit.ts
- app.config.ts
- animated-icon.web.tsx
- export-web.mjs
- skia-web.ts
- income-trend-chart.tsx
- app-metadata.ts
- Android Adaptive Icon
- Punto App Icon
- eslint.config.js
- getBusinessProfile
- receipt/[id].tsx
- wizard.ts
- metro.config.js
- i18n/index.ts
- Expo Icon Composition (Icon Composer Layer Stack)
- backup.test.tsx
- Punto Splash Icon
- i18n/types.ts
- Expo Logo Image
- Punto Favicon
- Brand Glow Backdrop Asset

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 160 edges
2. `getDb()` - 96 edges
3. `getBusinessId()` - 94 edges
4. `react-native` - 86 edges
5. `repoError` - 76 edges
6. `withTransaction()` - 75 edges
7. `Spacing` - 72 edges
8. `ThemedText()` - 69 edges
9. `react` - 67 edges
10. `react-i18next` - 65 edges

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

## Communities (96 total, 9 thin omitted)

### Community 0 - "repositories/index.ts"
Cohesion: 0.05
Nodes (96): CompletedSalePoint, PeriodTotals, SaleRange, TopProduct, assertSufficientStock(), computeChangeMinor(), computeIngredientCostMinor(), computeRecipeConsumptionMilli() (+88 more)

### Community 1 - "backup.ts"
Cohesion: 0.06
Nodes (63): ADMIN_ROW, ADMIN_SESSION, EMPLOYEE_ROW, Database, DATABASE_NAME, init(), resetDbForTesting(), runMigrations() (+55 more)

### Community 2 - "business-profile-editor.tsx"
Cohesion: 0.14
Nodes (19): BusinessProfileEditor(), handleSave(), load(), SaveStatus, styles, mockGetBusinessProfile, mockUpdateBusinessProfile, profile (+11 more)

### Community 3 - "repoError"
Cohesion: 0.10
Nodes (71): createInventoryItemWithStock(), createProductWithStock(), CreateProductWithStockOptions, archiveCategoryWithTxn(), createCategoryWithTxn(), updateCategoryWithTxn(), nowIso(), mapSqliteError() (+63 more)

### Community 4 - "payment-panel.tsx"
Cohesion: 0.17
Nodes (12): MaterialIconName, ListRow(), ListRowProps, styles, OptionRow(), OptionRowProps, METHOD_ICONS, PaymentPanelProps (+4 more)

### Community 5 - "dialog/index.ts"
Cohesion: 0.26
Nodes (10): AppDialog(), DialogTone, DialogHost(), ConfirmDialogOptions, ConfirmDialogToggle, DialogRequest, DialogStoreState, dismissDialog() (+2 more)

### Community 6 - "inventory-item.ts"
Cohesion: 0.09
Nodes (50): RFC-4122, expo-sqlite, ACCENT_COLORS, AccentColor, BusinessProfile, BusinessProfilePatch, BusinessRow, isAccentColor() (+42 more)

### Community 7 - "auth/index.ts"
Cohesion: 0.18
Nodes (19): setAuthorizationPin(), AUTH_FORBIDDEN, AuthActor, can(), CAPABILITIES, Capability, EMPLOYEE_CAPABILITIES, ForbiddenError (+11 more)

### Community 8 - "theme.ts"
Cohesion: 0.09
Nodes (29): DATE_FILTERS, DateRangeFilter, FilterChip(), STATUS_LABEL_KEY, styles, CartLineRow(), CartLineRowProps, styles (+21 more)

### Community 9 - "sales.test.tsx"
Cohesion: 0.13
Nodes (11): mockGetProfile, mockGetSalesTotals, mockListEmployees, mockListPaymentMethods, mockListSales, mockPush, mockUseCan, src_db_index_getsalestotals (+3 more)

### Community 10 - "dependencies"
Cohesion: 0.04
Nodes (45): dependencies, dayjs, expo, expo-clipboard, expo-constants, expo-crypto, expo-dev-client, expo-device (+37 more)

### Community 11 - "useTheme"
Cohesion: 0.07
Nodes (37): expo-router, ref_expo_router_ui, ref_expo_router_unstable_native_tabs, victory-native, CategoriesLayout(), ExpensesScreen(), ExpensesLayout(), IngredientsLayout() (+29 more)

### Community 12 - "expenses/edit.tsx"
Cohesion: 0.08
Nodes (26): styles, ErrorKey, FormErrors, styles, ErrorKey, FormErrors, styles, PublicEmployee (+18 more)

### Community 13 - "onboarding.tsx"
Cohesion: 0.16
Nodes (16): expo-localization, ErrorField, ErrorMessageKey, INITIAL_CURRENCY, OnboardingError, OnboardingStep, styles, BusinessLogoError (+8 more)

### Community 14 - "package.json"
Cohesion: 0.05
Nodes (36): main, name, private, version, eslint, eslint-config-expo, expo, expo-clipboard (+28 more)

### Community 15 - "catalog-save.ts"
Cohesion: 0.18
Nodes (17): src_db_index_manual_adjustment_reason, updateInventoryItem(), adjustQuantity(), MANUAL_ADJUSTMENT_REASON, Product, updateProduct(), RecipeDetail, setRecipeActive() (+9 more)

### Community 16 - "catalog-save.test.ts"
Cohesion: 0.08
Nodes (23): src_db_index_createinventoryitemwithstock, src_db_index_createproductwithstock, src_db_index_deletesupplieritem, src_db_index_listsupplieritems, src_db_index_recipedetail, src_db_index_setrecipeactive, src_db_index_updateinventoryitem, src_db_index_updateproduct (+15 more)

### Community 17 - "payment-method.ts"
Cohesion: 0.27
Nodes (10): createPaymentMethod(), CreatePaymentMethodInput, DEFAULT_PAYMENT_METHODS, DefaultPaymentMethodLanguage, isPaymentType(), PaymentMethodRow, updatePaymentMethod(), UpdatePaymentMethodInput (+2 more)

### Community 18 - "pos-checkout.test.tsx"
Cohesion: 0.13
Nodes (14): cash, completedSale, heldDetail, heldSale, mockCatalog, mockCheckoutSale, mockCreateHeldSale, mockEnsureMethods (+6 more)

### Community 19 - "accent-options.tsx"
Cohesion: 0.12
Nodes (24): AccentOptions(), AccentOptionsProps, styles, ACCENTS, src_constants_theme_accent, ACCENT_PALETTES, src_constants_theme_accents, buildPalette() (+16 more)

### Community 20 - "expo"
Cohesion: 0.07
Nodes (28): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, predictiveBackGestureEnabled, projectId, reactCompiler (+20 more)

### Community 21 - "backup.tsx"
Cohesion: 0.24
Nodes (13): BackupScreen(), load(), formatValidationErrors(), styles, backupSharingAvailable(), copyBackupToClipboard(), pickBackupFile(), shareBackupFile() (+5 more)

### Community 22 - "product-form.tsx"
Cohesion: 0.12
Nodes (17): AdvancedSection(), AdvancedSectionProps, styles, ProductFormProps, styles, ProductImageError, RecipeEditor(), RecipeEditorProps (+9 more)

### Community 23 - "ThemedText"
Cohesion: 0.06
Nodes (61): react-i18next, styles, styles, SettingsScreen(), styles, styles, EMPTY_COUNTS, SetupCounts (+53 more)

### Community 24 - "cart-store.ts"
Cohesion: 0.10
Nodes (25): src_db_index_addsaleitem, src_db_index_cancelsale, src_db_index_completesale, src_db_index_paymentinput, src_db_index_removesaleitem, src_db_index_updatesaleitemquantity, PaymentInput, SaleDetail (+17 more)

### Community 25 - "backup-format.ts"
Cohesion: 0.10
Nodes (25): affinityOf(), BACKUP_APP_NAME, BACKUP_APP_VERSION, BACKUP_FORMAT, BACKUP_FORMAT_VERSION, BACKUP_LIMITS, BackupColumn, BackupParseResult (+17 more)

### Community 26 - "useAuthStore"
Cohesion: 0.13
Nodes (20): businessExists(), onboardBusiness(), AUTH_PHASES, AuthStoreState, isAuthPhase(), OnboardingOutcome, resolveAuthPhase(), SESSION_STORAGE_KEY (+12 more)

### Community 27 - "business-logo.ts"
Cohesion: 0.17
Nodes (11): expo-file-system, expo-image-picker, BusinessLogoPicker(), handlePick(), BusinessLogoPickResult, deriveImageExtension(), fileExtension(), pickBusinessLogo() (+3 more)

### Community 29 - "use-dashboard.ts"
Cohesion: 0.13
Nodes (18): src_db_index_completedsalepoint, src_db_index_countheldsales, src_db_index_expirestaleheldsales, src_db_index_getcompletedsalestotals, src_db_index_getpurchaseexpensetotal, src_db_index_getrefundedsalestotals, src_db_index_listcompletedsalesinrange, src_db_index_listlowstockitems (+10 more)

### Community 30 - "scripts"
Cohesion: 0.08
Nodes (24): scripts, android, build:all, build:android, build:dev, build:dev:android, build:dev:ios, build:ios (+16 more)

### Community 31 - "receipt-view.tsx"
Cohesion: 0.13
Nodes (13): BannerKey, ReceiptView(), ReceiptViewProps, resolveBanner(), STATUS_BANNER, STATUS_LABEL_KEY, STATUS_TONE, StatusLabelKey (+5 more)

### Community 32 - "validation.ts"
Cohesion: 0.13
Nodes (20): LoginScreen(), ManagerPinScreen(), OnboardingScreen(), handleSubmit(), AddEmployeeScreen(), createEmployee(), resolveAuthKind(), normalizeUsername() (+12 more)

### Community 33 - "auth-repository.ts"
Cohesion: 0.14
Nodes (20): EditEmployeeScreen(), TeamScreen(), mockBack, mockFind, mockUpdate, archiveEmployee(), BusinessRow, EmployeeRow (+12 more)

### Community 34 - "dashboard.ts"
Cohesion: 0.17
Nodes (17): SalesScreen(), averageTicketMinor(), bucketSalesByPeriod(), computeDashboardTotals(), DASHBOARD_PERIODS, DashboardTotalsInput, DateLike, dayRange (+9 more)

### Community 35 - "main.js"
Cohesion: 0.15
Nodes (18): ALLOWED_PERMISSIONS, { app, BrowserWindow, dialog, session, shell }, bootstrap(), configurePermissions(), createWindow(), fs, gotTheLock, installCrossOriginIsolationHeaders() (+10 more)

### Community 36 - "payment.ts"
Cohesion: 0.20
Nodes (14): PaymentPanel(), withoutKey(), src_db_index_paymentmethod, PaymentMethod, buildPaymentInputs(), changeForAllocation(), PaymentAllocation, PaymentIssue (+6 more)

### Community 37 - "setup.test.tsx"
Cohesion: 0.10
Nodes (19): mockArchiveSupplier, mockBack, mockCompleteSetup, mockCreateSupplier, mockGetBusinessProfile, mockGetRecipeByProductId, mockListCategories, mockListInventoryItems (+11 more)

### Community 38 - "inventory-detail.test.tsx"
Cohesion: 0.10
Nodes (20): adjustmentMovement, freeTextAdjustment, item, mockAdjust, mockGetItem, mockGetProfile, mockHeaderOptions, mockListMovements (+12 more)

### Community 39 - "dashboard.test.tsx"
Cohesion: 0.11
Nodes (15): DashboardScreen(), mockCompletedSales, mockCompletedTotals, mockExpireHeld, mockFinancialTotals, mockHeld, mockListEmployees, mockLowStock (+7 more)

### Community 40 - "app/_layout.tsx"
Cohesion: 0.15
Nodes (14): expo-splash-screen, expo-status-bar, react-native-worklets, RootLayout(), hydrateStores(), AnimatedSplashOverlay(), glowKeyframe, keyframe (+6 more)

### Community 42 - "listUnits"
Cohesion: 0.25
Nodes (15): InventoryItemEditScreen(), load(), IngredientsScreen(), formatSignedQuantity(), InventoryDetailScreen(), load(), resolveSupplierForItem(), InventoryScreen() (+7 more)

### Community 43 - "language-switch.tsx"
Cohesion: 0.18
Nodes (14): ref_expo_sqlite_kv_store, zustand, LanguageSwitch(), selectLanguage(), styles, detectLanguage(), resolveLanguage(), SupportedLanguage (+6 more)

### Community 44 - "cart-math.ts"
Cohesion: 0.21
Nodes (13): CartPanel(), useCartErrorMessage(), src_db_index_moneyminor, src_db_index_quantitymilli, src_db_index_saleitem, src_db_index_saleiteminput, computeLineSubtotalMinor(), SaleItem (+5 more)

### Community 45 - "migrations/index.ts"
Cohesion: 0.26
Nodes (8): migration001InitialSchema, migration002Auth, migration003SaleInventoryRestored, migration004ManagerRefundAuth, LATEST_SCHEMA_VERSION, migrations, Recording, Migration

### Community 46 - "createAdapter"
Cohesion: 0.21
Nodes (6): buildSchema(), createAdapter(), SEED, snapshot(), SqliteDb, SqliteStatement

### Community 47 - "Domain Model & Schema"
Cohesion: 0.21
Nodes (15): Catalog Domain, Earnings / Dashboard, Domain Model & Schema, Employees Domain, Income & Outcome Tracking, Ingredients Domain, Stock / Inventory Domain, Payments Domain (split payment) (+7 more)

### Community 48 - "static-server.js"
Cohesion: 0.18
Nodes (12): createStaticServer(), fs, fsp, getContentType(), http, isLoopbackHost(), MIME_TYPES, path (+4 more)

### Community 49 - "hash.ts"
Cohesion: 0.28
Nodes (14): expo-crypto, nowIso(), signIn(), verifyManagerAuthorizationPin(), constantTimeEqualHex(), deriveKey(), generateSalt(), HashOptions (+6 more)

### Community 50 - "lockout.ts"
Cohesion: 0.17
Nodes (7): DEFAULT_LOCKOUT, LockoutConfig, LockoutState, loginLimiter, MANAGER_PIN_LIMITER_KEY, managerPinLimiter, NowFn

### Community 51 - "expenses.test.tsx"
Cohesion: 0.11
Nodes (15): mockBack, mockCreateTransaction, mockEnsureCategories, mockGetProfile, mockListCategories, mockListPaymentMethods, mockListSuppliers, mockListTransactions (+7 more)

### Community 52 - "electron/package.json"
Cohesion: 0.15
Nodes (12): author, description, devDependencies, electron, electron-builder, license, main, name (+4 more)

### Community 53 - "Architecture Principles"
Cohesion: 0.33
Nodes (6): Architecture Principles, i18n (es + en) Convention, Money, Data & Language Conventions, Zustand Global State, i18n Bootstrap (es canonical), Money as INTEGER Minor Units

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

### Community 58 - "format.ts"
Cohesion: 0.23
Nodes (13): dayjs, ref_dayjs_locale_en, ref_dayjs_locale_es, buildNumberFormat(), formatDate(), formatDateTime(), formatQuantity(), formatTime() (+5 more)

### Community 59 - "theme-store.ts"
Cohesion: 0.23
Nodes (13): NOTE: @testing-library/react-native v14 ships an async `render` (React 19) —, styles, ThemeSwitch(), useEffectiveColorScheme(), mockMemory, ColorScheme, isThemeMode(), resolveEffectiveScheme() (+5 more)

### Community 60 - "devDependencies"
Cohesion: 0.20
Nodes (10): devDependencies, eslint, eslint-config-expo, jest, jest-expo, react-test-renderer, @testing-library/react-native, @types/jest (+2 more)

### Community 61 - "Punto Product & Engineering Guide"
Cohesion: 0.33
Nodes (6): Brand Personality, Punto Product Vision, Punto Product & Engineering Guide, CLAUDE.md @AGENTS.md Include, Punto README, Punto Tech Stack Table

### Community 62 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, dev, dist, dist:linux, dist:mac, dist:win, export:web, pack (+1 more)

### Community 63 - "getDb"
Cohesion: 0.08
Nodes (59): CategoryEditScreen(), load(), ExpenseEditScreen(), load(), SetupCategoriesScreen(), SetupSuppliersScreen(), SupplierEditScreen(), load() (+51 more)

### Community 64 - "Expo SDK 57 Stack Baseline"
Cohesion: 0.25
Nodes (8): Anvil (sibling Expo 57 app), Dev / Preview / Release Build Tracks, Expo Router (file-based), Expo SDK 57, Expo SDK 57 Stack Baseline, Testing Strategy (pyramid), Build Variants & EAS Profiles, Testing Setup (jest-expo)

### Community 65 - "db/index.ts"
Cohesion: 0.05
Nodes (63): CategoriesScreen(), styles, styles, styles, styles, currentItems, unit, InventoryItemForm() (+55 more)

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
Nodes (55): ref_expo_vector_icons_materialcommunityicons, react, react-native, react-native-safe-area-context, styles, styles, styles, CredentialKind (+47 more)

### Community 71 - "Theme Accent Personalization"
Cohesion: 0.50
Nodes (5): Business Profile Domain, Theme Accent Personalization, Customization & White-Label, theme-store (persisted light/dark override), Theming via Design Tokens

### Community 72 - "unit.ts"
Cohesion: 0.30
Nodes (13): UnitType, createUnit(), CreateUnitInput, createUnitWithTxn(), DEFAULT_UNITS, getUnitById(), isUnitType(), mapUnitRow() (+5 more)

### Community 74 - "animated-icon.web.tsx"
Cohesion: 0.20
Nodes (7): expo-image, react-native-reanimated, src_components_animated_icon_module, glowKeyframe, keyframe, logoKeyframe, styles

### Community 75 - "export-web.mjs"
Cohesion: 0.33
Nodes (5): projectRoot, result, ref_node_child_process, ref_node_path, ref_node_url

### Community 76 - "skia-web.ts"
Cohesion: 0.29
Nodes (5): ref_canvaskit_wasm_bin_full_canvaskit_wasm, ref_shopify_react_native_skia_lib_module_web, IncomeTrendChart, TopProductsChart, ensureSkiaWeb()

### Community 77 - "income-trend-chart.tsx"
Cohesion: 0.20
Nodes (10): IncomeTrendChart(), IncomeTrendChartProps, styles, dailyMonth, hourlyDay, mockCartesianProps, monthlyYears, formatTrendLabel() (+2 more)

### Community 78 - "app-metadata.ts"
Cohesion: 0.38
Nodes (9): getMetadata(), getSetupCompleted(), nextDocumentNumber(), nextPurchaseNumber(), nextSaleNumber(), setMetadata(), setSetupCompleted(), mockDb (+1 more)

### Community 79 - "Android Adaptive Icon"
Cohesion: 0.60
Nodes (5): Android Adaptive Icon Background Layer, Android Adaptive Icon, Android Adaptive Icon Foreground Mark, Adaptive Icon Layer Separation Design, Android Adaptive Icon Monochrome Layer

### Community 80 - "Punto App Icon"
Cohesion: 0.60
Nodes (5): Blue Radial Gradient Background, Punto Brand Identity, Chevron / Upward Caret Glyph, Subtle Crosshair Grid Pattern, Punto App Icon

### Community 81 - "eslint.config.js"
Cohesion: 0.40
Nodes (4): { defineConfig }, expoConfig, ref_eslint_config, ref_eslint_config_expo_flat

### Community 82 - "getBusinessProfile"
Cohesion: 0.30
Nodes (17): ProductEditScreen(), load(), PurchaseEditScreen(), load(), PurchasesScreen(), SetupFinishScreen(), SetupIngredientsScreen(), SetupProductsScreen() (+9 more)

### Community 83 - "receipt/[id].tsx"
Cohesion: 0.15
Nodes (19): fullName(), ReceiptScreen(), styles, cash, completedSale, mockBack, mockGetSaleById, mockListPaymentMethods (+11 more)

### Community 84 - "wizard.ts"
Cohesion: 0.29
Nodes (4): WIZARD_STEP_COUNT, WIZARD_STEPS, WizardStepDescriptor, WizardStepId

### Community 85 - "metro.config.js"
Cohesion: 0.50
Nodes (3): config, { getDefaultConfig }, ref_expo_metro_config

### Community 86 - "i18n/index.ts"
Cohesion: 0.07
Nodes (26): @testing-library/react-native, fullName(), PosScreen(), mockCompleteOnboarding, mockPickBusinessLogo, mockReplace, Queries, mockCatalog (+18 more)

### Community 87 - "Expo Icon Composition (Icon Composer Layer Stack)"
Cohesion: 1.00
Nodes (3): Expo Icon Composition (Icon Composer Layer Stack), Expo Symbol (White Chevron Mark), Icon Grid Overlay (Transparent 1024x1024)

### Community 88 - "backup.test.tsx"
Cohesion: 0.13
Nodes (19): makeDocument(), mockAdminUser, mockReplace, mockResetToOnboarding, mockSignOut, src_db_index_clearalldata, src_db_index_exportdatabase, src_db_index_importdatabase (+11 more)

### Community 89 - "Punto Splash Icon"
Cohesion: 1.00
Nodes (3): Punto Splash Icon, Punto Brand Mark (Splash), App Splash Screen Identity

### Community 90 - "i18n/types.ts"
Cohesion: 0.33
Nodes (5): i18next, CustomTypeOptions, i18next, NestedKeys, TranslationKey

## Ambiguous Edges - Review These
- `Punto Brand Mark (Splash)` → `Punto Splash Icon`  [AMBIGUOUS]
  assets/images/splash-icon.png · relation: conceptually_related_to

## Knowledge Gaps
- **658 isolated node(s):** `AppVariant`, `name`, `slug`, `version`, `orientation` (+653 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 789 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Punto Brand Mark (Splash)` and `Punto Splash Icon`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Why does `react-native` connect `react-native` to `business-profile-editor.tsx`, `payment-panel.tsx`, `theme.ts`, `useTheme`, `expenses/edit.tsx`, `onboarding.tsx`, `package.json`, `accent-options.tsx`, `backup.tsx`, `product-form.tsx`, `ThemedText`, `business-logo.ts`, `receipt-view.tsx`, `app/_layout.tsx`, `language-switch.tsx`, `theme-store.ts`, `db/index.ts`, `product-image.ts`, `animated-icon.web.tsx`, `skia-web.ts`, `income-trend-chart.tsx`, `receipt/[id].tsx`, `i18n/index.ts`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Why does `useTheme()` connect `useTheme` to `business-profile-editor.tsx`, `payment-panel.tsx`, `dialog/index.ts`, `theme.ts`, `expenses/edit.tsx`, `onboarding.tsx`, `accent-options.tsx`, `backup.tsx`, `product-form.tsx`, `ThemedText`, `business-logo.ts`, `receipt-view.tsx`, `validation.ts`, `auth-repository.ts`, `dashboard.ts`, `payment.ts`, `dashboard.test.tsx`, `app/_layout.tsx`, `listUnits`, `cart-math.ts`, `theme-store.ts`, `getDb`, `db/index.ts`, `product-image.ts`, `react-native`, `income-trend-chart.tsx`, `getBusinessProfile`, `receipt/[id].tsx`, `i18n/index.ts`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **What connects `AppVariant`, `name`, `slug` to the rest of the system?**
  _658 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `repositories/index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.052650494159928125 - nodes in this community are weakly interconnected._
- **Should `backup.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05970790378006873 - nodes in this community are weakly interconnected._