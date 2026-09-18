# Graph Report - punto  (2026-09-18)

## Corpus Check
- 267 files · ~203,392 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 4, .css 2)

## Summary
- 1946 nodes · 7065 edges · 98 communities (91 shown, 7 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 108 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `84ec3391`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- repositories/index.ts
- client.ts
- suppliers.tsx
- repoError
- pos.tsx
- expenses.test.tsx
- getDb
- theme.ts
- products.tsx
- src_i18n_index_i18n
- dependencies
- useTheme
- sale.ts
- business.ts
- package.json
- dashboard.test.tsx
- catalog-save.ts
- catalog-form.ts
- pos-checkout.test.tsx
- theme.test.ts
- expo
- backup.tsx
- getBusinessId
- themed-text.tsx
- cart-store.ts
- backup-format.ts
- auth/index.ts
- product-image.ts
- primary-button.tsx
- recipe.ts
- scripts
- formatMoney
- validation.ts
- auth-repository.ts
- dashboard.ts
- main.js
- payment-panel.tsx
- setup.test.tsx
- detail.tsx
- finance.ts
- app/_layout.tsx
- sales.test.tsx
- backup.ts
- language-store.ts
- cart-math.ts
- db/index.ts
- backup-roundtrip.integration.test.ts
- Domain Model & Schema
- static-server.js
- hash.ts
- loginLimiter
- unit.ts
- electron/package.json
- payment-method.ts
- COEP/COOP Header Injection
- reset-project.js
- Offline-First Architecture
- pbkdf2.ts
- app-metadata.ts
- theme-store.ts
- devDependencies
- animated-icon.web.tsx
- scripts
- listUnits
- Expo SDK 57 Stack Baseline
- app-tabs.tsx
- tsconfig.json
- exportDatabase
- getBusinessProfile
- Color Palette & Accessibility Tokens
- finish.tsx
- Architecture Principles
- Punto Product & Engineering Guide
- app.config.ts
- i18n/index.ts
- export-web.mjs
- i18n/types.ts
- receipt/[id].tsx
- Theme Accent Personalization
- Android Adaptive Icon
- Punto App Icon
- eslint.config.js
- dayjs.ts
- team/[id].tsx
- dialog/index.ts
- metro.config.js
- accent-store.ts
- Expo Icon Composition (Icon Composer Layer Stack)
- onboarding.test.tsx
- Punto Splash Icon
- use-catalog.ts
- Expo Logo Image
- Punto Favicon
- Brand Glow Backdrop Asset
- business-profile-editor.test.tsx
- segmented-control.test.tsx

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

## Communities (98 total, 7 thin omitted)

### Community 0 - "repositories/index.ts"
Cohesion: 0.06
Nodes (79): PeriodTotals, SaleRange, assertSufficientStock(), computeChangeMinor(), computeIngredientCostMinor(), computeRecipeConsumptionMilli(), computeRecipeCostMinor(), computeTaxMinor() (+71 more)

### Community 1 - "client.ts"
Cohesion: 0.11
Nodes (31): ADMIN_ROW, EMPLOYEE_ROW, resetBusinessIdForTesting(), RunResult, SqlValue, isRepoError(), REPO_ERROR, REPO_ERROR_CODES (+23 more)

### Community 2 - "suppliers.tsx"
Cohesion: 0.10
Nodes (38): CategoryEditScreen(), load(), styles, styles, SetupCategoriesScreen(), styles, SetupSuppliersScreen(), styles (+30 more)

### Community 3 - "repoError"
Cohesion: 0.17
Nodes (49): updateBusinessProfileWithTxn(), archiveCategoryWithTxn(), createCategoryWithTxn(), updateCategoryWithTxn(), nowIso(), mapSqliteError(), repoError, createFinancialCategoryWithTxn() (+41 more)

### Community 4 - "pos.tsx"
Cohesion: 0.09
Nodes (32): ref_expo_vector_icons_materialcommunityicons, react-native-safe-area-context, styles, fullName(), MoreScreen(), styles, ActiveSheet, styles (+24 more)

### Community 5 - "expenses.test.tsx"
Cohesion: 0.11
Nodes (15): mockBack, mockCreateTransaction, mockEnsureCategories, mockGetProfile, mockListCategories, mockListPaymentMethods, mockListSuppliers, mockListTransactions (+7 more)

### Community 6 - "getDb"
Cohesion: 0.14
Nodes (35): RFC-4122, getDb(), countHeldSales(), getCompletedSalesTotals(), getFinancialTotals(), getPurchaseExpenseTotal(), getRefundedSalesTotals(), listCompletedSalesInRange() (+27 more)

### Community 7 - "theme.ts"
Cohesion: 0.06
Nodes (52): react-i18next, react-native, ErrorField, ErrorMessageKey, INITIAL_CURRENCY, OnboardingError, OnboardingStep, styles (+44 more)

### Community 8 - "products.tsx"
Cohesion: 0.10
Nodes (43): expo-router, react, styles, styles, styles, styles, styles, styles (+35 more)

### Community 9 - "src_i18n_index_i18n"
Cohesion: 0.12
Nodes (10): @testing-library/react-native, mockCatalog, mockHeaderOptions, categories, inventoryItems, suppliers, inventoryItems, suppliers (+2 more)

### Community 10 - "dependencies"
Cohesion: 0.04
Nodes (45): dependencies, dayjs, expo, expo-clipboard, expo-constants, expo-crypto, expo-dev-client, expo-device (+37 more)

### Community 11 - "useTheme"
Cohesion: 0.06
Nodes (40): ref_expo_router_ui, CategoriesLayout(), ExpensesLayout(), IngredientsLayout(), InventoryLayout(), ProductsLayout(), PurchasesLayout(), ReceiptLayout() (+32 more)

### Community 12 - "sale.ts"
Cohesion: 0.28
Nodes (12): listSales(), mapSaleRow(), PaymentRow, readSaleDetailWithTxn(), readSaleRowWithTxn(), SaleFilter, SaleItemRow, SaleRow (+4 more)

### Community 13 - "business.ts"
Cohesion: 0.09
Nodes (18): init(), runMigrations(), ACCENT_COLORS, AccentColor, BusinessProfile, BusinessProfilePatch, BusinessRow, isAccentColor() (+10 more)

### Community 14 - "package.json"
Cohesion: 0.05
Nodes (38): main, name, private, version, eslint, eslint-config-expo, expo, expo-clipboard (+30 more)

### Community 15 - "dashboard.test.tsx"
Cohesion: 0.07
Nodes (34): mockCompletedSales, mockCompletedTotals, mockExpireHeld, mockFinancialTotals, mockHeld, mockListEmployees, mockLowStock, mockNavigate (+26 more)

### Community 16 - "catalog-save.ts"
Cohesion: 0.09
Nodes (36): src_db_index_createinventoryitemwithstock, src_db_index_createproductwithstock, src_db_index_deletesupplieritem, src_db_index_recipedetail, src_db_index_setrecipeactive, src_db_index_updateinventoryitem, src_db_index_updateproduct, src_db_index_upsertrecipe (+28 more)

### Community 17 - "catalog-form.ts"
Cohesion: 0.09
Nodes (30): CategoriesScreen(), ProductsScreen(), InventoryItemForm(), PurchaseForm(), suppliers, units, src_db_index_createproductinput, src_db_index_recipeiteminput (+22 more)

### Community 18 - "pos-checkout.test.tsx"
Cohesion: 0.11
Nodes (18): cash, completedSale, heldDetail, heldSale, mockCatalog, mockCheckoutSale, mockCreateHeldSale, mockEnsureMethods (+10 more)

### Community 19 - "theme.test.ts"
Cohesion: 0.14
Nodes (20): src_constants_theme_accent, ACCENT_PALETTES, src_constants_theme_accents, buildPalette(), ColorScale, src_constants_theme_default_accent, getAccentPalette(), palette (+12 more)

### Community 20 - "expo"
Cohesion: 0.07
Nodes (28): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, predictiveBackGestureEnabled, projectId, reactCompiler (+20 more)

### Community 21 - "backup.tsx"
Cohesion: 0.13
Nodes (24): BackupScreen(), load(), formatValidationErrors(), styles, mockReplace, mockResetToOnboarding, mockSignOut, isAccent() (+16 more)

### Community 22 - "getBusinessId"
Cohesion: 0.18
Nodes (21): getBusinessId(), updateFinancialCategory(), createInventoryItem(), reconcileItemFromLedger(), recordMovement(), createProduct(), cancelPurchase(), createPurchase() (+13 more)

### Community 23 - "themed-text.tsx"
Cohesion: 0.08
Nodes (37): expo-image, AdvancedSection(), AdvancedSectionProps, styles, FormField(), FormFieldProps, styles, ProductFormProps (+29 more)

### Community 24 - "cart-store.ts"
Cohesion: 0.11
Nodes (22): src_db_index_addsaleitem, src_db_index_cancelsale, src_db_index_completesale, src_db_index_removesaleitem, src_db_index_updatesaleitemquantity, PaymentInput, SaleDetail, AddProductInput (+14 more)

### Community 25 - "backup-format.ts"
Cohesion: 0.09
Nodes (26): affinityOf(), BACKUP_APP_NAME, BACKUP_APP_VERSION, BACKUP_DELETE_ORDER, BACKUP_FORMAT, BACKUP_FORMAT_VERSION, BACKUP_LIMITS, BackupColumn (+18 more)

### Community 26 - "auth/index.ts"
Cohesion: 0.15
Nodes (23): businessExists(), AUTH_PHASES, AuthStoreState, isAuthPhase(), OnboardingOutcome, resolveAuthPhase(), SESSION_STORAGE_KEY, SignInOutcome (+15 more)

### Community 27 - "product-image.ts"
Cohesion: 0.09
Nodes (27): expo-file-system, expo-image-picker, BusinessLogoPicker(), handlePick(), BusinessProfileEditor(), handleSave(), load(), ProductImagePicker() (+19 more)

### Community 28 - "primary-button.tsx"
Cohesion: 0.11
Nodes (18): CredentialKind, LoginErrorKey, LoginStep, styles, ErrorKey, FormErrors, styles, AppDialog() (+10 more)

### Community 29 - "recipe.ts"
Cohesion: 0.13
Nodes (24): createInventoryItemWithStock(), createProductWithStock(), listRecipes(), mapRecipeItemRow(), mapRecipeItems(), mapRecipeRow(), Recipe, RecipeItem (+16 more)

### Community 30 - "scripts"
Cohesion: 0.08
Nodes (24): scripts, android, build:all, build:android, build:dev, build:dev:android, build:dev:ios, build:ios (+16 more)

### Community 31 - "formatMoney"
Cohesion: 0.15
Nodes (20): PurchasesScreen(), DashboardScreen(), ReceiptView(), ReceiptViewProps, STATUS_BANNER, STATUS_LABEL_KEY, STATUS_TONE, StatusLabelKey (+12 more)

### Community 32 - "validation.ts"
Cohesion: 0.15
Nodes (17): LoginScreen(), OnboardingScreen(), handleSubmit(), AddEmployeeScreen(), resolveAuthKind(), normalizeUsername(), PASSWORD_MIN_LENGTH, PIN_MAX_LENGTH (+9 more)

### Community 33 - "auth-repository.ts"
Cohesion: 0.20
Nodes (17): TeamScreen(), archiveEmployee(), BusinessRow, createEmployee(), EmployeeRow, getBusiness(), listActiveEmployees(), mapEmployeeRow() (+9 more)

### Community 34 - "dashboard.ts"
Cohesion: 0.10
Nodes (29): victory-native, IncomeTrendChart(), IncomeTrendChartProps, styles, dailyMonth, hourlyDay, mockCartesianProps, monthlyYears (+21 more)

### Community 35 - "main.js"
Cohesion: 0.15
Nodes (18): ALLOWED_PERMISSIONS, { app, BrowserWindow, dialog, session, shell }, bootstrap(), configurePermissions(), createWindow(), fs, gotTheLock, installCrossOriginIsolationHeaders() (+10 more)

### Community 36 - "payment-panel.tsx"
Cohesion: 0.17
Nodes (19): PaymentPanel(), PaymentPanelProps, styles, withoutKey(), card, cash, src_db_index_paymentinput, src_db_index_paymentmethod (+11 more)

### Community 37 - "setup.test.tsx"
Cohesion: 0.10
Nodes (20): SetupFinishScreen(), mockArchiveSupplier, mockBack, mockCompleteSetup, mockCreateSupplier, mockGetBusinessProfile, mockGetRecipeByProductId, mockListCategories (+12 more)

### Community 38 - "detail.tsx"
Cohesion: 0.09
Nodes (27): resolveSupplierForItem(), styles, adjustmentMovement, freeTextAdjustment, item, mockAdjust, mockGetItem, mockGetProfile (+19 more)

### Community 39 - "finance.ts"
Cohesion: 0.17
Nodes (22): createFinancialCategory(), CreateFinancialCategoryInput, createFinancialTransaction(), createFinancialTransactionWithTxn(), DEFAULT_FINANCIAL_CATEGORIES, DefaultFinancialCategoryLanguage, ensureDefaultFinancialCategories(), FinancialCategoryRow (+14 more)

### Community 40 - "app/_layout.tsx"
Cohesion: 0.15
Nodes (14): expo-splash-screen, expo-status-bar, react-native-worklets, RootLayout(), hydrateStores(), AnimatedSplashOverlay(), glowKeyframe, keyframe (+6 more)

### Community 41 - "sales.test.tsx"
Cohesion: 0.13
Nodes (12): SalesScreen(), mockGetProfile, mockGetSalesTotals, mockListEmployees, mockListPaymentMethods, mockListSales, mockPush, src_db_index_getsalestotals (+4 more)

### Community 42 - "backup.ts"
Cohesion: 0.21
Nodes (14): BackupImportResult, clearAllData(), deleteAllRows(), ExportDatabaseOptions, formatValidationErrors(), importDatabase(), ImportDatabaseOptions, ImportMode (+6 more)

### Community 43 - "language-store.ts"
Cohesion: 0.27
Nodes (9): ref_expo_sqlite_kv_store, zustand, SupportedLanguage, isSupportedLanguage(), LANGUAGE_STORAGE_KEY, LanguageStoreState, SUPPORTED_LANGUAGES, useLanguageStore (+1 more)

### Community 44 - "cart-math.ts"
Cohesion: 0.17
Nodes (18): fullName(), PosScreen(), CartPanel(), useCartErrorMessage(), src_db_index_moneyminor, src_db_index_quantitymilli, src_db_index_saleitem, src_db_index_saleiteminput (+10 more)

### Community 45 - "db/index.ts"
Cohesion: 0.25
Nodes (9): Database, DATABASE_NAME, resetDbForTesting(), migration001InitialSchema, migration002Auth, LATEST_SCHEMA_VERSION, migrations, Recording (+1 more)

### Community 46 - "backup-roundtrip.integration.test.ts"
Cohesion: 0.18
Nodes (10): buildSchema(), createAdapter(), Row, SEED, snapshot(), SqliteDb, SqliteModule, SqliteStatement (+2 more)

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
Cohesion: 0.33
Nodes (9): UnitType, CreateUnitInput, DEFAULT_UNITS, getUnitById(), isUnitType(), mapUnitRow(), toUnit(), UnitRow (+1 more)

### Community 52 - "electron/package.json"
Cohesion: 0.15
Nodes (12): author, description, devDependencies, electron, electron-builder, license, main, name (+4 more)

### Community 53 - "payment-method.ts"
Cohesion: 0.25
Nodes (13): createPaymentMethod(), CreatePaymentMethodInput, DEFAULT_PAYMENT_METHODS, DefaultPaymentMethodLanguage, ensureDefaultPaymentMethods(), getPaymentMethodById(), isPaymentType(), mapPaymentMethodRow() (+5 more)

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

### Community 61 - "animated-icon.web.tsx"
Cohesion: 0.22
Nodes (6): react-native-reanimated, src_components_animated_icon_module, glowKeyframe, keyframe, logoKeyframe, styles

### Community 62 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, dev, dist, dist:linux, dist:mac, dist:win, export:web, pack (+1 more)

### Community 63 - "listUnits"
Cohesion: 0.22
Nodes (12): IngredientsScreen(), formatSignedQuantity(), InventoryScreen(), currentItems, unit, mockItems, mockUnits, src_db_index_ensuredefaultunits (+4 more)

### Community 64 - "Expo SDK 57 Stack Baseline"
Cohesion: 0.25
Nodes (8): Anvil (sibling Expo 57 app), Dev / Preview / Release Build Tracks, Expo Router (file-based), Expo SDK 57, Expo SDK 57 Stack Baseline, Testing Strategy (pyramid), Build Variants & EAS Profiles, Testing Setup (jest-expo)

### Community 65 - "app-tabs.tsx"
Cohesion: 0.29
Nodes (5): ref_expo_router_unstable_native_tabs, AppTabs(), TAB_LABEL_KEY, TabIconName, TABS

### Community 66 - "tsconfig.json"
Cohesion: 0.25
Nodes (7): expo/tsconfig.base, compilerOptions, paths, strict, extends, include, @/assets/*

### Community 67 - "exportDatabase"
Cohesion: 0.39
Nodes (8): makeDocument(), exportDatabase(), normalizeRow(), makeImportDoc(), buildBackupDocument(), emptyBackupTables(), docWithProduct(), makeRawDoc()

### Community 68 - "getBusinessProfile"
Cohesion: 0.19
Nodes (26): ExpenseEditScreen(), load(), ExpensesScreen(), InventoryItemEditScreen(), load(), InventoryDetailScreen(), load(), ProductEditScreen() (+18 more)

### Community 69 - "Color Palette & Accessibility Tokens"
Cohesion: 0.29
Nodes (7): Color Palette & Accessibility Tokens, Definition of Done, Mobile Design Patterns, Platform Layout & Responsiveness, 8pt Spacing Grid & Touch Targets, Tablet Split-View POS, Typography System (native + monospace)

### Community 70 - "finish.tsx"
Cohesion: 0.12
Nodes (15): EMPTY_COUNTS, SetupCounts, styles, styles, WizardProgress(), WizardProgressProps, styles, WizardStep() (+7 more)

### Community 71 - "Architecture Principles"
Cohesion: 0.33
Nodes (6): Architecture Principles, i18n (es + en) Convention, Money, Data & Language Conventions, Zustand Global State, i18n Bootstrap (es canonical), Money as INTEGER Minor Units

### Community 72 - "Punto Product & Engineering Guide"
Cohesion: 0.33
Nodes (6): Brand Personality, Punto Product Vision, Punto Product & Engineering Guide, CLAUDE.md @AGENTS.md Include, Punto README, Punto Tech Stack Table

### Community 74 - "i18n/index.ts"
Cohesion: 0.24
Nodes (9): LanguageSwitch(), selectLanguage(), DEFAULT_LANGUAGE, detectLanguage(), resolveLanguage(), SUPPORTED_LANGUAGES, en, flattenKeys() (+1 more)

### Community 75 - "export-web.mjs"
Cohesion: 0.33
Nodes (5): projectRoot, result, ref_node_child_process, ref_node_path, ref_node_url

### Community 76 - "i18n/types.ts"
Cohesion: 0.33
Nodes (5): i18next, CustomTypeOptions, i18next, NestedKeys, TranslationKey

### Community 77 - "receipt/[id].tsx"
Cohesion: 0.18
Nodes (17): fullName(), ReceiptScreen(), styles, cash, completedSale, mockBack, mockGetSaleById, mockListPaymentMethods (+9 more)

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
Cohesion: 0.23
Nodes (9): EditEmployeeScreen(), ErrorKey, FormErrors, styles, mockBack, mockFind, mockUpdate, findActiveEmployeeById() (+1 more)

### Community 84 - "dialog/index.ts"
Cohesion: 0.33
Nodes (8): DialogTone, DialogHost(), ConfirmDialogOptions, DialogRequest, DialogStoreState, dismissDialog(), MessageDialogOptions, useDialogStore

### Community 85 - "metro.config.js"
Cohesion: 0.50
Nodes (3): config, { getDefaultConfig }, ref_expo_metro_config

### Community 86 - "accent-store.ts"
Cohesion: 0.27
Nodes (7): Accent, ACCENTS, DEFAULT_ACCENT, AccentStoreState, BusinessProfileLoader, BusinessProfileSnapshot, loadProfile

### Community 87 - "Expo Icon Composition (Icon Composer Layer Stack)"
Cohesion: 1.00
Nodes (3): Expo Icon Composition (Icon Composer Layer Stack), Expo Symbol (White Chevron Mark), Icon Grid Overlay (Transparent 1024x1024)

### Community 88 - "onboarding.test.tsx"
Cohesion: 0.33
Nodes (4): mockCompleteOnboarding, mockPickBusinessLogo, mockReplace, Queries

### Community 89 - "Punto Splash Icon"
Cohesion: 1.00
Nodes (3): Punto Splash Icon, Punto Brand Mark (Splash), App Splash Screen Identity

### Community 90 - "use-catalog.ts"
Cohesion: 0.40
Nodes (5): src_db_index_computerecipecostminor, src_db_index_listrecipes, src_db_index_product, Product, CatalogState

### Community 96 - "business-profile-editor.test.tsx"
Cohesion: 0.50
Nodes (3): mockGetBusinessProfile, mockUpdateBusinessProfile, profile

## Ambiguous Edges - Review These
- `Punto Brand Mark (Splash)` → `Punto Splash Icon`  [AMBIGUOUS]
  assets/images/splash-icon.png · relation: conceptually_related_to

## Knowledge Gaps
- **635 isolated node(s):** `AppVariant`, `name`, `slug`, `version`, `orientation` (+630 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 760 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Punto Brand Mark (Splash)` and `Punto Splash Icon`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `useTheme()` connect `useTheme` to `suppliers.tsx`, `pos.tsx`, `theme.ts`, `products.tsx`, `catalog-form.ts`, `theme.test.ts`, `backup.tsx`, `themed-text.tsx`, `product-image.ts`, `primary-button.tsx`, `formatMoney`, `validation.ts`, `auth-repository.ts`, `dashboard.ts`, `payment-panel.tsx`, `setup.test.tsx`, `detail.tsx`, `app/_layout.tsx`, `sales.test.tsx`, `cart-math.ts`, `listUnits`, `app-tabs.tsx`, `getBusinessProfile`, `finish.tsx`, `receipt/[id].tsx`, `team/[id].tsx`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Why does `react` connect `products.tsx` to `suppliers.tsx`, `pos.tsx`, `expenses.test.tsx`, `theme.ts`, `useTheme`, `package.json`, `dashboard.test.tsx`, `pos-checkout.test.tsx`, `backup.tsx`, `themed-text.tsx`, `primary-button.tsx`, `formatMoney`, `payment-panel.tsx`, `detail.tsx`, `app/_layout.tsx`, `sales.test.tsx`, `app-tabs.tsx`, `finish.tsx`, `receipt/[id].tsx`, `team/[id].tsx`, `use-catalog.ts`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **What connects `AppVariant`, `name`, `slug` to the rest of the system?**
  _635 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `repositories/index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0603448275862069 - nodes in this community are weakly interconnected._
- **Should `client.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11312764670296431 - nodes in this community are weakly interconnected._