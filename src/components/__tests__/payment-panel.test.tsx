import { fireEvent, render } from '@testing-library/react-native';

import { PaymentPanel } from '@/components/payment-panel';
import type { PaymentMethod } from '@/db';
import { i18n } from '@/i18n';

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

const cash: PaymentMethod = {
  id: 'pm-cash',
  businessId: 'biz-1',
  name: 'Efectivo',
  type: 'CASH',
  isDefault: true,
  isActive: true,
  sortOrder: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const card: PaymentMethod = {
  ...cash,
  id: 'pm-card',
  name: 'Tarjeta',
  type: 'CARD',
  isDefault: false,
  sortOrder: 1,
};

afterEach(async () => {
  if (i18n.language !== 'es') {
    await i18n.changeLanguage('es');
  }
});

describe('PaymentPanel', () => {
  it('adds a method and submits a single payment', async () => {
    const onSubmit = jest.fn();
    const { getByTestId, getByText } = await render(
      <PaymentPanel totalMinor={500} currency="MXN" methods={[cash, card]} onSubmit={onSubmit} />,
    );

    await fireEvent.press(getByText('Agregar método de pago'));
    await fireEvent.press(getByText('Efectivo'));
    await fireEvent.changeText(getByTestId('payment-amount-pm-cash'), '5.00');
    await fireEvent.press(getByText('Confirmar cobro'));

    expect(onSubmit).toHaveBeenCalledWith([{ paymentMethodId: 'pm-cash', amountMinor: 500 }]);
  });

  it('splits the payment across two added methods', async () => {
    const onSubmit = jest.fn();
    const { getByTestId, getByText } = await render(
      <PaymentPanel totalMinor={500} currency="MXN" methods={[cash, card]} onSubmit={onSubmit} />,
    );

    await fireEvent.press(getByText('Agregar método de pago'));
    await fireEvent.press(getByText('Efectivo'));
    await fireEvent.press(getByText('Agregar método de pago'));
    await fireEvent.press(getByText('Tarjeta'));
    await fireEvent.changeText(getByTestId('payment-amount-pm-cash'), '2.00');
    await fireEvent.changeText(getByTestId('payment-amount-pm-card'), '3.00');
    await fireEvent.press(getByText('Confirmar cobro'));

    expect(onSubmit).toHaveBeenCalledWith([
      { paymentMethodId: 'pm-cash', amountMinor: 200 },
      { paymentMethodId: 'pm-card', amountMinor: 300 },
    ]);
  });

  it('computes cash change from the amount tendered', async () => {
    const onSubmit = jest.fn();
    const { getByTestId, getByText } = await render(
      <PaymentPanel totalMinor={500} currency="MXN" methods={[cash]} onSubmit={onSubmit} />,
    );

    await fireEvent.press(getByText('Agregar método de pago'));
    await fireEvent.press(getByText('Efectivo'));
    await fireEvent.changeText(getByTestId('payment-amount-pm-cash'), '10.00');

    expect(getByText('Cambio')).toBeTruthy();
    expect(getByTestId('payment-change-pm-cash')).toHaveTextContent(/5\.00/);

    await fireEvent.press(getByText('Confirmar cobro'));
    expect(onSubmit).toHaveBeenCalledWith([
      { paymentMethodId: 'pm-cash', amountMinor: 500, amountGivenMinor: 1000 },
    ]);
  });

  it('blocks confirmation until the allocations match the total', async () => {
    const onSubmit = jest.fn();
    const { getByTestId, getByText } = await render(
      <PaymentPanel totalMinor={500} currency="MXN" methods={[cash, card]} onSubmit={onSubmit} />,
    );

    await fireEvent.press(getByText('Agregar método de pago'));
    await fireEvent.press(getByText('Efectivo'));
    await fireEvent.changeText(getByTestId('payment-amount-pm-cash'), '2.00');
    await fireEvent.press(getByText('Confirmar cobro'));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(getByText('El monto no coincide con el total.')).toBeTruthy();
  });

  it('treats a cash overpayment as change instead of failing validation', async () => {
    const onSubmit = jest.fn();
    const { getByTestId, getByText } = await render(
      <PaymentPanel totalMinor={160} currency="MXN" methods={[cash]} onSubmit={onSubmit} />,
    );

    await fireEvent.press(getByText('Agregar método de pago'));
    await fireEvent.press(getByText('Efectivo'));
    await fireEvent.changeText(getByTestId('payment-amount-pm-cash'), '5.00');

    expect(getByTestId('payment-change-pm-cash')).toHaveTextContent(/3\.40/);

    await fireEvent.press(getByText('Confirmar cobro'));
    expect(onSubmit).toHaveBeenCalledWith([
      { paymentMethodId: 'pm-cash', amountMinor: 160, amountGivenMinor: 500 },
    ]);
  });

  it('shows the remaining amount when cash does not cover the total', async () => {
    const onSubmit = jest.fn();
    const { getByTestId, getByText } = await render(
      <PaymentPanel totalMinor={500} currency="MXN" methods={[cash]} onSubmit={onSubmit} />,
    );

    await fireEvent.press(getByText('Agregar método de pago'));
    await fireEvent.press(getByText('Efectivo'));
    await fireEvent.changeText(getByTestId('payment-amount-pm-cash'), '3.00');
    await fireEvent.press(getByText('Confirmar cobro'));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(getByText('El monto no coincide con el total.')).toBeTruthy();
  });

  it('hides already-added methods from the add list', async () => {
    const { getByTestId, getByText, queryByTestId } = await render(
      <PaymentPanel totalMinor={500} currency="MXN" methods={[cash, card]} onSubmit={jest.fn()} />,
    );

    await fireEvent.press(getByText('Agregar método de pago'));
    await fireEvent.press(getByText('Efectivo'));

    await fireEvent.press(getByText('Agregar método de pago'));
    expect(queryByTestId('payment-option-pm-cash')).toBeNull();
    expect(getByTestId('payment-option-pm-card')).toBeTruthy();
  });

  it('removes an added method and returns it to the add list', async () => {
    const { getByTestId, getByText, queryByTestId } = await render(
      <PaymentPanel totalMinor={500} currency="MXN" methods={[cash, card]} onSubmit={jest.fn()} />,
    );

    await fireEvent.press(getByText('Agregar método de pago'));
    await fireEvent.press(getByText('Efectivo'));
    expect(getByTestId('payment-method-pm-cash')).toBeTruthy();

    await fireEvent.press(getByTestId('payment-remove-pm-cash'));
    expect(queryByTestId('payment-method-pm-cash')).toBeNull();

    await fireEvent.press(getByText('Agregar método de pago'));
    expect(getByTestId('payment-option-pm-cash')).toBeTruthy();
  });

  it('hides the add button once every method is added', async () => {
    const { getByText, queryByText } = await render(
      <PaymentPanel totalMinor={500} currency="MXN" methods={[cash]} onSubmit={jest.fn()} />,
    );

    await fireEvent.press(getByText('Agregar método de pago'));
    await fireEvent.press(getByText('Efectivo'));

    expect(queryByText('Agregar método de pago')).toBeNull();
    expect(getByText('Ya agregaste todos los métodos de pago.')).toBeTruthy();
  });
});
