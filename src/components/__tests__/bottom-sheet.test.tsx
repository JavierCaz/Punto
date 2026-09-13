/**
 * Component test for the reusable BottomSheet: renders title/children/footer
 * when visible, stays unmounted when hidden, and dismisses via both the
 * backdrop and the close button. Native modules are mocked so no native code
 * runs.
 */

import { fireEvent, render } from '@testing-library/react-native';
import { Text } from 'react-native';

import { BottomSheet } from '@/components/bottom-sheet';
import { i18n } from '@/i18n';

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

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => {
  const mockMaterialCommunityIcons = () => null;
  return { __esModule: true, default: mockMaterialCommunityIcons };
});

afterEach(async () => {
  if (i18n.language !== 'es') {
    await i18n.changeLanguage('es');
  }
});

describe('BottomSheet', () => {
  it('renders the title, children and footer when visible', async () => {
    const { getByText } = await render(
      <BottomSheet
        visible
        onClose={jest.fn()}
        title="Carrito"
        testID="cart-sheet"
        footer={<Text>Cobrar</Text>}>
        <Text>Contenido</Text>
      </BottomSheet>,
    );

    expect(getByText('Carrito')).toBeTruthy();
    expect(getByText('Contenido')).toBeTruthy();
    expect(getByText('Cobrar')).toBeTruthy();
  });

  it('renders nothing when not visible', async () => {
    const { queryByText } = await render(
      <BottomSheet visible={false} onClose={jest.fn()} title="Carrito" testID="cart-sheet">
        <Text>Contenido</Text>
      </BottomSheet>,
    );

    expect(queryByText('Contenido')).toBeNull();
    expect(queryByText('Carrito')).toBeNull();
  });

  it('calls onClose when the backdrop is pressed', async () => {
    const onClose = jest.fn();
    const { getByTestId } = await render(
      <BottomSheet visible onClose={onClose} testID="cart-sheet">
        <Text>Contenido</Text>
      </BottomSheet>,
    );

    await fireEvent.press(getByTestId('cart-sheet-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the close button is pressed', async () => {
    const onClose = jest.fn();
    const { getByTestId } = await render(
      <BottomSheet visible onClose={onClose} testID="cart-sheet">
        <Text>Contenido</Text>
      </BottomSheet>,
    );

    await fireEvent.press(getByTestId('cart-sheet-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders the header action alongside the close button', async () => {
    const { getByTestId } = await render(
      <BottomSheet
        visible
        onClose={jest.fn()}
        title="Carrito"
        testID="cart-sheet"
        headerAction={<Text testID="cart-sheet-header-action">Editar</Text>}>
        <Text>Contenido</Text>
      </BottomSheet>,
    );

    expect(getByTestId('cart-sheet-header-action')).toBeTruthy();
    expect(getByTestId('cart-sheet-close')).toBeTruthy();
  });
});
