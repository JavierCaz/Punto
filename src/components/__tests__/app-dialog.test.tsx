/**
 * Component tests for the custom AppDialog: content rendering, primary and
 * secondary actions, backdrop dismissal and hidden state. Native modules are
 * mocked so no native code runs.
 */

import { fireEvent, render } from '@testing-library/react-native';

import { AppDialog } from '@/components/app-dialog';
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

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => {
  const mockMaterialCommunityIcons = () => null;
  return { __esModule: true, default: mockMaterialCommunityIcons };
});

afterEach(async () => {
  if (i18n.language !== 'es') {
    await i18n.changeLanguage('es');
  }
});

describe('AppDialog', () => {
  it('renders the title, message and both actions, firing their handlers', async () => {
    const onPrimaryPress = jest.fn();
    const onSecondaryPress = jest.fn();

    const { getByText, getByTestId } = await render(
      <AppDialog
        visible
        tone="danger"
        title="¿Borrar todos los datos?"
        message="Esta acción no se puede deshacer."
        primaryLabel="Eliminar"
        primaryTone="danger"
        onPrimaryPress={onPrimaryPress}
        secondaryLabel="Cancelar"
        onSecondaryPress={onSecondaryPress}
        onDismiss={jest.fn()}
        testID="app-dialog"
      />,
    );

    expect(getByText('¿Borrar todos los datos?')).toBeTruthy();
    expect(getByText('Esta acción no se puede deshacer.')).toBeTruthy();

    await fireEvent.press(getByTestId('app-dialog-confirm'));
    expect(onPrimaryPress).toHaveBeenCalledTimes(1);

    await fireEvent.press(getByTestId('app-dialog-cancel'));
    expect(onSecondaryPress).toHaveBeenCalledTimes(1);
  });

  it('omits the secondary action for acknowledge-only dialogs', async () => {
    const { getByText, queryByTestId } = await render(
      <AppDialog
        visible
        tone="success"
        title="Copia exportada"
        message="Listo."
        primaryLabel="Aceptar"
        onPrimaryPress={jest.fn()}
        onDismiss={jest.fn()}
        testID="app-dialog"
      />,
    );

    expect(getByText('Copia exportada')).toBeTruthy();
    expect(queryByTestId('app-dialog-cancel')).toBeNull();
  });

  it('dismisses when the backdrop is pressed', async () => {
    const onDismiss = jest.fn();

    const { getByTestId } = await render(
      <AppDialog
        visible
        title="Aviso"
        primaryLabel="Aceptar"
        onPrimaryPress={jest.fn()}
        onDismiss={onDismiss}
        testID="app-dialog"
      />,
    );

    await fireEvent.press(getByTestId('app-dialog-backdrop'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('renders nothing while hidden', async () => {
    const { queryByText } = await render(
      <AppDialog visible={false} title="Aviso" primaryLabel="Aceptar" onPrimaryPress={jest.fn()} />,
    );

    expect(queryByText('Aviso')).toBeNull();
  });
});
