/**
 * Component tests for the shared UI primitives (EmptyState, buttons) and the
 * Settings theme switch (ThemeSwitch), rendered via @testing-library/react-native.
 *
 * Native modules are mocked: expo-localization (i18n init), expo-sqlite kv-store
 * (zustand stores) and the MaterialCommunityIcons font component.
 *
 * NOTE: @testing-library/react-native v14 ships an async `render` (React 19) —
 * every render must be awaited.
 */

import { fireEvent, render } from '@testing-library/react-native';

import { EmptyState } from '@/components/empty-state';
import { PrimaryButton } from '@/components/primary-button';
import { SecondaryButton } from '@/components/secondary-button';
import { ThemeSwitch } from '@/components/theme-switch';
import { i18n } from '@/i18n';
import { useThemeStore } from '@/theme/theme-store';

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'es' }],
}));

jest.mock('expo-sqlite/kv-store', () => ({
  __esModule: true,
  default: {
    getItemAsync: jest.fn(async () => null),
    setItemAsync: jest.fn(async () => {}),
  },
}));

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => {
  const mockMaterialCommunityIcons = () => null;
  return { __esModule: true, default: mockMaterialCommunityIcons };
});

describe('EmptyState', () => {
  it('renders icon, title, message and fires the primary action', async () => {
    const onPress = jest.fn();
    const { getByText } = await render(
      <EmptyState
        icon="shopping-outline"
        title="Catálogo vacío"
        message="Agrega productos para comenzar"
        actionLabel="Agregar producto"
        onActionPress={onPress}
      />,
    );

    expect(getByText('Catálogo vacío')).toBeTruthy();
    expect(getByText('Agrega productos para comenzar')).toBeTruthy();

    await fireEvent.press(getByText('Agregar producto'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders without message or action when not provided', async () => {
    const { queryByText } = await render(<EmptyState icon="receipt-outline" title="Sin ventas" />);

    expect(queryByText('Sin ventas')).toBeTruthy();
  });
});

describe('buttons', () => {
  it('PrimaryButton fires onPress', async () => {
    const onPress = jest.fn();
    const { getByText } = await render(<PrimaryButton label="Cobrar" onPress={onPress} />);

    await fireEvent.press(getByText('Cobrar'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('SecondaryButton fires onPress', async () => {
    const onPress = jest.fn();
    const { getByText } = await render(<SecondaryButton label="Ajustar stock" onPress={onPress} />);

    await fireEvent.press(getByText('Ajustar stock'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('Settings theme switch', () => {
  beforeEach(() => {
    useThemeStore.setState({ mode: 'system', hasHydrated: false });
  });

  it('renders the dark-mode switch with Spanish copy', async () => {
    const { getByText, getByTestId } = await render(<ThemeSwitch />);

    expect(getByText('Modo oscuro')).toBeTruthy();
    expect(getByTestId('theme-dark-switch')).toBeTruthy();
  });

  it('toggling the switch persists an explicit theme mode', async () => {
    const { getByTestId } = await render(<ThemeSwitch />);

    await fireEvent(getByTestId('theme-dark-switch'), 'valueChange', true);
    expect(useThemeStore.getState().mode).toBe('dark');

    await fireEvent(getByTestId('theme-dark-switch'), 'valueChange', false);
    expect(useThemeStore.getState().mode).toBe('light');
  });

  it('renders English copy when the active language is en', async () => {
    await i18n.changeLanguage('en');
    const { getByText } = await render(<ThemeSwitch />);

    expect(getByText('Dark mode')).toBeTruthy();
  });
});
