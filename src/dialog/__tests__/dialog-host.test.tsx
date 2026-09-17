/**
 * Integration tests for the global dialog system: the DialogHost renders what
 * showMessage / showConfirm enqueue, invokes the right callbacks and supports
 * chained dialogs (a handler opening a follow-up dialog).
 */

import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import { DialogHost, dismissDialog, showConfirm, showMessage } from '@/dialog';
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

beforeEach(() => {
  dismissDialog();
});

afterEach(async () => {
  dismissDialog();
  if (i18n.language !== 'es') {
    await i18n.changeLanguage('es');
  }
});

describe('DialogHost', () => {
  it('renders a message dialog and dismisses it with the default acknowledge label', async () => {
    const { getByText, queryByText } = await render(<DialogHost />);

    await act(async () => {
      showMessage({ title: 'Copia exportada', message: 'Listo.', tone: 'success' });
    });

    expect(getByText('Copia exportada')).toBeTruthy();
    expect(getByText('Aceptar')).toBeTruthy();

    await fireEvent.press(getByText('Aceptar'));
    expect(queryByText('Copia exportada')).toBeNull();
  });

  it('invokes onConfirm when the confirmation action is pressed', async () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();

    const { getByText, getByTestId } = await render(<DialogHost />);

    await act(async () => {
      showConfirm({
        title: '¿Reemplazar todos los datos?',
        message: 'Esta acción no se puede deshacer.',
        tone: 'danger',
        confirmLabel: 'Confirmar',
        confirmTone: 'danger',
        onConfirm,
        onCancel,
      });
    });

    expect(getByText('¿Reemplazar todos los datos?')).toBeTruthy();
    await fireEvent.press(getByTestId('app-dialog-confirm'));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('invokes onCancel when the secondary action is pressed', async () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();

    const { getByTestId } = await render(<DialogHost />);

    await act(async () => {
      showConfirm({ title: '¿Cerrar sesión?', onConfirm, onCancel });
    });

    await fireEvent.press(getByTestId('app-dialog-cancel'));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('lets a handler open a follow-up dialog', async () => {
    const { getByText, getByTestId } = await render(<DialogHost />);

    await act(async () => {
      showConfirm({
        title: '¿Eliminar?',
        onConfirm: () => showMessage({ title: 'No se pudo eliminar', tone: 'danger' }),
      });
    });

    await fireEvent.press(getByTestId('app-dialog-confirm'));

    await waitFor(() => expect(getByText('No se pudo eliminar')).toBeTruthy());
  });
});
