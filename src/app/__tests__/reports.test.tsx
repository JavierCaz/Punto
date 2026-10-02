/**
 * Component test for the Reports screen (monthly cash-flow PDF for the
 * accountant) and its More-tab entry point.
 *
 * '@/db', '@/auth', expo-router and the native PDF seam ('@/lib/report-pdf')
 * are mocked so the screen renders offline. The report model and HTML
 * template are the real shipped code; dialogs render through <DialogHost />.
 */

import { fireEvent, render, waitFor } from '@testing-library/react-native';

import MoreScreen from '@/app/(tabs)/more';
import ReportsScreen from '@/app/reports';
import { useCan } from '@/auth';
import { getCashflowReportData, type CashflowReportData } from '@/db';
import { DialogHost, dismissDialog } from '@/dialog';
import { i18n } from '@/i18n';
import {
  compareMonths,
  defaultReportMonth,
  monthKey,
  monthOf,
  monthRange,
  reportFileName,
  shiftMonth,
} from '@/lib/cashflow-report';
import { exportReportPdf, readLogoDataUri } from '@/lib/report-pdf';

import { septemberData } from '@/lib/__tests__/fakes/cashflow-report-fixtures';

const mockPush = jest.fn();
const ADMIN_USER = { id: 'admin-1', role: 'ADMIN', firstName: 'Ana', lastName: null };

jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), push: (...args: unknown[]) => mockPush(...args) },
  Stack: { Screen: () => null },
}));

jest.mock('@/auth', () => {
  // Defined inside the factory: jest.mock is hoisted above module-level consts.
  const state = {
    user: { id: 'admin-1', role: 'ADMIN', firstName: 'Ana', lastName: null },
    signOut: jest.fn(),
  };
  const useAuthStore = Object.assign(
    (selector: (s: typeof state) => unknown) => selector(state),
    { getState: () => state },
  );
  return { useAuthStore, useCan: jest.fn(() => true) };
});

jest.mock('@/db', () => ({
  getCashflowReportData: jest.fn(),
}));

jest.mock('@/lib/report-pdf', () => ({
  exportReportPdf: jest.fn(async () => {}),
  readLogoDataUri: jest.fn(async () => null),
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { version: '1.0.0' } },
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

function dataFor(range: { from: string; to: string }): CashflowReportData {
  return { ...septemberData(), range };
}

function renderReports() {
  return render(
    <>
      <ReportsScreen />
      <DialogHost />
    </>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  dismissDialog();
  jest.mocked(useCan).mockReturnValue(true);
  jest
    .mocked(getCashflowReportData)
    .mockImplementation(async (_actor, range) => dataFor(range));
});

afterEach(async () => {
  dismissDialog();
  if (i18n.language !== 'es') {
    await i18n.changeLanguage('es');
  }
});

describe('ReportsScreen', () => {
  it('previews the default month totals in Spanish', async () => {
    const month = defaultReportMonth();
    const { getByText, getByTestId } = await renderReports();

    expect(getByText('Flujo de efectivo mensual')).toBeTruthy();
    await waitFor(() => expect(getByTestId('reports-net')).toBeTruthy());
    expect(getByTestId(`reports-preview-${monthKey(month)}`)).toBeTruthy();
    expect(getByTestId('reports-income').props.children).toBe('$17,500.00');
    expect(getByTestId('reports-expense').props.children).toBe('$12,200.00');
    expect(getByTestId('reports-net').props.children).toBe('$5,300.00');
    expect(getCashflowReportData).toHaveBeenCalledWith(ADMIN_USER, monthRange(month));
  });

  it('generates the PDF for the selected month and hands it to the share seam', async () => {
    const month = shiftMonth(defaultReportMonth(), -1);
    const { getByTestId } = await renderReports();
    await waitFor(() => expect(getByTestId('reports-net')).toBeTruthy());

    fireEvent.press(getByTestId('reports-month-previous'));
    await waitFor(() => expect(getByTestId(`reports-preview-${monthKey(month)}`)).toBeTruthy());
    await waitFor(() => expect(getByTestId('reports-net')).toBeTruthy());

    fireEvent.press(getByTestId('reports-generate-button'));

    await waitFor(() => expect(exportReportPdf).toHaveBeenCalledTimes(1));
    const [html, fileName, dialogTitle] = jest.mocked(exportReportPdf).mock.calls[0]!;
    expect(fileName).toBe(reportFileName(month));
    expect(dialogTitle).toBe('Compartir reporte');
    expect(html).toContain('Estado de flujo de efectivo');
    expect(html).toContain('Café Punto S.A. de C.V.');
    expect(readLogoDataUri).toHaveBeenCalled();
    expect(getCashflowReportData).toHaveBeenLastCalledWith(ADMIN_USER, monthRange(month));
  });

  it('never steps into a future month', async () => {
    const { getByTestId } = await renderReports();
    await waitFor(() => expect(getByTestId('reports-net')).toBeTruthy());

    if (compareMonths(defaultReportMonth(), monthOf()) < 0) {
      fireEvent.press(getByTestId('reports-month-next'));
      await waitFor(() =>
        expect(getByTestId(`reports-preview-${monthKey(monthOf())}`)).toBeTruthy(),
      );
    }
    expect(getByTestId('reports-month-next').props.accessibilityState).toMatchObject({
      disabled: true,
    });
  });

  it('shows an error dialog when the PDF cannot be generated', async () => {
    jest.mocked(exportReportPdf).mockRejectedValueOnce(new Error('disk full'));
    const { getByTestId, findByText } = await renderReports();
    await waitFor(() => expect(getByTestId('reports-net')).toBeTruthy());

    fireEvent.press(getByTestId('reports-generate-button'));

    expect(await findByText('No se pudo generar el reporte')).toBeTruthy();
  });

  it('reports a load failure and disables generation', async () => {
    jest.mocked(getCashflowReportData).mockRejectedValue(new Error('boom'));
    const { getByTestId } = await renderReports();

    await waitFor(() => expect(getByTestId('reports-load-failed')).toBeTruthy());
    expect(getByTestId('reports-generate-button').props.accessibilityState).toMatchObject({
      disabled: true,
    });
  });

  it('localizes the screen in English', async () => {
    await i18n.changeLanguage('en');
    const { getByText, getByTestId } = await renderReports();

    expect(getByText('Monthly cash flow')).toBeTruthy();
    await waitFor(() => expect(getByTestId('reports-net')).toBeTruthy());
    expect(getByText('Generate PDF')).toBeTruthy();
    expect(getByText('Net result')).toBeTruthy();
  });
});

describe('More tab reports entry', () => {
  it('shows the Reports row to users with finance access and opens the screen', async () => {
    const { getByTestId } = await render(<MoreScreen />);

    fireEvent.press(getByTestId('more-reports-row'));
    expect(mockPush).toHaveBeenCalledWith('/reports');
  });

  it('hides the Reports row without dashboard.finance.view', async () => {
    jest
      .mocked(useCan)
      .mockImplementation((capability) => capability !== 'dashboard.finance.view');
    const { queryByTestId } = await render(<MoreScreen />);

    expect(queryByTestId('more-reports-row')).toBeNull();
  });
});
