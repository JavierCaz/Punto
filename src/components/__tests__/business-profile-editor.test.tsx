/**
 * Component test for the Settings business-profile editor: load, edit, save.
 *
 * The SQLite layer (`@/db`) and the logo helper are mocked so no native code
 * runs; i18n/kv-store/icons/image are stubbed as in ui-primitives.test.tsx.
 */

import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { BusinessProfileEditor } from '@/components/business-profile-editor';
import { i18n } from '@/i18n';
import { useAccentStore } from '@/theme/accent-store';

const mockGetBusinessProfile = jest.fn();
const mockUpdateBusinessProfile = jest.fn();

jest.mock('@/db', () => ({
  getBusinessProfile: (...args: unknown[]) => mockGetBusinessProfile(...args),
  updateBusinessProfile: (...args: unknown[]) => mockUpdateBusinessProfile(...args),
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

const profile = {
  name: 'Café La Esquina',
  logoUri: null,
  currencyCode: 'MXN',
  locale: 'es' as const,
  accentColor: 'royal' as const,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUpdateBusinessProfile.mockResolvedValue({});
  useAccentStore.setState({ accent: 'royal', hasHydrated: false });
});

afterEach(async () => {
  if (i18n.language !== 'es') {
    await i18n.changeLanguage('es');
  }
});

describe('BusinessProfileEditor', () => {
  it('loads and renders the persisted business profile', async () => {
    mockGetBusinessProfile.mockResolvedValue(profile);

    const { getByDisplayValue, getByText } = await render(<BusinessProfileEditor />);

    await waitFor(() => expect(getByDisplayValue('Café La Esquina')).toBeTruthy());
    expect(getByText('Peso mexicano (MXN)')).toBeTruthy();
    expect(getByText('Dólar estadounidense (USD)')).toBeTruthy();
  });

  it('saves the edited name and currency through updateBusinessProfile', async () => {
    mockGetBusinessProfile.mockResolvedValue(profile);

    const { getByDisplayValue, getByText } = await render(<BusinessProfileEditor />);

    const nameInput = await waitFor(() => getByDisplayValue('Café La Esquina'));
    await fireEvent.changeText(nameInput, 'Café Nuevo');
    await fireEvent.press(getByText('Dólar estadounidense (USD)'));
    await fireEvent.press(getByText('Guardar cambios'));

    await waitFor(() =>
      expect(mockUpdateBusinessProfile).toHaveBeenCalledWith({
        name: 'Café Nuevo',
        logoUri: null,
        currencyCode: 'USD',
        locale: 'es',
        accentColor: 'royal',
      }),
    );
  });

  it('saves the selected accent and applies it to the accent store', async () => {
    mockGetBusinessProfile.mockResolvedValue(profile);

    const { getByTestId, getByText } = await render(<BusinessProfileEditor />);

    await waitFor(() => expect(getByTestId('accent-option-royal')).toBeTruthy());
    await fireEvent.press(getByTestId('accent-option-emerald'));
    await fireEvent.press(getByText('Guardar cambios'));

    await waitFor(() =>
      expect(mockUpdateBusinessProfile).toHaveBeenCalledWith({
        name: 'Café La Esquina',
        logoUri: null,
        currencyCode: 'MXN',
        locale: 'es',
        accentColor: 'emerald',
      }),
    );
    expect(useAccentStore.getState().accent).toBe('emerald');
  });

  it('preserves the persisted business locale instead of the live UI language', async () => {
    mockGetBusinessProfile.mockResolvedValue({
      name: 'Corner Cafe',
      logoUri: null,
      currencyCode: 'USD',
      locale: 'en',
      accentColor: 'royal',
    });

    const { getByDisplayValue, getByText } = await render(<BusinessProfileEditor />);

    const nameInput = await waitFor(() => getByDisplayValue('Corner Cafe'));
    await fireEvent.changeText(nameInput, 'Corner Cafe 2');
    await fireEvent.press(getByText('Guardar cambios'));

    await waitFor(() =>
      expect(mockUpdateBusinessProfile).toHaveBeenCalledWith({
        name: 'Corner Cafe 2',
        logoUri: null,
        currencyCode: 'USD',
        locale: 'en',
        accentColor: 'royal',
      }),
    );
  });

  it('blocks save and shows an error when the name is empty', async () => {
    mockGetBusinessProfile.mockResolvedValue(profile);

    const { getByDisplayValue, getByText } = await render(<BusinessProfileEditor />);

    const nameInput = await waitFor(() => getByDisplayValue('Café La Esquina'));
    await fireEvent.changeText(nameInput, '   ');
    await fireEvent.press(getByText('Guardar cambios'));

    expect(getByText('Escribe el nombre del negocio.')).toBeTruthy();
    expect(mockUpdateBusinessProfile).not.toHaveBeenCalled();
  });
});
