/**
 * Component test for the reusable QuantityStepper: renders the formatted
 * milli-quantity, emits `quantity ± step`, clamps to `min`, and disables the
 * controls when the floor is reached or `disabled` is set. Native modules are
 * mocked so no native code runs.
 */

import { fireEvent, render } from '@testing-library/react-native';

import { QuantityStepper } from '@/components/quantity-stepper';
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

describe('QuantityStepper', () => {
  it('renders the current quantity and increments by one step', async () => {
    const onChange = jest.fn();
    const { getByTestId } = await render(
      <QuantityStepper quantity={1000} onChange={onChange} testIDPrefix="line-0" />,
    );

    expect(getByTestId('line-0-value')).toHaveTextContent('1');

    await fireEvent.press(getByTestId('line-0-increment'));
    expect(onChange).toHaveBeenCalledWith(2000);
  });

  it('decrements by one step', async () => {
    const onChange = jest.fn();
    const { getByTestId } = await render(
      <QuantityStepper quantity={3000} onChange={onChange} testIDPrefix="line-0" />,
    );

    await fireEvent.press(getByTestId('line-0-decrement'));
    expect(onChange).toHaveBeenCalledWith(2000);
  });

  it('disables the decrement control at the minimum', async () => {
    const onChange = jest.fn();
    const { getByTestId } = await render(
      <QuantityStepper quantity={1000} min={1000} onChange={onChange} testIDPrefix="line-0" />,
    );

    expect(getByTestId('line-0-decrement')).toBeDisabled();
    await fireEvent.press(getByTestId('line-0-decrement'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('disables both controls when disabled', async () => {
    const onChange = jest.fn();
    const { getByTestId } = await render(
      <QuantityStepper quantity={2000} disabled onChange={onChange} testIDPrefix="line-0" />,
    );

    expect(getByTestId('line-0-decrement')).toBeDisabled();
    expect(getByTestId('line-0-increment')).toBeDisabled();

    await fireEvent.press(getByTestId('line-0-decrement'));
    await fireEvent.press(getByTestId('line-0-increment'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('clamps decrement to min when a step would go below it', async () => {
    const onChange = jest.fn();
    const { getByTestId } = await render(
      <QuantityStepper
        quantity={1500}
        min={1000}
        step={1000}
        onChange={onChange}
        testIDPrefix="line-0"
      />,
    );

    await fireEvent.press(getByTestId('line-0-decrement'));
    expect(onChange).toHaveBeenCalledWith(1000);
  });
});
