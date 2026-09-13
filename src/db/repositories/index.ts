/**
 * Public surface of the typed data-access layer. Import from '@/db/repositories'
 * anywhere you need to read or write business data: the adapter seam, errors,
 * pagination, calc helpers, shared domain vocabulary, and every entity
 * repository.
 *
 * Entity repositories are grouped by domain below and keep this barrel a flat
 * re-export surface. Screens and zustand stores should depend on these functions
 * rather than opening the database themselves.
 */

// Database adapter seam.
export type { DatabaseAdapter, RunResult, SqlValue } from '@/db/repositories/database';

// Transaction helper.
export { withTransaction } from '@/db/repositories/transaction';

// Id / clock primitives.
export { newId } from '@/db/repositories/ids';
export { nowIso } from '@/db/repositories/clock';

// Errors.
export { REPO_ERROR, isRepoError, mapSqliteError, repoError } from '@/db/repositories/errors';
export type { RepoError, RepoErrorCode } from '@/db/repositories/errors';

// Row coercion helpers.
export {
  archiveSoftWhere,
  boolFromInt,
  int,
  intBool,
  intOrNull,
  str,
  strOrNull,
} from '@/db/repositories/mappers';

// Keyset pagination.
export {
  DEFAULT_PAGE_LIMIT,
  decodeCursor,
  encodeCursor,
  keysetWhere,
} from '@/db/repositories/pagination';
export type { Page, PageQuery } from '@/db/repositories/pagination';

// Pure money / quantity / stock math.
export {
  assertSufficientStock,
  computeChangeMinor,
  computeIngredientCostMinor,
  computeLineSubtotalMinor,
  computeRecipeConsumptionMilli,
  computeRecipeCostMinor,
  computeTaxMinor,
  scaleQuantityByCount,
  sumMinor,
  weightedAverageUnitCostMinor,
} from '@/db/repositories/calc';

// Business scope.
export { getBusinessId, resetBusinessIdForTesting } from '@/db/repositories/business-scope';

// Shared domain vocabulary.
export {
  FINANCE_TYPES,
  MOVEMENT_TYPES,
  PAYMENT_TYPES,
  PURCHASE_STATUSES,
  SALE_STATUSES,
  UNIT_TYPES,
  isMovementType,
  isSaleStatus,
} from '@/db/repositories/types';
export type {
  FinanceType,
  ListOptions,
  MoneyMinor,
  MovementType,
  PaymentType,
  PurchaseStatus,
  QuantityMilli,
  SaleStatus,
  TaxBasisPoints,
  TimestampIso,
  UnitType,
} from '@/db/repositories/types';

// SQL building helpers.
export { buildUpdateAssignments } from '@/db/repositories/sql';


// ---------------------------------------------------------------------------
// Entity repositories
// ---------------------------------------------------------------------------

// Business profile (single row).
export {
  ACCENT_COLORS,
  LOCALE_CODES,
  getBusinessProfile,
  isAccentColor,
  isLocaleCode,
  updateBusinessProfile,
} from '@/db/repositories/business';
export type {
  AccentColor,
  BusinessProfile,
  BusinessProfilePatch,
  LocaleCode,
} from '@/db/repositories/business';

// Units of measure.
export {
  DEFAULT_UNITS,
  createUnit,
  ensureDefaultUnits,
  getUnitById,
  listUnits,
  updateUnit,
} from '@/db/repositories/unit';
export type { CreateUnitInput, Unit, UpdateUnitInput } from '@/db/repositories/unit';

// Categories.
export {
  archiveCategory,
  createCategory,
  getCategoryById,
  listCategories,
  updateCategory,
} from '@/db/repositories/category';
export type {
  Category,
  CreateCategoryInput,
  UpdateCategoryInput,
} from '@/db/repositories/category';

// Payment methods.
export {
  createPaymentMethod,
  ensureDefaultPaymentMethods,
  getPaymentMethodById,
  listPaymentMethods,
  updatePaymentMethod,
} from '@/db/repositories/payment-method';
export type {
  CreatePaymentMethodInput,
  PaymentMethod,
  UpdatePaymentMethodInput,
} from '@/db/repositories/payment-method';

// Suppliers.
export {
  archiveSupplier,
  createSupplier,
  getSupplierById,
  listSuppliers,
  updateSupplier,
} from '@/db/repositories/supplier';
export type {
  CreateSupplierInput,
  Supplier,
  UpdateSupplierInput,
} from '@/db/repositories/supplier';

// Inventory items (stockable raw materials).
export {
  archiveInventoryItem,
  createInventoryItem,
  getInventoryItemById,
  listInventoryItems,
  listLowStockItems,
  updateInventoryItem,
} from '@/db/repositories/inventory-item';
export type {
  CreateInventoryItemInput,
  InventoryItem,
  UpdateInventoryItemInput,
} from '@/db/repositories/inventory-item';

// Products (sellable catalog items).
export {
  archiveProduct,
  createProduct,
  getProductById,
  listProducts,
  updateProduct,
} from '@/db/repositories/product';
export type {
  CreateProductInput,
  ListProductsOptions,
  Product,
  UpdateProductInput,
} from '@/db/repositories/product';

// Recipes (product-bound ingredient consumption).
export {
  getRecipeByProductId,
  listRecipes,
  setRecipeActive,
  upsertRecipe,
} from '@/db/repositories/recipe';
export type {
  Recipe,
  RecipeDetail,
  RecipeItem,
  RecipeItemInput,
  UpsertRecipeInput,
} from '@/db/repositories/recipe';

// Inventory movement ledger (single source of truth for stock).
export {
  adjustQuantity,
  listMovements,
  reconcileItemFromLedger,
  recordMovement,
  recordMovementWithTxn,
} from '@/db/repositories/movement';
export type {
  InventoryMovement,
  MovementFilter,
  RecordMovementInput,
} from '@/db/repositories/movement';

// Supplier ↔ inventory item links.
export {
  deleteSupplierItem,
  getSupplierItemById,
  listSupplierItems,
  upsertSupplierItem,
} from '@/db/repositories/supplier-item';
export type { SupplierItem, UpsertSupplierItemInput } from '@/db/repositories/supplier-item';

// Purchases (money out + stock in).
export { cancelPurchase, createPurchase, getPurchaseById, listPurchases } from '@/db/repositories/purchase';
export type {
  CreatePurchaseInput,
  Purchase,
  PurchaseDetail,
  PurchaseFilter,
  PurchaseItem,
  PurchaseItemInput,
} from '@/db/repositories/purchase';

// Sales / POS.
export {
  addSaleItem,
  cancelSale,
  checkoutSale,
  completeSale,
  createHeldSale,
  getSaleById,
  listSales,
  refundSale,
  removeSaleItem,
  updateSaleItemQuantity,
} from '@/db/repositories/sale';
export type {
  Payment,
  PaymentInput,
  Sale,
  SaleDetail,
  SaleFilter,
  SaleItem,
  SaleItemInput,
} from '@/db/repositories/sale';

// Finance (expenses / non-sale income).
export {
  createFinancialCategory,
  createFinancialTransaction,
  getFinancialCategoryById,
  getFinancialTransactionById,
  listFinancialCategories,
  listFinancialTransactions,
  updateFinancialCategory,
} from '@/db/repositories/finance';
export type {
  CreateFinancialCategoryInput,
  CreateFinancialTransactionInput,
  FinancialCategory,
  FinancialTransaction,
  FinancialTransactionFilter,
  UpdateFinancialCategoryInput,
} from '@/db/repositories/finance';

// App metadata + document counters.
export { getMetadata, nextPurchaseNumber, nextSaleNumber, setMetadata } from '@/db/repositories/app-metadata';