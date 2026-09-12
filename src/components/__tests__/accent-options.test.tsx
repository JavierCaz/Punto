/**
 * Component tests for the §7.2 accent picker: renders every accent as a radio,
 * marks the current value, and reports selections. Native modules are stubbed
 * as in ui-primitives.test.tsx.
 */

import { fireEvent, render } from '@testing-library/react-native';

import { AccentOptions } from '@/components/accent-options';
import { ACCENTS } from '@/constants/accents';
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

afterEach(async () => {
  if (i18n.language !== 'es') {
    await i18n.changeLanguage('es');
  }
});

describe('AccentOptions', () => {
  it('renders every accent as an accessible radio', async () => {
    const { getByTestId, getByText } = await render(
      <AccentOptions value="royal" onChange={() => {}} />,
    );

    for (const accent of ACCENTS) {
      const option = getByTestId(`accent-option-${accent}`);
      expect(option.props.accessibilityRole).toBe('radio');
    }
    expect(getByText('Azul')).toBeTruthy();
    expect(getByText('Esmeralda')).toBeTruthy();
    expect(getByText('Índigo')).toBeTruthy();
    expect(getByText('Ámbar')).toBeTruthy();
    expect(getByText('Pizarra')).toBeTruthy();
    expect(getByText('Rosa')).toBeTruthy();
  });

  it('marks only the current value as selected', async () => {
    const { getByTestId } = await render(<AccentOptions value="amber" onChange={() => {}} />);

    expect(getByTestId('accent-option-amber').props.accessibilityState.selected).toBe(true);
    expect(getByTestId('accent-option-rose').props.accessibilityState.selected).toBe(false);
  });

  it('reports the pressed accent', async () => {
    const onChange = jest.fn();
    const { getByTestId } = await render(<AccentOptions value="royal" onChange={onChange} />);

    await fireEvent.press(getByTestId('accent-option-rose'));

    expect(onChange).toHaveBeenCalledWith('rose');
  });
  it('renders English labels when the active language is en', async () => {
    await i18n.changeLanguage('en');

    const { getByText } = await render(<AccentOptions value="royal" onChange={() => {}} />);

    expect(getByText('Royal blue')).toBeTruthy();
    expect(getByText('Emerald')).toBeTruthy();
    expect(getByText('Indigo')).toBeTruthy();
    expect(getByText('Amber')).toBeTruthy();
    expect(getByText('Slate')).toBeTruthy();
    expect(getByText('Rose')).toBeTruthy();
  });
});
