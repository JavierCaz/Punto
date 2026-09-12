/**
 * Component test for the SelectField dropdown: the trigger shows the selected
 * label (or the clear label / placeholder), opens a bottom-sheet list, and
 * emits the picked value — `null` for the clear option. Native modules are
 * mocked so no native code runs.
 */

import { fireEvent, render } from '@testing-library/react-native';

import { SelectField } from '@/components/select-field';
import { i18n } from '@/i18n';

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'es' }],
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => {
  const mockMaterialCommunityIcons = () => null;
  return { __esModule: true, default: mockMaterialCommunityIcons };
});

const items = [
  { value: 'cat-1', label: 'Bebidas' },
  { value: 'cat-2', label: 'Postres' },
];

afterEach(async () => {
  if (i18n.language !== 'es') {
    await i18n.changeLanguage('es');
  }
});

describe('SelectField', () => {
  it('keeps the list closed until opened, then emits the picked value', async () => {
    const onChange = jest.fn();
    const { getByTestId, getByText, queryByText } = await render(
      <SelectField
        label="Categoría"
        items={items}
        value={null}
        onChange={onChange}
        noneLabel="Sin categoría"
        testIDPrefix="category"
      />,
    );

    expect(getByText('Sin categoría')).toBeTruthy();
    expect(queryByText('Bebidas')).toBeNull();

    await fireEvent.press(getByTestId('category-trigger'));
    expect(getByText('Bebidas')).toBeTruthy();

    await fireEvent.press(getByText('Bebidas'));
    expect(onChange).toHaveBeenCalledWith('cat-1');
  });

  it('emits null when the clear option is picked', async () => {
    const onChange = jest.fn();
    const { getByTestId, getByText } = await render(
      <SelectField
        label="Categoría"
        items={items}
        value="cat-1"
        onChange={onChange}
        noneLabel="Sin categoría"
        testIDPrefix="category"
      />,
    );

    expect(getByText('Bebidas')).toBeTruthy();

    await fireEvent.press(getByTestId('category-trigger'));
    await fireEvent.press(getByText('Sin categoría'));

    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('renders an unlabeled trigger with a placeholder and a generic sheet title', async () => {
    const onChange = jest.fn();
    const { getByTestId, getByText } = await render(
      <SelectField
        items={items}
        value={null}
        onChange={onChange}
        placeholder="Elegir"
        accessibilityLabel="Ingrediente"
        testIDPrefix="recipe-item-0"
      />,
    );

    expect(getByText('Elegir')).toBeTruthy();

    await fireEvent.press(getByTestId('recipe-item-0-trigger'));
    expect(getByText('Seleccionar')).toBeTruthy();

    await fireEvent.press(getByText('Postres'));
    expect(onChange).toHaveBeenCalledWith('cat-2');
  });
});
