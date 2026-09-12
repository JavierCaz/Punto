/**
 * Component test for the Settings screen shell: section composition, the theme
 * rows, the business editor (including the accent picker) and the localized
 * header. SQLite and native modules are mocked so the screen renders offline.
 */

import { render, waitFor } from '@testing-library/react-native';

import SettingsScreen from '@/app/settings';
import { i18n } from '@/i18n';

const mockHeaderOptions = jest.fn();

jest.mock('expo-router', () => ({
  Stack: {
    Screen: ({ options }: { options?: unknown }) => {
      mockHeaderOptions(options);
      return null;
    },
  },
}));

jest.mock('@/db', () => ({
  getBusinessProfile: jest.fn(async () => ({
    name: 'Café La Esquina',
    logoUri: null,
    currencyCode: 'MXN',
    locale: 'es',
    accentColor: 'royal',
  })),
  updateBusinessProfile: jest.fn(async () => ({})),
}));

jest.mock('@/lib/business-logo', () => ({
  pickBusinessLogo: jest.fn(),
  deleteBusinessLogo: jest.fn(),
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

jest.mock('expo-image', () => ({ Image: () => null }));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(async () => {
  if (i18n.language !== 'es') {
    await i18n.changeLanguage('es');
  }
});

describe('SettingsScreen', () => {
  it('renders the appearance and business sections with their controls', async () => {
    const { getByText, getByTestId, getByDisplayValue } = await render(<SettingsScreen />);

    expect(getByText('Apariencia')).toBeTruthy();
    expect(getByText('Negocio')).toBeTruthy();
    expect(getByText('Claro')).toBeTruthy();
    expect(getByText('Oscuro')).toBeTruthy();
    expect(getByText('Sistema')).toBeTruthy();

    await waitFor(() => expect(getByDisplayValue('Café La Esquina')).toBeTruthy());
    expect(getByText('Color de acento')).toBeTruthy();
    expect(getByTestId('accent-option-royal')).toBeTruthy();
  });

  it('localizes the header and section labels in English', async () => {
    await i18n.changeLanguage('en');

    const { getByText, getByTestId } = await render(<SettingsScreen />);

    expect(getByText('Appearance')).toBeTruthy();
    expect(getByText('Business')).toBeTruthy();
    expect(getByText('Light')).toBeTruthy();
    expect(getByText('Dark')).toBeTruthy();
    expect(getByText('System')).toBeTruthy();

    await waitFor(() => expect(getByTestId('accent-option-royal')).toBeTruthy());
    expect(getByText('Accent color')).toBeTruthy();

    expect(mockHeaderOptions).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Settings', headerBackTitle: 'Back' }),
    );
  });

  it('wires the localized Spanish header title', async () => {
    await render(<SettingsScreen />);

    await waitFor(() =>
      expect(mockHeaderOptions).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Configuración', headerBackTitle: 'Volver' }),
      ),
    );
  });
});
