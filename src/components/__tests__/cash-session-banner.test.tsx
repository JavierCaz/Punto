/**
 * Component tests for the POS cash-session banner: it renders nothing for a
 * business that has never used the feature, shows a dismissible open prompt once
 * history exists, and shows the active session with a close action. Native
 * modules are mocked (theme store reads kv-store; icons are stubbed).
 */

import { fireEvent, render } from '@testing-library/react-native';

import { CashSessionBanner } from '@/components/cash-session-banner';
import { i18n } from '@/i18n';
import type { CashSession } from '@/cash-session';

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
  const MockIcon = () => null;
  return { __esModule: true, default: MockIcon };
});

const openSession: CashSession = {
  id: 'session-1',
  businessId: 'biz-1',
  status: 'OPEN',
  openingAmountMinor: 50000,
  countedAmountMinor: null,
  expectedAmountMinor: null,
  differenceMinor: null,
  openedByEmployeeId: 'emp-1',
  closedByEmployeeId: null,
  openedAt: new Date().toISOString(),
  closedAt: null,
  openingNotes: null,
  closingNotes: null,
};

afterEach(async () => {
  if (i18n.language !== 'es') {
    await i18n.changeLanguage('es');
  }
});

describe('CashSessionBanner', () => {
  it('renders nothing when the business has never used sessions and none is open', async () => {
    const { queryByTestId } = await render(
      <CashSessionBanner
        activeSession={null}
        hasHistory={false}
        dismissed={false}
        onOpen={jest.fn()}
        onClose={jest.fn()}
        onDismiss={jest.fn()}
      />,
    );

    expect(queryByTestId('cash-session-open-banner')).toBeNull();
    expect(queryByTestId('cash-session-active-banner')).toBeNull();
  });

  it('renders the open prompt when history exists but no session is open', async () => {
    const onOpen = jest.fn();
    const onDismiss = jest.fn();
    const { getByTestId } = await render(
      <CashSessionBanner
        activeSession={null}
        hasHistory
        dismissed={false}
        onOpen={onOpen}
        onClose={jest.fn()}
        onDismiss={onDismiss}
      />,
    );

    expect(getByTestId('cash-session-open-banner')).toBeTruthy();

    await fireEvent.press(getByTestId('cash-session-open-action'));
    expect(onOpen).toHaveBeenCalled();

    await fireEvent.press(getByTestId('cash-session-open-dismiss'));
    expect(onDismiss).toHaveBeenCalled();
  });

  it('hides the open prompt once dismissed', async () => {
    const { queryByTestId } = await render(
      <CashSessionBanner
        activeSession={null}
        hasHistory
        dismissed
        onOpen={jest.fn()}
        onClose={jest.fn()}
        onDismiss={jest.fn()}
      />,
    );

    expect(queryByTestId('cash-session-open-banner')).toBeNull();
  });

  it('renders the active banner and fires the close action on press', async () => {
    const onClose = jest.fn();
    const { getByTestId } = await render(
      <CashSessionBanner
        activeSession={openSession}
        hasHistory
        dismissed
        onOpen={jest.fn()}
        onClose={onClose}
        onDismiss={jest.fn()}
      />,
    );

    expect(getByTestId('cash-session-active-banner')).toBeTruthy();

    await fireEvent.press(getByTestId('cash-session-active-banner'));
    expect(onClose).toHaveBeenCalled();
  });
});
