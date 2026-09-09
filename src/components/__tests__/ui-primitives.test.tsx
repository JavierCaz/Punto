/**
 * Component tests for the shared UI primitives (EmptyState, buttons) and the
 * Settings theme rows (ThemeModeOptions), rendered via @testing-library/react-native.
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
import { ThemeModeOptions } from '@/components/theme-options';
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

describe('Settings theme rows', () => {
  beforeEach(() => {
    useThemeStore.setState({ mode: 'system', hasHydrated: false });
  });

  it('renders the three theme options with Spanish labels', async () => {
    const { getByText } = await render(<ThemeModeOptions />);

    expect(getByText('Claro')).toBeTruthy();
    expect(getByText('Oscuro')).toBeTruthy();
    expect(getByText('Sistema')).toBeTruthy();
  });

  it('selecting a row updates the persisted theme-mode store', async () => {
    const { getByText } = await render(<ThemeModeOptions />);

    await fireEvent.press(getByText('Oscuro'));
    expect(useThemeStore.getState().mode).toBe('dark');

    await fireEvent.press(getByText('Claro'));
    expect(useThemeStore.getState().mode).toBe('light');
  });

  it('renders an English label when the active language is en', async () => {
    await i18n.changeLanguage('en');
    const { getByText } = await render(<ThemeModeOptions />);

    expect(getByText('Dark')).toBeTruthy();
    expect(getByText('System')).toBeTruthy();
  });
});
