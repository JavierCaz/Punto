/**
 * Component test for the category form: required-name validation, trimming,
 * delete wiring and es/en i18n.
 */

import { fireEvent, render } from '@testing-library/react-native';

import { CategoryForm } from '@/components/category-form';
import type { Category } from '@/db';
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

const category: Category = {
  id: 'cat-1',
  businessId: 'biz-1',
  name: 'Bebidas',
  description: null,
  imageUri: null,
  sortOrder: 0,
  isActive: true,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  archivedAt: null,
};

afterEach(async () => {
  if (i18n.language !== 'es') {
    await i18n.changeLanguage('es');
  }
});

describe('CategoryForm', () => {
  it('blocks save and shows an error when the name is empty', async () => {
    const onSave = jest.fn();
    const { getByText } = await render(
      <CategoryForm initialCategory={null} submitting={false} onSave={onSave} />,
    );

    await fireEvent.press(getByText('Guardar'));

    expect(getByText('Escribe el nombre de la categoría.')).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('saves the trimmed name', async () => {
    const onSave = jest.fn();
    const { getByTestId, getByText } = await render(
      <CategoryForm initialCategory={null} submitting={false} onSave={onSave} />,
    );

    await fireEvent.changeText(getByTestId('category-name'), '  Postres  ');
    await fireEvent.press(getByText('Guardar'));

    expect(onSave).toHaveBeenCalledWith('Postres');
  });

  it('offers delete only when editing', async () => {
    const onDelete = jest.fn();
    const { queryByText, getByText } = await render(
      <CategoryForm
        initialCategory={category}
        submitting={false}
        onSave={jest.fn()}
        onDelete={onDelete}
      />,
    );

    expect(queryByText('Eliminar categoría')).toBeTruthy();
    await fireEvent.press(getByText('Eliminar categoría'));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('renders English copy when the active language is en', async () => {
    await i18n.changeLanguage('en');
    const { getByText } = await render(
      <CategoryForm initialCategory={null} submitting={false} onSave={jest.fn()} />,
    );

    expect(getByText('Save')).toBeTruthy();
  });
});
