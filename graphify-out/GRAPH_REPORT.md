# Graph Report - punto  (2026-09-18)

## Corpus Check
- 291 files · ~206,605 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 3, .css 2)

## Summary
- 1959 nodes · 7076 edges · 96 communities (89 shown, 7 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 123 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Finance Repositories
- DB Test Fakes
- Screen Styles & Imports
- Category Repository
- App Screens & Layout
- Edit Screen Tests
- Analytics Repositories
- Onboarding & Theme
- Ingredients Screens
- Onboarding & POS Tests
- Package Dependencies
- Router Layouts
- Money & Recipe Math
- Database Adapter & Inventory
- Package Metadata
- Dashboard Tests
- Catalog Save Test Refs
- Catalog Forms
- POS Checkout Tests
- Theme Accents
- App Configuration
- Backup Files & Screen
- Supplier & Product Creation
- Sales Screens & Filters
- Cart Store Test Refs
- Backup Format
- Auth Store
- Business Profile & Currencies
- Team & Expense Forms
- Product Edit & Recipes
- Build Scripts
- Receipt View
- Auth Validation
- Team Repository
- Dashboard Logic
- Electron Main Process
- Payment Panel
- Setup Flow Tests
- Inventory Detail Tests
- More & Settings
- Root Layout & Icons
- Cart & Catalog Components
- Backup Repository
- Language Store & i18n
- Cart Math
- DB Client & Migrations
- Backup Roundtrip Tests
- Product Domain Model
- Electron Static Server
- Hashing & Crypto
- Login Lockout
- Unit Repository
- Electron Package Metadata
- Income Trend Chart
- Electron Desktop Shell
- Reset Project Script
- Offline-First Architecture
- PBKDF2 Web
- App Metadata
- Theme Store
- Dev Dependencies
- Animated Icon Web
- Electron Build Scripts
- Inventory Screens
- Expo Stack & Builds
- Tab Layout
- TypeScript Config
- Backup Export/Import
- Product Image Handling
- Design System Docs
- Wizard Steps
- Architecture Conventions
- Product Vision
- App Config Variants
- Tutorial Web Preview
- Export Web Script
- i18n Types
- Receipt View Tests
- Profile & Theming Docs
- Android Adaptive Icons
- App Icon Design
- ESLint Config
- Dayjs Locale Setup
- React Logo Assets
- Explore Tab Icon
- Metro Config
- PBKDF2 Native
- Expo Icon Composition
- Expo Badge Assets
- Splash Icon
- Home Tab Icon
- Expo Logo Asset
- Punto Favicon
- Brand Glow Asset

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 156 edges
2. `getDb()` - 93 edges
3. `getBusinessId()` - 93 edges
4. `react-native` - 82 edges
5. `repoError` - 76 edges
6. `withTransaction()` - 74 edges
7. `Spacing` - 69 edges
8. `ThemedText()` - 66 edges
9. `react` - 65 edges
10. `react-i18next` - 63 edges

## Surprising Connections (you probably didn't know these)
- `Web Support (static rendering)` --semantically_similar_to--> `Punto Desktop (Electron shell)`  [INFERRED] [semantically similar]
  README.md → electron/README.md
- `Punto Tech Stack Table` --references--> `Expo SDK 57 Stack Baseline`  [EXTRACTED]
  README.md → AGENTS.md
- `Offline-First (README)` --references--> `Offline-First Architecture`  [EXTRACTED]
  README.md → AGENTS.md
- `getDb() Singleton & Migrations` --implements--> `Local SQLite Source of Truth`  [INFERRED]
  README.md → AGENTS.md
- `theme-store (persisted light/dark override)` --implements--> `Theme Accent Personalization`  [INFERRED]
  README.md → AGENTS.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Punto Core Business Domains** — agents_business_profile, agents_catalog, agents_recipes, agents_ingredients, agents_suppliers, agents_inventory, agents_sales_pos, agents_payments, agents_income_outcome, agents_dashboard, agents_employees [EXTRACTED 1.00]
- **Offline-First Data Layer** — agents_offline_first, agents_local_sqlite, agents_json_import_export, readme_sqlite, readme_json_export, electron_readme_opfs, electron_readme_sqlite_concurrency [INFERRED 0.85]
- **Build & Distribution Tracks** — agents_build_tracks, readme_build_variants, readme_web_support, electron_readme_punto_desktop, electron_readme_web_export, electron_electron_builder_targets [INFERRED 0.75]
- **React Logo Resolution Set** — assets_images_react_logo, assets_images_react_logo_2x, assets_images_react_logo_3x [INFERRED 0.95]
- **Explore Tab Icon Density Variant Set** — assets_images_tabicons_explore_icon, assets_images_tabicons_explore_2x_icon, assets_images_tabicons_explore_3x_icon [INFERRED 0.95]
- **Home Tab Icon Density Variants (1x/2x/3x)** — assets_images_tabicons_home, assets_images_tabicons_home_2x, assets_images_tabicons_home_3x [INFERRED 0.95]
- **Android Adaptive Icon Layer Set** — assets_images_android_icon_background, assets_images_android_icon_foreground, assets_images_android_icon_monochrome [INFERRED 0.95]
- **Expo Icon Layer Stack (Symbol + Grid Guide)** — assets_expo_icon_assets_expo_symbol_2_expo_symbol, assets_expo_icon_assets_grid_grid, assets_expo_icon_assets_expo_symbol_2_expo_icon_composition [INFERRED 0.85]
- **Punto Icon Visual Composition** — assets_images_icon_chevron_glyph, assets_images_icon_blue_gradient_background, assets_images_icon_grid_pattern [INFERRED 0.85]
- **Expo Starter Web Preview Composition** — assets_images_tutorial_web, assets_images_tutorial_web_expo_starter, assets_images_tutorial_web_localhost_preview, assets_images_tutorial_web_navigation_tabs, assets_images_tutorial_web_welcome_screen [EXTRACTED 1.00]

## Communities (96 total, 7 thin omitted)

### Community 0 - "Finance Repositories"
Cohesion: 0.07
Nodes (66): CompletedSalePoint, SaleRange, CreateCategoryInput, UpdateCategoryInput, RepoErrorCode, createFinancialCategory(), CreateFinancialCategoryInput, DEFAULT_FINANCIAL_CATEGORIES (+58 more)

### Community 1 - "DB Test Fakes"
Cohesion: 0.09
Nodes (40): ADMIN_ROW, EMPLOYEE_ROW, DATABASE_NAME, getDb(), resetDbForTesting(), resetBusinessIdForTesting(), RunResult, isRepoError() (+32 more)

### Community 2 - "Screen Styles & Imports"
Cohesion: 0.06
Nodes (55): react, react-i18next, styles, styles, styles, styles, EMPTY_COUNTS, SetupCounts (+47 more)

### Community 3 - "Category Repository"
Cohesion: 0.12
Nodes (60): CategoryEditScreen(), load(), SetupCategoriesScreen(), createInventoryItemWithStock(), archiveCategory(), archiveCategoryWithTxn(), CategoryRow, createCategory() (+52 more)

### Community 4 - "App Screens & Layout"
Cohesion: 0.09
Nodes (45): ref_expo_vector_icons_materialcommunityicons, react-native-safe-area-context, styles, styles, CredentialKind, LoginErrorKey, LoginStep, styles (+37 more)

### Community 5 - "Edit Screen Tests"
Cohesion: 0.06
Nodes (51): ExpenseEditScreen(), load(), InventoryItemEditScreen(), load(), PurchaseEditScreen(), load(), fullName(), ReceiptScreen() (+43 more)

### Community 6 - "Analytics Repositories"
Cohesion: 0.09
Nodes (48): load(), countHeldSales(), getCompletedSalesTotals(), getFinancialTotals(), getPurchaseExpenseTotal(), getRefundedSalesTotals(), listCompletedSalesInRange(), listTopProducts() (+40 more)

### Community 7 - "Onboarding & Theme"
Cohesion: 0.07
Nodes (37): react-native, ErrorField, ErrorMessageKey, INITIAL_CURRENCY, OnboardingError, OnboardingStep, styles, AccentOptions() (+29 more)

### Community 8 - "Ingredients Screens"
Cohesion: 0.11
Nodes (35): expo-router, styles, styles, styles, styles, styles, styles, currentItems (+27 more)

### Community 9 - "Onboarding & POS Tests"
Cohesion: 0.07
Nodes (25): @testing-library/react-native, mockCompleteOnboarding, mockPickBusinessLogo, mockReplace, Queries, mockCatalog, mockHeaderOptions, mockGetBusinessProfile (+17 more)

### Community 10 - "Package Dependencies"
Cohesion: 0.04
Nodes (45): dependencies, dayjs, expo, expo-clipboard, expo-constants, expo-crypto, expo-dev-client, expo-device (+37 more)

### Community 11 - "Router Layouts"
Cohesion: 0.07
Nodes (30): ref_expo_router_ui, CategoriesLayout(), ExpensesLayout(), IngredientsLayout(), InventoryLayout(), ProductsLayout(), PurchasesLayout(), ReceiptLayout() (+22 more)

### Community 12 - "Money & Recipe Math"
Cohesion: 0.10
Nodes (40): RFC-4122, assertSufficientStock(), computeChangeMinor(), computeIngredientCostMinor(), computeLineSubtotalMinor(), computeRecipeConsumptionMilli(), computeRecipeCostMinor(), computeTaxMinor() (+32 more)

### Community 13 - "Database Adapter & Inventory"
Cohesion: 0.09
Nodes (33): PeriodTotals, TopProduct, CreateInventoryItemWithStockOptions, CreateProductWithStockOptions, DatabaseAdapter, SqlValue, CreateFinancialTransactionInput, CreateInventoryItemInput (+25 more)

### Community 14 - "Package Metadata"
Cohesion: 0.05
Nodes (38): main, name, private, version, eslint, eslint-config-expo, expo, expo-clipboard (+30 more)

### Community 15 - "Dashboard Tests"
Cohesion: 0.07
Nodes (33): mockCompletedSales, mockCompletedTotals, mockExpireHeld, mockFinancialTotals, mockHeld, mockListEmployees, mockLowStock, mockNavigate (+25 more)

### Community 16 - "Catalog Save Test Refs"
Cohesion: 0.09
Nodes (33): src_db_index_createinventoryitemwithstock, src_db_index_createproductwithstock, src_db_index_deletesupplieritem, src_db_index_manual_adjustment_reason, src_db_index_recipedetail, src_db_index_setrecipeactive, src_db_index_updateinventoryitem, src_db_index_updateproduct (+25 more)

### Community 17 - "Catalog Forms"
Cohesion: 0.11
Nodes (29): CategoriesScreen(), InventoryItemForm(), ProductForm(), PurchaseForm(), src_db_index_createproductinput, src_db_index_recipeiteminput, src_db_index_updateproductinput, buildProductCreateInput() (+21 more)

### Community 18 - "POS Checkout Tests"
Cohesion: 0.07
Nodes (25): cash, completedSale, heldDetail, heldSale, mockCatalog, mockCheckoutSale, mockCreateHeldSale, mockEnsureMethods (+17 more)

### Community 19 - "Theme Accents"
Cohesion: 0.10
Nodes (25): Accent, ACCENTS, DEFAULT_ACCENT, isAccent(), src_constants_theme_accent, ACCENT_PALETTES, src_constants_theme_accents, ColorScale (+17 more)

### Community 20 - "App Configuration"
Cohesion: 0.07
Nodes (28): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, predictiveBackGestureEnabled, projectId, reactCompiler (+20 more)

### Community 21 - "Backup Files & Screen"
Cohesion: 0.14
Nodes (23): BackupScreen(), load(), formatValidationErrors(), styles, mockReplace, mockResetToOnboarding, mockSignOut, src_db_index_clearalldata (+15 more)

### Community 22 - "Supplier & Product Creation"
Cohesion: 0.15
Nodes (29): SupplierEditScreen(), fullName(), PosScreen(), getBusinessId(), createProductWithStock(), createFinancialTransaction(), updateFinancialCategory(), createInventoryItem() (+21 more)

### Community 23 - "Sales Screens & Filters"
Cohesion: 0.09
Nodes (24): PERIOD_LABEL_KEY, PeriodChip(), styles, DATE_FILTERS, DateRangeFilter, FilterChip(), STATUS_LABEL_KEY, styles (+16 more)

### Community 24 - "Cart Store Test Refs"
Cohesion: 0.10
Nodes (26): src_db_index_addsaleitem, src_db_index_cancelsale, src_db_index_checkoutsale, src_db_index_completesale, src_db_index_createheldsale, src_db_index_paymentinput, src_db_index_removesaleitem, src_db_index_updatesaleitemquantity (+18 more)

### Community 25 - "Backup Format"
Cohesion: 0.10
Nodes (25): inspectBackup(), readSchema(), affinityOf(), BACKUP_APP_NAME, BACKUP_APP_VERSION, BACKUP_FORMAT, BACKUP_FORMAT_VERSION, BACKUP_LIMITS (+17 more)

### Community 26 - "Auth Store"
Cohesion: 0.15
Nodes (23): businessExists(), AUTH_PHASES, AuthStoreState, isAuthPhase(), OnboardingOutcome, resolveAuthPhase(), SESSION_STORAGE_KEY, SignInOutcome (+15 more)

### Community 27 - "Business Profile & Currencies"
Cohesion: 0.12
Nodes (19): expo-file-system, expo-image-picker, handlePick(), BusinessProfileEditor(), handleSave(), load(), CURRENCY_CODES, DEFAULT_CURRENCY (+11 more)

### Community 28 - "Team & Expense Forms"
Cohesion: 0.10
Nodes (19): styles, ErrorKey, FormErrors, styles, ErrorKey, FormErrors, styles, AppDialogProps (+11 more)

### Community 29 - "Product Edit & Recipes"
Cohesion: 0.16
Nodes (24): ProductEditScreen(), load(), SetupFinishScreen(), listInventoryItems(), getProductById(), listProducts(), getRecipeByProductId(), listRecipes() (+16 more)

### Community 30 - "Build Scripts"
Cohesion: 0.08
Nodes (24): scripts, android, build:all, build:android, build:dev, build:dev:android, build:dev:ios, build:ios (+16 more)

### Community 31 - "Receipt View"
Cohesion: 0.17
Nodes (19): ExpensesScreen(), PurchasesScreen(), DashboardScreen(), ReceiptView(), ReceiptViewProps, STATUS_BANNER, STATUS_LABEL_KEY, STATUS_TONE (+11 more)

### Community 32 - "Auth Validation"
Cohesion: 0.14
Nodes (19): LoginScreen(), OnboardingScreen(), handleSubmit(), AddEmployeeScreen(), EditEmployeeScreen(), createEmployee(), resolveAuthKind(), normalizeUsername() (+11 more)

### Community 33 - "Team Repository"
Cohesion: 0.14
Nodes (21): TeamScreen(), mockBack, mockFind, mockUpdate, archiveEmployee(), BusinessRow, EmployeeRow, findActiveEmployeeById() (+13 more)

### Community 34 - "Dashboard Logic"
Cohesion: 0.17
Nodes (19): SalesScreen(), useDashboard(), averageTicketMinor(), bucketSalesByPeriod(), CompletedSaleRow, computeDashboardTotals(), DASHBOARD_PERIODS, DashboardTotalsInput (+11 more)

### Community 35 - "Electron Main Process"
Cohesion: 0.15
Nodes (18): ALLOWED_PERMISSIONS, { app, BrowserWindow, dialog, session, shell }, bootstrap(), configurePermissions(), createWindow(), fs, gotTheLock, installCrossOriginIsolationHeaders() (+10 more)

### Community 36 - "Payment Panel"
Cohesion: 0.17
Nodes (16): PaymentPanel(), withoutKey(), card, cash, src_db_index_paymentmethod, PaymentMethod, buildPaymentInputs(), changeForAllocation() (+8 more)

### Community 37 - "Setup Flow Tests"
Cohesion: 0.10
Nodes (19): mockArchiveSupplier, mockBack, mockCompleteSetup, mockCreateSupplier, mockGetBusinessProfile, mockGetRecipeByProductId, mockListCategories, mockListInventoryItems (+11 more)

### Community 38 - "Inventory Detail Tests"
Cohesion: 0.10
Nodes (19): adjustmentMovement, freeTextAdjustment, item, mockAdjust, mockGetItem, mockGetProfile, mockHeaderOptions, mockListMovements (+11 more)

### Community 39 - "More & Settings"
Cohesion: 0.18
Nodes (14): styles, fullName(), MoreScreen(), styles, ListRow(), ListRowProps, styles, SectionHeader() (+6 more)

### Community 40 - "Root Layout & Icons"
Cohesion: 0.15
Nodes (14): expo-splash-screen, expo-status-bar, react-native-worklets, RootLayout(), hydrateStores(), AnimatedSplashOverlay(), glowKeyframe, keyframe (+6 more)

### Community 41 - "Cart & Catalog Components"
Cohesion: 0.14
Nodes (14): CartLineRow(), CartLineRowProps, styles, CatalogFilterBarProps, styles, QuantityStepper(), QuantityStepperProps, styles (+6 more)

### Community 42 - "Backup Repository"
Cohesion: 0.16
Nodes (16): BackupImportResult, clearAllData(), deleteAllRows(), ExportDatabaseOptions, formatValidationErrors(), importDatabase(), ImportDatabaseOptions, ImportMode (+8 more)

### Community 43 - "Language Store & i18n"
Cohesion: 0.18
Nodes (14): ref_expo_sqlite_kv_store, zustand, LanguageSwitch(), selectLanguage(), styles, detectLanguage(), resolveLanguage(), SupportedLanguage (+6 more)

### Community 44 - "Cart Math"
Cohesion: 0.21
Nodes (13): CartPanel(), useCartErrorMessage(), src_db_index_moneyminor, src_db_index_quantitymilli, src_db_index_saleitem, src_db_index_saleiteminput, SaleItem, cartItemCount() (+5 more)

### Community 45 - "DB Client & Migrations"
Cohesion: 0.23
Nodes (9): Database, init(), runMigrations(), migration001InitialSchema, migration002Auth, LATEST_SCHEMA_VERSION, migrations, Recording (+1 more)

### Community 46 - "Backup Roundtrip Tests"
Cohesion: 0.21
Nodes (8): buildSchema(), createAdapter(), Row, SEED, snapshot(), SqliteDb, SqliteModule, SqliteStatement

### Community 47 - "Product Domain Model"
Cohesion: 0.21
Nodes (15): Catalog Domain, Earnings / Dashboard, Domain Model & Schema, Employees Domain, Income & Outcome Tracking, Ingredients Domain, Stock / Inventory Domain, Payments Domain (split payment) (+7 more)

### Community 48 - "Electron Static Server"
Cohesion: 0.18
Nodes (12): createStaticServer(), fs, fsp, getContentType(), http, isLoopbackHost(), MIME_TYPES, path (+4 more)

### Community 49 - "Hashing & Crypto"
Cohesion: 0.31
Nodes (12): expo-crypto, signIn(), constantTimeEqualHex(), deriveKey(), generateSalt(), HashOptions, hashSecret(), isHex() (+4 more)

### Community 50 - "Login Lockout"
Cohesion: 0.18
Nodes (5): DEFAULT_LOCKOUT, LockoutConfig, LockoutState, loginLimiter, NowFn

### Community 51 - "Unit Repository"
Cohesion: 0.30
Nodes (13): UnitType, createUnit(), CreateUnitInput, createUnitWithTxn(), DEFAULT_UNITS, getUnitById(), isUnitType(), mapUnitRow() (+5 more)

### Community 52 - "Electron Package Metadata"
Cohesion: 0.15
Nodes (12): author, description, devDependencies, electron, electron-builder, license, main, name (+4 more)

### Community 53 - "Income Trend Chart"
Cohesion: 0.18
Nodes (11): victory-native, IncomeTrendChart(), IncomeTrendChartProps, styles, dailyMonth, hourlyDay, mockCartesianProps, monthlyYears (+3 more)

### Community 54 - "Electron Desktop Shell"
Cohesion: 0.23
Nodes (12): electron-builder Configuration, extraResources dist/ Copy, NSIS / AppImage / DMG Targets, COEP/COOP Header Injection, Cross-Origin Isolation Assertion, Loopback HTTP Server for dist/, main.js (Electron main process), Punto Desktop (Electron shell) (+4 more)

### Community 55 - "Reset Project Script"
Cohesion: 0.17
Nodes (10): ref_fs, ref_path, ref_readline, exampleDirPath, fs, oldDirs, path, readline (+2 more)

### Community 56 - "Offline-First Architecture"
Cohesion: 0.25
Nodes (11): JSON Import/Export Backup, Local SQLite Source of Truth, Offline-First Architecture, OPFS Origin-Private SQLite Database, Origin (host+port) Persistence, expo-sqlite Web Concurrency Sensitivity, getDb() Singleton & Migrations, JSON Export/Import Portability (+3 more)

### Community 57 - "PBKDF2 Web"
Cohesion: 0.27
Nodes (8): ref_noble_hashes_pbkdf2_js, ref_noble_hashes_sha2_js, ref_noble_hashes_utils_js, PBKDF2_DK_BYTES, noblePbkdf2Hex(), PBKDF2_DK_BYTES, pbkdf2Hex(), VECTORS

### Community 58 - "App Metadata"
Cohesion: 0.38
Nodes (9): getMetadata(), getSetupCompleted(), nextDocumentNumber(), nextPurchaseNumber(), nextSaleNumber(), setMetadata(), setSetupCompleted(), mockDb (+1 more)

### Community 59 - "Theme Store"
Cohesion: 0.31
Nodes (9): mockMemory, ColorScheme, isThemeMode(), resolveEffectiveScheme(), THEME_MODE_STORAGE_KEY, THEME_MODES, ThemeMode, ThemeStoreState (+1 more)

### Community 60 - "Dev Dependencies"
Cohesion: 0.20
Nodes (10): devDependencies, eslint, eslint-config-expo, jest, jest-expo, react-test-renderer, @testing-library/react-native, @types/jest (+2 more)

### Community 61 - "Animated Icon Web"
Cohesion: 0.20
Nodes (7): expo-image, react-native-reanimated, src_components_animated_icon_module, glowKeyframe, keyframe, logoKeyframe, styles

### Community 62 - "Electron Build Scripts"
Cohesion: 0.22
Nodes (9): scripts, dev, dist, dist:linux, dist:mac, dist:win, export:web, pack (+1 more)

### Community 63 - "Inventory Screens"
Cohesion: 0.42
Nodes (9): IngredientsScreen(), formatSignedQuantity(), InventoryDetailScreen(), load(), resolveSupplierForItem(), InventoryScreen(), ensureDefaultUnits(), listUnits() (+1 more)

### Community 64 - "Expo Stack & Builds"
Cohesion: 0.25
Nodes (8): Anvil (sibling Expo 57 app), Dev / Preview / Release Build Tracks, Expo Router (file-based), Expo SDK 57, Expo SDK 57 Stack Baseline, Testing Strategy (pyramid), Build Variants & EAS Profiles, Testing Setup (jest-expo)

### Community 65 - "Tab Layout"
Cohesion: 0.29
Nodes (5): ref_expo_router_unstable_native_tabs, AppTabs(), TAB_LABEL_KEY, TabIconName, TABS

### Community 66 - "TypeScript Config"
Cohesion: 0.25
Nodes (7): expo/tsconfig.base, compilerOptions, paths, strict, extends, include, @/assets/*

### Community 67 - "Backup Export/Import"
Cohesion: 0.39
Nodes (8): makeDocument(), exportDatabase(), normalizeRow(), makeImportDoc(), buildBackupDocument(), emptyBackupTables(), docWithProduct(), makeRawDoc()

### Community 68 - "Product Image Handling"
Cohesion: 0.36
Nodes (7): ProductImagePicker(), handlePick(), deleteProductImage(), deriveProductImageExtension(), fileExtension(), pickProductImage(), ProductImagePickResult

### Community 69 - "Design System Docs"
Cohesion: 0.29
Nodes (7): Color Palette & Accessibility Tokens, Definition of Done, Mobile Design Patterns, Platform Layout & Responsiveness, 8pt Spacing Grid & Touch Targets, Tablet Split-View POS, Typography System (native + monospace)

### Community 70 - "Wizard Steps"
Cohesion: 0.29
Nodes (4): WIZARD_STEP_COUNT, WIZARD_STEPS, WizardStepDescriptor, WizardStepId

### Community 71 - "Architecture Conventions"
Cohesion: 0.33
Nodes (6): Architecture Principles, i18n (es + en) Convention, Money, Data & Language Conventions, Zustand Global State, i18n Bootstrap (es canonical), Money as INTEGER Minor Units

### Community 72 - "Product Vision"
Cohesion: 0.33
Nodes (6): Brand Personality, Punto Product Vision, Punto Product & Engineering Guide, CLAUDE.md @AGENTS.md Include, Punto README, Punto Tech Stack Table

### Community 74 - "Tutorial Web Preview"
Cohesion: 0.67
Nodes (6): Tutorial Web Preview Screenshot, Doc External Link, Expo Starter Template, Localhost Web Preview (Port 8081), Home and Explore Navigation Tabs, Welcome to Expo Screen

### Community 75 - "Export Web Script"
Cohesion: 0.33
Nodes (5): projectRoot, result, ref_node_child_process, ref_node_path, ref_node_url

### Community 76 - "i18n Types"
Cohesion: 0.33
Nodes (5): i18next, CustomTypeOptions, i18next, NestedKeys, TranslationKey

### Community 77 - "Receipt View Tests"
Cohesion: 0.33
Nodes (4): baseSale, paymentMethods, NOTE: @testing-library/react-native v14 ships an async `render` (React 19) —, src_db_index_saledetail

### Community 78 - "Profile & Theming Docs"
Cohesion: 0.50
Nodes (5): Business Profile Domain, Theme Accent Personalization, Customization & White-Label, theme-store (persisted light/dark override), Theming via Design Tokens

### Community 79 - "Android Adaptive Icons"
Cohesion: 0.60
Nodes (5): Android Adaptive Icon Background Layer, Android Adaptive Icon, Android Adaptive Icon Foreground Mark, Adaptive Icon Layer Separation Design, Android Adaptive Icon Monochrome Layer

### Community 80 - "App Icon Design"
Cohesion: 0.60
Nodes (5): Blue Radial Gradient Background, Punto Brand Identity, Chevron / Upward Caret Glyph, Subtle Crosshair Grid Pattern, Punto App Icon

### Community 81 - "ESLint Config"
Cohesion: 0.40
Nodes (4): { defineConfig }, expoConfig, ref_eslint_config, ref_eslint_config_expo_flat

### Community 82 - "Dayjs Locale Setup"
Cohesion: 0.40
Nodes (4): dayjs, ref_dayjs_locale_en, ref_dayjs_locale_es, setDayjsLocale()

### Community 83 - "React Logo Assets"
Cohesion: 0.83
Nodes (4): React Logo (1x), React Logo (2x), React Logo (3x), React Framework

### Community 84 - "Explore Tab Icon"
Cohesion: 0.83
Nodes (4): Explore Tab Icon (2x), Explore Tab Icon (3x), Explore Glyph: Rounded Card With Top/Bottom Bars, Explore Tab Icon (1x)

### Community 85 - "Metro Config"
Cohesion: 0.50
Nodes (3): config, { getDefaultConfig }, ref_expo_metro_config

### Community 87 - "Expo Icon Composition"
Cohesion: 1.00
Nodes (3): Expo Icon Composition (Icon Composer Layer Stack), Expo Symbol (White Chevron Mark), Icon Grid Overlay (Transparent 1024x1024)

### Community 88 - "Expo Badge Assets"
Cohesion: 1.00
Nodes (3): Expo Branding / Framework Attribution, Powered by Expo Badge (Dark), Powered by Expo Badge (Light)

### Community 89 - "Splash Icon"
Cohesion: 1.00
Nodes (3): Punto Splash Icon, Punto Brand Mark (Splash), App Splash Screen Identity

### Community 90 - "Home Tab Icon"
Cohesion: 0.67
Nodes (3): Home Tab Icon (1x), Home Tab Icon (2x), Home Tab Icon (3x)

## Ambiguous Edges - Review These
- `Punto Splash Icon` → `Punto Brand Mark (Splash)`  [AMBIGUOUS]
  assets/images/splash-icon.png · relation: conceptually_related_to

## Knowledge Gaps
- **633 isolated node(s):** `AppVariant`, `name`, `slug`, `version`, `orientation` (+628 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 758 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Punto Splash Icon` and `Punto Brand Mark (Splash)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `useTheme()` connect `Router Layouts` to `Screen Styles & Imports`, `Category Repository`, `App Screens & Layout`, `Edit Screen Tests`, `Onboarding & Theme`, `Ingredients Screens`, `Catalog Forms`, `Theme Accents`, `Backup Files & Screen`, `Supplier & Product Creation`, `Sales Screens & Filters`, `Business Profile & Currencies`, `Team & Expense Forms`, `Product Edit & Recipes`, `Receipt View`, `Auth Validation`, `Team Repository`, `Dashboard Logic`, `Payment Panel`, `More & Settings`, `Root Layout & Icons`, `Cart & Catalog Components`, `Cart Math`, `Income Trend Chart`, `Inventory Screens`, `Tab Layout`, `Product Image Handling`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Package Dependencies` to `Package Metadata`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Why does `react` connect `Screen Styles & Imports` to `Team Repository`, `Tab Layout`, `App Screens & Layout`, `Edit Screen Tests`, `Onboarding & Theme`, `Ingredients Screens`, `Root Layout & Icons`, `More & Settings`, `Router Layouts`, `Package Metadata`, `Dashboard Tests`, `POS Checkout Tests`, `Backup Files & Screen`, `Sales Screens & Filters`, `Team & Expense Forms`, `Receipt View`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **What connects `AppVariant`, `name`, `slug` to the rest of the system?**
  _633 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Finance Repositories` be split into smaller, more focused modules?**
  _Cohesion score 0.07115677321156773 - nodes in this community are weakly interconnected._
- **Should `DB Test Fakes` be split into smaller, more focused modules?**
  _Cohesion score 0.09076682316118936 - nodes in this community are weakly interconnected._