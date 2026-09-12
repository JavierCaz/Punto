/**
 * Component test for the supplier form: required-name validation, trimmed
 * save payload and es/en i18n. Native modules are mocked so no native code runs.
 */

import { fireEvent, render } from '@testing-library/react-native';

import { SupplierForm } from '@/components/supplier-form';
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

function renderForm(onSave = jest.fn()) {
  return render(
    <SupplierForm initialSupplier={null} submitting={false} onSave={onSave} />,
  );
}

afterEach(async () => {
  if (i18n.language !== 'es') {
    await i18n.changeLanguage('es');
  }
});

describe('SupplierForm', () => {
  it('blocks save and shows the name error when the name is empty', async () => {
    const onSave = jest.fn();
    const { getByText } = await renderForm(onSave);

    await fireEvent.press(getByText('Guardar'));

    expect(getByText('Escribe el nombre del proveedor.')).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('saves trimmed values when the form is valid', async () => {
    const onSave = jest.fn();
    const { getByText, getByTestId } = await renderForm(onSave);

    await fireEvent.changeText(getByTestId('supplier-name'), '  Proveedor Uno  ');
    await fireEvent.changeText(getByTestId('supplier-phone'), '  555-1234  ');
    await fireEvent.press(getByText('Guardar'));

    expect(onSave).toHaveBeenCalledWith({
      name: 'Proveedor Uno',
      businessName: '',
      phone: '555-1234',
      email: '',
      taxId: '',
      notes: '',
    });
  });

  it('renders English copy when the active language is en', async () => {
    await i18n.changeLanguage('en');
    const { getByText } = await renderForm();

    expect(getByText('Save')).toBeTruthy();
    expect(getByText('Name')).toBeTruthy();
  });
});
