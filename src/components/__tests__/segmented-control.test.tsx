/**
 * Component test for the segmented control: selection, onChange and the
 * radiogroup/radio accessibility contract. The theme hooks read the persisted
 * accent/theme stores, which import expo-sqlite's kv-store, so it is mocked to
 * keep this a pure component test.
 */

import { fireEvent, render } from '@testing-library/react-native';

import { SegmentedControl } from '@/components/segmented-control';

jest.mock('expo-sqlite/kv-store', () => ({
  __esModule: true,
  default: {
    getItemAsync: jest.fn(async () => null),
    setItemAsync: jest.fn(async () => {}),
    removeItemAsync: jest.fn(async () => {}),
  },
}));

type StockMode = 'none' | 'direct' | 'recipe';

const options: readonly { value: StockMode; label: string }[] = [
  { value: 'none', label: 'Sin inventario' },
  { value: 'direct', label: 'Un artículo' },
  { value: 'recipe', label: 'Receta' },
];

describe('SegmentedControl', () => {
  it('renders every option as a radio inside a radiogroup', async () => {
    const { getByTestId } = await render(
      <SegmentedControl
        options={options}
        value="none"
        onChange={jest.fn()}
        label="Inventario"
        testIDPrefix="stock-mode"
      />,
    );

    const none = getByTestId('stock-mode-none');
    expect(none.props.accessibilityRole).toBe('radio');
    expect(none.parent?.props.accessibilityRole).toBe('radiogroup');
    expect(getByTestId('stock-mode-direct').props.accessibilityRole).toBe('radio');
    expect(getByTestId('stock-mode-recipe').props.accessibilityRole).toBe('radio');
  });

  it('marks only the active option as selected', async () => {
    const { getByTestId } = await render(
      <SegmentedControl
        options={options}
        value="direct"
        onChange={jest.fn()}
        testIDPrefix="stock-mode"
      />,
    );

    expect(getByTestId('stock-mode-direct').props.accessibilityState).toEqual({ selected: true });
    expect(getByTestId('stock-mode-none').props.accessibilityState).toEqual({ selected: false });
  });

  it('calls onChange with the pressed option value', async () => {
    const onChange = jest.fn();
    const { getByTestId } = await render(
      <SegmentedControl
        options={options}
        value="none"
        onChange={onChange}
        testIDPrefix="stock-mode"
      />,
    );

    await fireEvent.press(getByTestId('stock-mode-recipe'));

    expect(onChange).toHaveBeenCalledWith('recipe');
  });
});
