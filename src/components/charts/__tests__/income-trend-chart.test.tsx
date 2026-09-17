/**
 * Component test for IncomeTrendChart. The x-axis is a plain-text row (Skia
 * axis text needs a bundled font), so this asserts the row shows the unit the
 * owner reasons in for the active period — hours for a day, weeks for a month,
 * years for all time — and that the value domain is padded so the curve is not
 * clipped against the plot edges. victory-native renders through Skia (native),
 * so it is mocked.
 */

import { render } from '@testing-library/react-native';

import { IncomeTrendChart } from '@/components/charts/income-trend-chart';
import { i18n } from '@/i18n';
import { formatMoney } from '@/i18n/format';
import type { TrendPoint } from '@/lib/dashboard';

let mockCartesianProps: { domainPadding?: unknown } = {};

jest.mock('victory-native', () => ({
  CartesianChart: (props: { children: (args: unknown) => unknown; domainPadding?: unknown }) => {
    mockCartesianProps = props;
    return props.children({ points: { totalMinor: [] }, chartBounds: {} });
  },
  Line: () => null,
}));

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

const hourlyDay: TrendPoint[] = Array.from({ length: 24 }, (_, hour) => ({
  key: `2026-09-08T${String(hour).padStart(2, '0')}`,
  totalMinor: hour === 12 ? 5000 : 0,
}));

const dailyMonth: TrendPoint[] = Array.from({ length: 31 }, (_, day) => ({
  key: `2026-09-${String(day + 1).padStart(2, '0')}`,
  totalMinor: (day + 1) * 100,
}));

const monthlyYears: TrendPoint[] = [
  { key: '2024-11', totalMinor: 0 },
  { key: '2024-12', totalMinor: 0 },
  { key: '2025-01', totalMinor: 0 },
  { key: '2026-01', totalMinor: 0 },
];

afterEach(async () => {
  if (i18n.language !== 'es') {
    await i18n.changeLanguage('es');
  }
});

describe('IncomeTrendChart', () => {
  it('pads the value domain so the curve is never clipped', async () => {
    await render(<IncomeTrendChart data={hourlyDay} period="day" currency="MXN" />);

    expect(mockCartesianProps.domainPadding).toEqual({ top: 16, bottom: 12 });
  });

  it('labels a day with hours of the day', async () => {
    const { getByText } = await render(
      <IncomeTrendChart data={hourlyDay} period="day" currency="MXN" />,
    );

    expect(getByText('00')).toBeTruthy();
    expect(getByText('12')).toBeTruthy();
    expect(getByText('20')).toBeTruthy();
    expect(getByText(formatMoney(5000, 'MXN', { trimZeroFraction: true }))).toBeTruthy();
  });

  it('labels a month with its weeks', async () => {
    const { getByText } = await render(
      <IncomeTrendChart data={dailyMonth} period="month" currency="MXN" />,
    );

    expect(getByText('Sem 1')).toBeTruthy();
    expect(getByText('Sem 5')).toBeTruthy();
    // The week label shows the whole week's total, not just its first day.
    expect(getByText(formatMoney(2800, 'MXN', { trimZeroFraction: true }))).toBeTruthy();
  });

  it('labels all time with years', async () => {
    const { getByText } = await render(
      <IncomeTrendChart data={monthlyYears} period="all" currency="MXN" />,
    );

    expect(getByText('2024')).toBeTruthy();
    expect(getByText('2025')).toBeTruthy();
    expect(getByText('2026')).toBeTruthy();
  });

  it('labels all time by year even when every sale is in one year', async () => {
    const singleYear: TrendPoint[] = [
      { key: '2026-07', totalMinor: 0 },
      { key: '2026-08', totalMinor: 0 },
      { key: '2026-09', totalMinor: 1000 },
    ];
    const { getByText, queryByText } = await render(
      <IncomeTrendChart data={singleYear} period="all" currency="MXN" />,
    );

    expect(getByText('2026')).toBeTruthy();
    expect(queryByText('Sep')).toBeNull();
  });


  it('localizes the week labels in English', async () => {
    await i18n.changeLanguage('en');
    const { getByText } = await render(
      <IncomeTrendChart data={dailyMonth} period="month" currency="MXN" />,
    );

    expect(getByText('Wk 1')).toBeTruthy();
  });
});
