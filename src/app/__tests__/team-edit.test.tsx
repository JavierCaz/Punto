/**
 * Team edit screen tests — the employee "U" in CRUD. The auth repository and
 * the hash module are mocked; expo-router is stubbed so the route renders with
 * a fixed employee id.
 */

import { fireEvent, render, waitFor } from '@testing-library/react-native';

import EditEmployeeScreen from '@/app/team/[id]';
import { findActiveEmployeeById, updateEmployee } from '@/auth';
import type { PublicEmployee } from '@/auth';
import { i18n } from '@/i18n';

const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  Redirect: () => null,
  Stack: { Screen: () => null },
  router: { back: (...args: unknown[]) => mockBack(...args), push: jest.fn() },
  useLocalSearchParams: () => ({ id: 'emp-2' }),
  useFocusEffect: (callback: () => void) => {
    const { useEffect } = jest.requireActual<typeof import('react')>('react');
    useEffect(callback, [callback]);
  },
}));

jest.mock('@/auth', () => ({
  findActiveEmployeeById: jest.fn(),
  updateEmployee: jest.fn(),
  useAuthStore: (selector: (state: unknown) => unknown) =>
    selector({ user: { id: 'emp-1', firstName: 'Ana', lastName: null, role: 'ADMIN' } }),
}));

jest.mock('@/lib/hash', () => ({ hashSecret: jest.fn(async () => 'hashed') }));

jest.mock('expo-localization', () => ({ getLocales: () => [{ languageCode: 'es' }] }));

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

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const employee = (overrides: Partial<PublicEmployee> = {}): PublicEmployee => ({
  id: 'emp-2',
  businessId: 'biz-1',
  firstName: 'Luis',
  lastName: 'García',
  username: 'luis',
  role: 'EMPLOYEE',
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const mockFind = findActiveEmployeeById as jest.MockedFunction<typeof findActiveEmployeeById>;
const mockUpdate = updateEmployee as jest.MockedFunction<typeof updateEmployee>;

beforeEach(() => {
  jest.clearAllMocks();
  mockFind.mockResolvedValue(employee());
  mockUpdate.mockResolvedValue(employee());
});

afterEach(async () => {
  if (i18n.language !== 'es') {
    await i18n.changeLanguage('es');
  }
});

describe('EditEmployeeScreen', () => {
  it('prefills the employee and saves name/username changes', async () => {
    const { getByTestId, getByText } = await render(<EditEmployeeScreen />);

    await waitFor(() => expect(getByTestId('team-edit-first-name').props.value).toBe('Luis'));
    expect(getByTestId('team-edit-last-name').props.value).toBe('García');
    expect(getByTestId('team-edit-username').props.value).toBe('luis');

    await fireEvent.changeText(getByTestId('team-edit-username'), 'Luis.Garcia');
    await fireEvent.press(getByText('Guardar cambios'));

    await waitFor(() =>
      expect(mockUpdate).toHaveBeenCalledWith('emp-2', {
        firstName: 'Luis',
        lastName: 'García',
        username: 'luis.garcia',
      }),
    );
    expect(mockBack).toHaveBeenCalled();
  });

  it('resets the PIN only when a new one is entered', async () => {
    const { getByTestId, getByText } = await render(<EditEmployeeScreen />);

    await waitFor(() => expect(getByTestId('team-edit-pin')).toBeTruthy());

    await fireEvent.changeText(getByTestId('team-edit-pin'), '1234');
    await fireEvent.changeText(getByTestId('team-edit-confirm-pin'), '1234');
    await fireEvent.press(getByText('Guardar cambios'));

    await waitFor(() =>
      expect(mockUpdate).toHaveBeenCalledWith(
        'emp-2',
        expect.objectContaining({ pinHash: 'hashed' }),
      ),
    );
  });

  it('rejects mismatched PIN confirmation without saving', async () => {
    const { getByTestId, getByText } = await render(<EditEmployeeScreen />);

    await waitFor(() => expect(getByTestId('team-edit-pin')).toBeTruthy());

    await fireEvent.changeText(getByTestId('team-edit-pin'), '1234');
    await fireEvent.changeText(getByTestId('team-edit-confirm-pin'), '9999');
    await fireEvent.press(getByText('Guardar cambios'));

    await waitFor(() => expect(getByText('El PIN debe tener de 4 a 6 dígitos.')).toBeTruthy());
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('hides the PIN fields for an ADMIN account', async () => {
    mockFind.mockResolvedValue(employee({ role: 'ADMIN', username: 'ana' }));

    const { queryByTestId } = await render(<EditEmployeeScreen />);

    await waitFor(() => expect(queryByTestId('team-edit-username')).toBeTruthy());
    expect(queryByTestId('team-edit-pin')).toBeNull();
    expect(queryByTestId('team-edit-confirm-pin')).toBeNull();
  });
});
