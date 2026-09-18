/**
 * Expenses screen tests — the manual money-out/in feature:
 * the history list shows per-direction totals and localized money, and the
 * entry form validates the amount + category before recording a transaction.
 *
 * SQLite and native modules are mocked so the screens render offline.
 */

import { fireEvent, render, waitFor } from '@testing-library/react-native';

import ExpensesScreen from '@/app/expenses/index';
import ExpenseEditScreen from '@/app/expenses/edit';
import {
  createFinancialTransaction,
  ensureDefaultFinancialCategories,
  getBusinessProfile,
  listFinancialCategories,
  listFinancialTransactions,
  listPaymentMethods,
  listSuppliers,
  type FinancialCategory,
  type FinancialTransaction,
} from '@/db';
import { i18n } from '@/i18n';
import { formatMoney } from '@/i18n/format';

// Admin session: the create affordances are visible (employee gating is
// covered by the permissions unit tests).
jest.mock('@/auth', () => ({ useCan: () => true }));

const mockBack = jest.fn();
const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  router: {
    push: (...args: unknown[]) => mockPush(...args),
    navigate: jest.fn(),
    replace: jest.fn(),
    back: (...args: unknown[]) => mockBack(...args),
  },
  Stack: { Screen: () => null },
  useFocusEffect: (callback: () => void) => {
    const { useEffect } = jest.requireActual<typeof import('react')>('react');
    useEffect(callback, [callback]);
  },
}));

jest.mock('@/db', () => ({
  createFinancialTransaction: jest.fn(),
  ensureDefaultFinancialCategories: jest.fn(),
  getBusinessProfile: jest.fn(),
  listFinancialCategories: jest.fn(),
  listFinancialTransactions: jest.fn(),
  listPaymentMethods: jest.fn(),
  listSuppliers: jest.fn(),
}));

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'es' }],
}));

jest.mock('expo-sqlite/kv-store', () => ({
  __esModule: true,
  default: {
    getItemAsync: jest.fn(async () => null),
    setItemAsync: jest.fn(async () => {}),
    removeItemAsync: jest.fn(async () => {}),
  },
}));

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => {
  const mockMaterialCommunityIcons = () => null;
  return { __esModule: true, default: mockMaterialCommunityIcons };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const category = (overrides: Partial<FinancialCategory> = {}): FinancialCategory => ({
  id: 'cat-1',
  businessId: 'biz-1',
  name: 'Renta',
  type: 'EXPENSE',
  isSystem: true,
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const transaction = (overrides: Partial<FinancialTransaction> = {}): FinancialTransaction => ({
  id: 'ft-1',
  businessId: 'biz-1',
  categoryId: 'cat-1',
  amountMinor: 150000,
  paymentMethodId: null,
  supplierId: null,
  employeeId: null,
  description: null,
  referenceType: null,
  referenceId: null,
  createdAt: '2026-09-08T14:05:00.000Z',
  updatedAt: '2026-09-08T14:05:00.000Z',
  ...overrides,
});

const mockListTransactions = listFinancialTransactions as jest.MockedFunction<
  typeof listFinancialTransactions
>;
const mockListCategories = listFinancialCategories as jest.MockedFunction<
  typeof listFinancialCategories
>;
const mockEnsureCategories = ensureDefaultFinancialCategories as jest.MockedFunction<
  typeof ensureDefaultFinancialCategories
>;
const mockCreateTransaction = createFinancialTransaction as jest.MockedFunction<
  typeof createFinancialTransaction
>;
const mockGetProfile = getBusinessProfile as jest.MockedFunction<typeof getBusinessProfile>;
const mockListPaymentMethods = listPaymentMethods as jest.MockedFunction<typeof listPaymentMethods>;
const mockListSuppliers = listSuppliers as jest.MockedFunction<typeof listSuppliers>;

beforeEach(() => {
  jest.clearAllMocks();

  mockGetProfile.mockResolvedValue({ currencyCode: 'MXN' } as Awaited<
    ReturnType<typeof getBusinessProfile>
  >);
  mockListTransactions.mockResolvedValue({
    items: [
      transaction(),
      transaction({ id: 'ft-2', categoryId: 'cat-2', amountMinor: 5000 }),
    ],
    nextCursor: null,
  });
  mockListCategories.mockResolvedValue([
    category(),
    category({ id: 'cat-2', name: 'Otros ingresos', type: 'INCOME', isSystem: true }),
  ]);
  mockEnsureCategories.mockResolvedValue([]);
  mockListPaymentMethods.mockResolvedValue([]);
  mockListSuppliers.mockResolvedValue([]);
  mockCreateTransaction.mockResolvedValue(transaction());
});

afterEach(async () => {
  if (i18n.language !== 'es') {
    await i18n.changeLanguage('es');
  }
});

describe('ExpensesScreen', () => {
  it('lists entries with direction-signed money and per-direction totals', async () => {
    const { getAllByText, getByTestId, getByText } = await render(<ExpensesScreen />);

    await waitFor(() => expect(getByText('Renta')).toBeTruthy());
    expect(getByText('Otros ingresos')).toBeTruthy();
    expect(getByTestId('expense-row-ft-1')).toBeTruthy();

    expect(getByText('Gastos manuales')).toBeTruthy();
    expect(getByText('Ingresos manuales')).toBeTruthy();
    // The signed amount appears on the row and in the per-direction summary.
    expect(getAllByText(`−${formatMoney(150000, 'MXN')}`).length).toBeGreaterThan(0);
    expect(getAllByText(`+${formatMoney(5000, 'MXN')}`).length).toBeGreaterThan(0);
  });

  it('opens the entry form from the list empty state action', async () => {
    mockListTransactions.mockResolvedValue({ items: [], nextCursor: null });
    const { getByText } = await render(<ExpensesScreen />);

    await waitFor(() => expect(getByText('Registrar gasto')).toBeTruthy());
    await fireEvent.press(getByText('Registrar gasto'));
    expect(mockPush).toHaveBeenCalledWith('/expenses/edit');
  });
});

describe('ExpenseEditScreen', () => {
  it('validates the amount and category before saving', async () => {
    const { getByTestId, getByText } = await render(<ExpenseEditScreen />);

    await waitFor(() => expect(getByTestId('expense-save')).toBeTruthy());

    await fireEvent.press(getByTestId('expense-save'));

    await waitFor(() => expect(getByText('Escribe el monto.')).toBeTruthy());
    expect(getByText('Elige una categoría.')).toBeTruthy();
    expect(mockCreateTransaction).not.toHaveBeenCalled();
  });

  it('records a positive-minor transaction and goes back on success', async () => {
    const { getByTestId } = await render(<ExpenseEditScreen />);

    await waitFor(() => expect(getByTestId('expense-save')).toBeTruthy());

    await fireEvent.changeText(getByTestId('expense-amount'), '250.50');
    await fireEvent.press(getByTestId('expense-category-trigger'));
    await waitFor(() => expect(getByTestId('expense-category-cat-1')).toBeTruthy());
    await fireEvent.press(getByTestId('expense-category-cat-1'));
    await fireEvent.press(getByTestId('expense-save'));

    await waitFor(() =>
      expect(mockCreateTransaction).toHaveBeenCalledWith(
        expect.objectContaining({ categoryId: 'cat-1', amountMinor: 25050 }),
      ),
    );
    expect(mockBack).toHaveBeenCalled();
  });
});
