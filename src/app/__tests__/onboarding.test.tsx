/**
 * Component test for the first-run onboarding screen: it must collect and
 * forward business name, logo, currency and locale to `completeOnboarding`.
 *
 * `@/auth`, the logo helper and all native modules are mocked so the screen can
 * render and submit without SQLite, the photo picker or a router.
 */

import { fireEvent, render, waitFor } from '@testing-library/react-native';

import OnboardingScreen from '@/app/onboarding';
import { i18n } from '@/i18n';

// Cold-cache first render of the full wizard is heavier than a typical unit test.
jest.setTimeout(15000);

const mockCompleteOnboarding = jest.fn();
const mockPickBusinessLogo = jest.fn();
const mockReplace = jest.fn();

jest.mock('@/auth', () => ({
  useAuthStore: {
    getState: () => ({
      completeOnboarding: (...args: unknown[]) => mockCompleteOnboarding(...args),
    }),
  },
  normalizeUsername: (value: string) => value.trim().toLowerCase(),
  validatePassword: () => null,
  validateUsername: () => null,
}));

jest.mock('@/lib/business-logo', () => ({
  pickBusinessLogo: (...args: unknown[]) => mockPickBusinessLogo(...args),
  deleteBusinessLogo: jest.fn(),
}));

jest.mock('expo-router', () => ({
  router: { replace: (...args: unknown[]) => mockReplace(...args) },
}));

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'es', currencyCode: 'USD' }],
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

async function fillAccountFields(getByPlaceholderText: (text: string) => unknown, getByLabelText: (text: string) => unknown): Promise<void> {
  await fireEvent.changeText(getByPlaceholderText('Ej. Café La Esquina') as never, 'Café La Esquina');
  await fireEvent.changeText(getByPlaceholderText('Ej. Ana') as never, 'Ana');
  await fireEvent.changeText(getByPlaceholderText('Ej. ana.duena') as never, 'ana.duena');
  await fireEvent.changeText(getByLabelText('Contraseña') as never, 'sup3r-secret');
  await fireEvent.changeText(getByLabelText('Repite la contraseña') as never, 'sup3r-secret');
}

beforeEach(() => {
  jest.clearAllMocks();
  mockCompleteOnboarding.mockResolvedValue({ ok: true, user: { id: 'emp-1' } });
});

afterEach(async () => {
  if (i18n.language !== 'es') {
    await i18n.changeLanguage('es');
  }
});

describe('OnboardingScreen', () => {
  it('forwards business name, logo, currency and locale to completeOnboarding', async () => {
    mockPickBusinessLogo.mockResolvedValue({ status: 'picked', uri: 'file:///doc/logos/logo-x.png' });

    const { getByText, getByTestId, getByPlaceholderText, getByLabelText } = await render(
      <OnboardingScreen />,
    );

    await fillAccountFields(getByPlaceholderText, getByLabelText);

    // Logo (optional) — pick one via the avatar.
    await fireEvent.press(getByTestId('business-logo-avatar'));

    // Currency — switch the device default (USD) to MXN.
    await fireEvent(getByTestId('currency-switch'), 'valueChange', false);

    await fireEvent.press(getByText('Crear mi negocio'));

    await waitFor(() =>
      expect(mockCompleteOnboarding).toHaveBeenCalledWith({
        businessName: 'Café La Esquina',
        logoUri: 'file:///doc/logos/logo-x.png',
        currencyCode: 'MXN',
        locale: 'es',
        adminFirstName: 'Ana',
        username: 'ana.duena',
        password: 'sup3r-secret',
      }),
    );
    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  it('uses the selected language as the business locale', async () => {
    const { getByText, getByTestId, getByPlaceholderText, getByLabelText } = await render(<OnboardingScreen />);

    await fillAccountFields(getByPlaceholderText, getByLabelText);

    await fireEvent(getByTestId('language-switch'), 'valueChange', true);
    await waitFor(() => expect(i18n.language).toBe('en'));

    await fireEvent.press(getByText('Create my business'));

    await waitFor(() =>
      expect(mockCompleteOnboarding).toHaveBeenCalledWith(
        expect.objectContaining({ locale: 'en', currencyCode: 'USD' }),
      ),
    );
  });
});
