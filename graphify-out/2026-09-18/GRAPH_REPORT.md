# Graph Report - punto  (2026-09-18)

## Corpus Check
- 274 files · ~206,927 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 4, .css 2)

## Summary
- 1990 nodes · 7224 edges · 96 communities (88 shown, 8 thin omitted)
- Extraction: 98% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 108 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2ae11416`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- repositories/index.ts
- category.ts
- business.ts
- repoError
- sales.tsx
- suppliers.tsx
- sale.ts
- auth/index.ts
- pos.tsx
- sales.test.tsx
- dependencies
- useTheme
- Spacing
- react-i18next
- package.json
- products.tsx
- catalog-save.ts
- payment-method.ts
- pos-checkout.test.tsx
- theme.test.ts
- expo
- backup.tsx
- theme.ts
- react-native
- cart-store.ts
- backup-format.ts
- useAuthStore
- business-logo.ts
- backup.ts
- recipe.ts
- scripts
- receipt-view.test.tsx
- validation.ts
- auth-repository.ts
- dashboard.test.tsx
- main.js
- payment.ts
- setup.test.tsx
- inventory-detail.test.tsx
- catalog-form.ts
- app/_layout.tsx
- assets.d.ts
- purchase.ts
- language-switch.tsx
- cart-math.ts
- migrations/index.ts
- backup-roundtrip.integration.test.ts
- Domain Model & Schema
- static-server.js
- hash.ts
- loginLimiter
- expenses.test.tsx
- electron/package.json
- Architecture Principles
- COEP/COOP Header Injection
- reset-project.js
- Offline-First Architecture
- pbkdf2.ts
- withTransaction
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
- secondary-button.tsx
- Theme Accent Personalization
- app-dialog.tsx
- app.config.ts
- animated-icon.web.tsx
- export-web.mjs
- (tabs)/index.tsx
- supplier-item.ts
- app-metadata.ts
- Android Adaptive Icon
- Punto App Icon
- eslint.config.js
- getBusinessProfile
- receipt/[id].tsx
- bottom-sheet.tsx
- metro.config.js
- i18n/index.ts
- Expo Icon Composition (Icon Composer Layer Stack)
- backup.test.ts
- Punto Splash Icon
- Expo Logo Image
- Punto Favicon
- Brand Glow Backdrop Asset
- src_i18n_index_i18n

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

## Communities (96 total, 8 thin omitted)

### Community 0 - "repositories/index.ts"
Cohesion: 0.08
Nodes (51): PeriodTotals, assertSufficientStock(), computeChangeMinor(), computeIngredientCostMinor(), computeRecipeConsumptionMilli(), computeRecipeCostMinor(), computeTaxMinor(), getStockStatus() (+43 more)

### Community 1 - "category.ts"
Cohesion: 0.09
Nodes (32): ADMIN_ROW, EMPLOYEE_ROW, resetBusinessIdForTesting(), archiveCategory(), CategoryRow, createCategory(), CreateCategoryInput, getCategoryById() (+24 more)

### Community 2 - "business.ts"
Cohesion: 0.21
Nodes (14): ACCENT_COLORS, AccentColor, BusinessProfile, BusinessProfilePatch, BusinessRow, isAccentColor(), isLocaleCode(), LOCALE_CODES (+6 more)

### Community 3 - "repoError"
Cohesion: 0.18
Nodes (44): archiveCategoryWithTxn(), createCategoryWithTxn(), updateCategoryWithTxn(), nowIso(), mapSqliteError(), repoError, createFinancialCategoryWithTxn(), createFinancialTransactionWithTxn() (+36 more)

### Community 4 - "sales.tsx"
Cohesion: 0.11
Nodes (18): DATE_FILTERS, DateRangeFilter, FilterChip(), STATUS_LABEL_KEY, styles, MaterialIconName, OptionRow(), OptionRowProps (+10 more)

### Community 5 - "suppliers.tsx"
Cohesion: 0.12
Nodes (29): CategoryEditScreen(), load(), SetupCategoriesScreen(), SetupIngredientsScreen(), SetupSuppliersScreen(), styles, styles, SupplierEditScreen() (+21 more)

### Community 6 - "sale.ts"
Cohesion: 0.10
Nodes (45): mapCategoryRow(), mapInventoryItemRow(), archiveSoftWhere, int(), intOrNull(), str(), strOrNull(), mapInventoryMovementRow() (+37 more)

### Community 7 - "auth/index.ts"
Cohesion: 0.18
Nodes (18): AUTH_FORBIDDEN, AuthActor, can(), CAPABILITIES, Capability, EMPLOYEE_CAPABILITIES, ForbiddenError, isForbiddenError() (+10 more)

### Community 8 - "pos.tsx"
Cohesion: 0.08
Nodes (40): ActiveSheet, fullName(), PosScreen(), styles, CartLineRow(), CartLineRowProps, styles, CartPanel() (+32 more)

### Community 9 - "sales.test.tsx"
Cohesion: 0.13
Nodes (11): mockGetProfile, mockGetSalesTotals, mockListEmployees, mockListPaymentMethods, mockListSales, mockPush, mockUseCan, src_db_index_getsalestotals (+3 more)

### Community 10 - "dependencies"
Cohesion: 0.04
Nodes (45): dependencies, dayjs, expo, expo-clipboard, expo-constants, expo-crypto, expo-dev-client, expo-device (+37 more)

### Community 11 - "useTheme"
Cohesion: 0.09
Nodes (33): expo-router, ref_expo_router_unstable_native_tabs, CategoriesLayout(), ExpensesScreen(), ExpensesLayout(), IngredientsLayout(), InventoryLayout(), ProductsScreen() (+25 more)

### Community 12 - "Spacing"
Cohesion: 0.08
Nodes (39): react, styles, styles, styles, ErrorKey, FormErrors, styles, ErrorKey (+31 more)

### Community 13 - "react-i18next"
Cohesion: 0.11
Nodes (20): expo-image, react-i18next, ErrorField, ErrorMessageKey, INITIAL_CURRENCY, OnboardingError, OnboardingStep, styles (+12 more)

### Community 14 - "package.json"
Cohesion: 0.05
Nodes (36): main, name, private, version, eslint, eslint-config-expo, expo, expo-clipboard (+28 more)

### Community 15 - "products.tsx"
Cohesion: 0.13
Nodes (27): styles, styles, ProductForm(), ProductFormProps, styles, ProductImageError, categories, inventoryItems (+19 more)

### Community 16 - "catalog-save.ts"
Cohesion: 0.10
Nodes (27): src_db_index_createinventoryitemwithstock, src_db_index_createproductwithstock, src_db_index_deletesupplieritem, src_db_index_manual_adjustment_reason, src_db_index_setrecipeactive, src_db_index_updateinventoryitem, src_db_index_updateproduct, src_db_index_upsertrecipe (+19 more)

### Community 17 - "payment-method.ts"
Cohesion: 0.21
Nodes (15): RFC-4122, createPaymentMethod(), CreatePaymentMethodInput, DEFAULT_PAYMENT_METHODS, DefaultPaymentMethodLanguage, ensureDefaultPaymentMethods(), getPaymentMethodById(), isPaymentType() (+7 more)

### Community 18 - "pos-checkout.test.tsx"
Cohesion: 0.11
Nodes (18): cash, completedSale, heldDetail, heldSale, mockCatalog, mockCheckoutSale, mockCreateHeldSale, mockEnsureMethods (+10 more)

### Community 19 - "theme.test.ts"
Cohesion: 0.09
Nodes (27): Accent, ACCENTS, DEFAULT_ACCENT, src_constants_theme_accent, ACCENT_PALETTES, src_constants_theme_accents, buildPalette(), ColorScale (+19 more)

### Community 20 - "expo"
Cohesion: 0.07
Nodes (28): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, predictiveBackGestureEnabled, projectId, reactCompiler (+20 more)

### Community 21 - "backup.tsx"
Cohesion: 0.14
Nodes (23): BackupScreen(), load(), formatValidationErrors(), styles, mockAdminUser, mockReplace, mockResetToOnboarding, mockSignOut (+15 more)

### Community 22 - "theme.ts"
Cohesion: 0.08
Nodes (25): ref_expo_router_ui, AdvancedSection(), AdvancedSectionProps, styles, CustomTabList(), styles, TAB_LABEL_KEY, TabButton() (+17 more)

### Community 23 - "react-native"
Cohesion: 0.07
Nodes (31): react-native, styles, SettingsScreen(), styles, styles, EMPTY_COUNTS, SetupCounts, styles (+23 more)

### Community 24 - "cart-store.ts"
Cohesion: 0.10
Nodes (25): src_db_index_addsaleitem, src_db_index_cancelsale, src_db_index_completesale, src_db_index_paymentinput, src_db_index_removesaleitem, src_db_index_updatesaleitemquantity, PaymentInput, SaleDetail (+17 more)

### Community 25 - "backup-format.ts"
Cohesion: 0.10
Nodes (26): affinityOf(), BACKUP_APP_NAME, BACKUP_APP_VERSION, BACKUP_FORMAT, BACKUP_FORMAT_VERSION, BACKUP_LIMITS, BACKUP_TABLES, BackupColumn (+18 more)

### Community 26 - "useAuthStore"
Cohesion: 0.13
Nodes (20): businessExists(), onboardBusiness(), AUTH_PHASES, AuthStoreState, isAuthPhase(), OnboardingOutcome, resolveAuthPhase(), SESSION_STORAGE_KEY (+12 more)

### Community 27 - "business-logo.ts"
Cohesion: 0.09
Nodes (23): expo-file-system, expo-image-picker, BusinessLogoPicker(), handlePick(), BusinessProfileEditor(), handleSave(), load(), mockGetBusinessProfile (+15 more)

### Community 28 - "backup.ts"
Cohesion: 0.14
Nodes (19): BackupImportResult, clearAllData(), deleteAllRows(), ExportDatabaseOptions, formatValidationErrors(), importDatabase(), ImportDatabaseOptions, ImportMode (+11 more)

### Community 29 - "recipe.ts"
Cohesion: 0.17
Nodes (13): listRecipes(), mapRecipeItemRow(), mapRecipeItems(), Recipe, RecipeItem, RecipeItemRow, RecipeRow, setRecipeActive() (+5 more)

### Community 30 - "scripts"
Cohesion: 0.08
Nodes (24): scripts, android, build:all, build:android, build:dev, build:dev:android, build:dev:ios, build:ios (+16 more)

### Community 31 - "receipt-view.test.tsx"
Cohesion: 0.33
Nodes (4): baseSale, paymentMethods, NOTE: @testing-library/react-native v14 ships an async `render` (React 19) —, src_db_index_saledetail

### Community 32 - "validation.ts"
Cohesion: 0.14
Nodes (19): LoginScreen(), OnboardingScreen(), handleSubmit(), AddEmployeeScreen(), EditEmployeeScreen(), resolveAuthKind(), isAuthRole(), normalizeUsername() (+11 more)

### Community 33 - "auth-repository.ts"
Cohesion: 0.15
Nodes (21): TeamScreen(), mockBack, mockFind, mockUpdate, archiveEmployee(), BusinessRow, createEmployee(), EmployeeRow (+13 more)

### Community 34 - "dashboard.test.tsx"
Cohesion: 0.05
Nodes (70): mockCompletedSales, mockCompletedTotals, mockExpireHeld, mockFinancialTotals, mockHeld, mockListEmployees, mockLowStock, mockNavigate (+62 more)

### Community 35 - "main.js"
Cohesion: 0.15
Nodes (18): ALLOWED_PERMISSIONS, { app, BrowserWindow, dialog, session, shell }, bootstrap(), configurePermissions(), createWindow(), fs, gotTheLock, installCrossOriginIsolationHeaders() (+10 more)

### Community 36 - "payment.ts"
Cohesion: 0.17
Nodes (16): PaymentPanel(), withoutKey(), card, cash, src_db_index_paymentmethod, PaymentMethod, buildPaymentInputs(), changeForAllocation() (+8 more)

### Community 37 - "setup.test.tsx"
Cohesion: 0.10
Nodes (19): mockArchiveSupplier, mockBack, mockCompleteSetup, mockCreateSupplier, mockGetBusinessProfile, mockGetRecipeByProductId, mockListCategories, mockListInventoryItems (+11 more)

### Community 38 - "inventory-detail.test.tsx"
Cohesion: 0.09
Nodes (21): adjustmentMovement, freeTextAdjustment, item, mockAdjust, mockGetItem, mockGetProfile, mockHeaderOptions, mockListMovements (+13 more)

### Community 39 - "catalog-form.ts"
Cohesion: 0.12
Nodes (24): CategoriesScreen(), InventoryItemForm(), src_db_index_createproductinput, src_db_index_recipeiteminput, src_db_index_updateproductinput, buildProductCreateInput(), buildProductUpdateInput(), buildRecipeItems() (+16 more)

### Community 40 - "app/_layout.tsx"
Cohesion: 0.15
Nodes (14): expo-splash-screen, expo-status-bar, react-native-worklets, RootLayout(), hydrateStores(), AnimatedSplashOverlay(), glowKeyframe, keyframe (+6 more)

### Community 42 - "purchase.ts"
Cohesion: 0.09
Nodes (41): REPO_ERROR, REPO_ERROR_CODES, RepoErrorCode, adjustQuantity(), adjustQuantityWithTxn(), InventoryMovementRow, listMovements(), MANUAL_ADJUSTMENT_REASON (+33 more)

### Community 43 - "language-switch.tsx"
Cohesion: 0.18
Nodes (14): ref_expo_sqlite_kv_store, zustand, LanguageSwitch(), selectLanguage(), styles, detectLanguage(), resolveLanguage(), SupportedLanguage (+6 more)

### Community 44 - "cart-math.ts"
Cohesion: 0.26
Nodes (10): src_db_index_moneyminor, src_db_index_quantitymilli, src_db_index_saleitem, src_db_index_saleiteminput, computeLineSubtotalMinor(), SaleItem, cartLineSubtotalMinor(), cartLineToSaleItemInput() (+2 more)

### Community 45 - "migrations/index.ts"
Cohesion: 0.26
Nodes (8): Database, migration001InitialSchema, migration002Auth, migration003SaleInventoryRestored, LATEST_SCHEMA_VERSION, migrations, Recording, Migration

### Community 46 - "backup-roundtrip.integration.test.ts"
Cohesion: 0.19
Nodes (9): ADMIN, buildSchema(), createAdapter(), Row, SEED, snapshot(), SqliteDb, SqliteModule (+1 more)

### Community 47 - "Domain Model & Schema"
Cohesion: 0.21
Nodes (15): Catalog Domain, Earnings / Dashboard, Domain Model & Schema, Employees Domain, Income & Outcome Tracking, Ingredients Domain, Stock / Inventory Domain, Payments Domain (split payment) (+7 more)

### Community 48 - "static-server.js"
Cohesion: 0.18
Nodes (12): createStaticServer(), fs, fsp, getContentType(), http, isLoopbackHost(), MIME_TYPES, path (+4 more)

### Community 49 - "hash.ts"
Cohesion: 0.32
Nodes (11): expo-crypto, constantTimeEqualHex(), deriveKey(), generateSalt(), HashOptions, hashSecret(), isHex(), needsRehash() (+3 more)

### Community 50 - "loginLimiter"
Cohesion: 0.18
Nodes (5): DEFAULT_LOCKOUT, LockoutConfig, LockoutState, loginLimiter, NowFn

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

### Community 58 - "withTransaction"
Cohesion: 0.09
Nodes (30): expo-sqlite, init(), runMigrations(), archiveInventoryItem(), createInventoryItem(), InventoryItemRow, listLowStockItems(), NOTE: there is intentionally NO `currentQuantity` field here — the cache is (+22 more)

### Community 59 - "theme-store.ts"
Cohesion: 0.31
Nodes (9): mockMemory, ColorScheme, isThemeMode(), resolveEffectiveScheme(), THEME_MODE_STORAGE_KEY, THEME_MODES, ThemeMode, ThemeStoreState (+1 more)

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
Cohesion: 0.17
Nodes (27): getDb(), getBusinessId(), createFinancialCategory(), CreateFinancialCategoryInput, createFinancialTransaction(), DEFAULT_FINANCIAL_CATEGORIES, DefaultFinancialCategoryLanguage, ensureDefaultFinancialCategories() (+19 more)

### Community 64 - "Expo SDK 57 Stack Baseline"
Cohesion: 0.25
Nodes (8): Anvil (sibling Expo 57 app), Dev / Preview / Release Build Tracks, Expo Router (file-based), Expo SDK 57, Expo SDK 57 Stack Baseline, Testing Strategy (pyramid), Build Variants & EAS Profiles, Testing Setup (jest-expo)

### Community 65 - "db/index.ts"
Cohesion: 0.11
Nodes (25): styles, IngredientsScreen(), styles, InventoryScreen(), currentItems, unit, InventoryItemFormProps, InventoryItemFormValues (+17 more)

### Community 66 - "tsconfig.json"
Cohesion: 0.25
Nodes (7): expo/tsconfig.base, compilerOptions, paths, strict, extends, include, @/assets/*

### Community 68 - "product-image.ts"
Cohesion: 0.43
Nodes (6): ProductImagePicker(), handlePick(), deriveProductImageExtension(), fileExtension(), pickProductImage(), ProductImagePickResult

### Community 69 - "Color Palette & Accessibility Tokens"
Cohesion: 0.29
Nodes (7): Color Palette & Accessibility Tokens, Definition of Done, Mobile Design Patterns, Platform Layout & Responsiveness, 8pt Spacing Grid & Touch Targets, Tablet Split-View POS, Typography System (native + monospace)

### Community 70 - "secondary-button.tsx"
Cohesion: 0.14
Nodes (32): ref_expo_vector_icons_materialcommunityicons, styles, styles, styles, CredentialKind, LoginErrorKey, LoginStep, styles (+24 more)

### Community 71 - "Theme Accent Personalization"
Cohesion: 0.50
Nodes (5): Business Profile Domain, Theme Accent Personalization, Customization & White-Label, theme-store (persisted light/dark override), Theming via Design Tokens

### Community 72 - "app-dialog.tsx"
Cohesion: 0.18
Nodes (10): AppDialogProps, styles, TONE_ICONS, PrimaryButtonTone, styles, SwitchRow(), SwitchRowProps, NOTE: @testing-library/react-native v14 ships an async `render` (React 19) — (+2 more)

### Community 74 - "animated-icon.web.tsx"
Cohesion: 0.22
Nodes (6): react-native-reanimated, src_components_animated_icon_module, glowKeyframe, keyframe, logoKeyframe, styles

### Community 75 - "export-web.mjs"
Cohesion: 0.33
Nodes (5): projectRoot, result, ref_node_child_process, ref_node_path, ref_node_url

### Community 76 - "(tabs)/index.tsx"
Cohesion: 0.11
Nodes (18): ref_canvaskit_wasm_bin_full_canvaskit_wasm, ref_shopify_react_native_skia_lib_module_web, victory-native, DashboardScreen(), IncomeTrendChart, PERIOD_LABEL_KEY, PeriodChip(), styles (+10 more)

### Community 77 - "supplier-item.ts"
Cohesion: 0.33
Nodes (10): deleteSupplierItem(), getSupplierItemById(), listSupplierItems(), mapSupplierItemRow(), SupplierItem, SupplierItemRow, toSupplierItem(), upsertSupplierItem() (+2 more)

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
Cohesion: 0.17
Nodes (28): ExpenseEditScreen(), load(), InventoryItemEditScreen(), load(), formatSignedQuantity(), InventoryDetailScreen(), load(), resolveSupplierForItem() (+20 more)

### Community 83 - "receipt/[id].tsx"
Cohesion: 0.18
Nodes (17): fullName(), ReceiptScreen(), styles, cash, completedSale, mockBack, mockGetSaleById, mockListPaymentMethods (+9 more)

### Community 84 - "bottom-sheet.tsx"
Cohesion: 0.40
Nodes (4): react-native-safe-area-context, BottomSheet(), BottomSheetProps, styles

### Community 85 - "metro.config.js"
Cohesion: 0.50
Nodes (3): config, { getDefaultConfig }, ref_expo_metro_config

### Community 86 - "i18n/index.ts"
Cohesion: 0.09
Nodes (20): dayjs, ref_dayjs_locale_en, ref_dayjs_locale_es, expo-localization, i18next, mockCompleteOnboarding, mockPickBusinessLogo, mockReplace (+12 more)

### Community 87 - "Expo Icon Composition (Icon Composer Layer Stack)"
Cohesion: 1.00
Nodes (3): Expo Icon Composition (Icon Composer Layer Stack), Expo Symbol (White Chevron Mark), Icon Grid Overlay (Transparent 1024x1024)

### Community 88 - "backup.test.ts"
Cohesion: 0.23
Nodes (12): makeDocument(), exportDatabase(), ADMIN, makeImportDoc(), queueAllTables(), queueSchema(), TABLE_INFO, TableInfoRow (+4 more)

### Community 89 - "Punto Splash Icon"
Cohesion: 1.00
Nodes (3): Punto Splash Icon, Punto Brand Mark (Splash), App Splash Screen Identity

### Community 97 - "src_i18n_index_i18n"
Cohesion: 0.11
Nodes (12): @testing-library/react-native, mockCatalog, mockHeaderOptions, AppDialog(), SegmentedControl(), category, inventoryItems, suppliers (+4 more)

## Ambiguous Edges - Review These
- `Punto Brand Mark (Splash)` → `Punto Splash Icon`  [AMBIGUOUS]
  assets/images/splash-icon.png · relation: conceptually_related_to

## Knowledge Gaps
- **652 isolated node(s):** `AppVariant`, `name`, `slug`, `version`, `orientation` (+647 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 783 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Punto Brand Mark (Splash)` and `Punto Splash Icon`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `useTheme()` connect `useTheme` to `sales.tsx`, `suppliers.tsx`, `pos.tsx`, `Spacing`, `react-i18next`, `products.tsx`, `theme.test.ts`, `backup.tsx`, `theme.ts`, `react-native`, `business-logo.ts`, `validation.ts`, `auth-repository.ts`, `payment.ts`, `catalog-form.ts`, `app/_layout.tsx`, `db/index.ts`, `product-image.ts`, `secondary-button.tsx`, `app-dialog.tsx`, `(tabs)/index.tsx`, `getBusinessProfile`, `receipt/[id].tsx`, `bottom-sheet.tsx`, `src_i18n_index_i18n`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **Why does `react-native` connect `react-native` to `sales.tsx`, `suppliers.tsx`, `pos.tsx`, `useTheme`, `Spacing`, `react-i18next`, `package.json`, `products.tsx`, `backup.tsx`, `theme.ts`, `business-logo.ts`, `app/_layout.tsx`, `language-switch.tsx`, `db/index.ts`, `product-image.ts`, `secondary-button.tsx`, `app-dialog.tsx`, `animated-icon.web.tsx`, `(tabs)/index.tsx`, `receipt/[id].tsx`, `bottom-sheet.tsx`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **What connects `AppVariant`, `name`, `slug` to the rest of the system?**
  _652 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `repositories/index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08208020050125313 - nodes in this community are weakly interconnected._
- **Should `category.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08748114630467571 - nodes in this community are weakly interconnected._