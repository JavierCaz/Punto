/**
 * @jest-environment node
 *
 * Unit tests for the pure dashboard aggregation helpers (no DB, no React).
 * Date assertions are written relative to dayjs so they stay correct in any
 * device timezone (the app buckets by LOCAL calendar day).
 */

import { dayjs } from '@/lib/dayjs';
import {
  averageTicketMinor,
  bucketSalesByPeriod,
  computeDashboardTotals,
  dayRange,
  formatTrendLabel,
  periodGranularity,
  periodRange,
  trailingDayRange,
  trendAxisTicks,
} from '@/lib/dashboard';

describe('dayRange', () => {
  it('covers the local calendar day containing the reference date', () => {
    const reference = new Date('2026-09-08T14:05:00.000Z');
    const range = dayRange(reference);

    expect(dayjs(range.from).isSame(dayjs(reference).startOf('day'))).toBe(true);
    expect(dayjs(range.to).isSame(dayjs(reference).endOf('day'))).toBe(true);
    // Inclusive, sortable ISO-8601 UTC strings.
    expect(range.from < range.to).toBe(true);
    expect(range.from.endsWith('Z')).toBe(true);
    expect(range.to.endsWith('Z')).toBe(true);
  });
});

describe('trailingDayRange', () => {
  it('spans N local days ending on the reference day (inclusive)', () => {
    const end = new Date('2026-09-08T14:05:00.000Z');
    const range = trailingDayRange(7, end);

    expect(dayjs(range.from).isSame(dayjs(end).subtract(6, 'day').startOf('day'))).toBe(true);
    expect(dayjs(range.to).isSame(dayjs(end).endOf('day'))).toBe(true);
  });

  it('rejects a window shorter than one day', () => {
    expect(() => trailingDayRange(0)).toThrow();
  });
});

describe('periodRange', () => {
  const now = new Date('2026-09-08T14:05:00.000Z');

  it('day covers today only', () => {
    const range = periodRange('day', now);
    expect(dayjs(range.from).isSame(dayjs(now).startOf('day'))).toBe(true);
    expect(dayjs(range.to).isSame(dayjs(now).endOf('day'))).toBe(true);
  });

  it('week starts at the local start of the calendar week and ends today', () => {
    const range = periodRange('week', now);
    expect(dayjs(range.from).isSame(dayjs(now).startOf('week'))).toBe(true);
    expect(dayjs(range.to).isSame(dayjs(now).endOf('day'))).toBe(true);
  });

  it('month/year start at the local month/year boundaries', () => {
    expect(dayjs(periodRange('month', now).from).isSame(dayjs(now).startOf('month'))).toBe(true);
    expect(dayjs(periodRange('year', now).from).isSame(dayjs(now).startOf('year'))).toBe(true);
  });

  it('all starts at the epoch sentinel and ends today', () => {
    const range = periodRange('all', now);
    expect(range.from).toBe(dayjs(0).toISOString());
    expect(dayjs(range.to).isSame(dayjs(now).endOf('day'))).toBe(true);
  });
});

describe('periodGranularity', () => {
  it('maps periods to hour/day/month buckets', () => {
    expect(periodGranularity('day')).toBe('hour');
    expect(periodGranularity('week')).toBe('day');
    expect(periodGranularity('month')).toBe('day');
    expect(periodGranularity('year')).toBe('month');
    expect(periodGranularity('all')).toBe('month');
  });
});

describe('computeDashboardTotals', () => {
  it('nets income against refunds, manual expenses and purchases', () => {
    const totals = computeDashboardTotals({
      salesMinor: 500000,
      refundsMinor: 50000,
      otherIncomeMinor: 20000,
      manualExpenseMinor: 30000,
      purchaseExpenseMinor: 120000,
    });

    expect(totals.incomeMinor).toBe(520000);
    expect(totals.expenseMinor).toBe(200000);
    expect(totals.netMinor).toBe(320000);
  });

  it('produces a negative net when expenses exceed income', () => {
    const totals = computeDashboardTotals({
      salesMinor: 10000,
      refundsMinor: 0,
      otherIncomeMinor: 0,
      manualExpenseMinor: 0,
      purchaseExpenseMinor: 500000,
    });

    expect(totals.netMinor).toBe(-490000);
  });

  it('is zero for a period with no activity', () => {
    const totals = computeDashboardTotals({
      salesMinor: 0,
      refundsMinor: 0,
      otherIncomeMinor: 0,
      manualExpenseMinor: 0,
      purchaseExpenseMinor: 0,
    });

    expect(totals).toEqual({ incomeMinor: 0, expenseMinor: 0, netMinor: 0 });
  });
});

describe('bucketSalesByPeriod', () => {
  const now = new Date('2026-09-08T14:05:00.000Z');

  it('buckets a day into 24 hourly points and sums matching hours', () => {
    const points = bucketSalesByPeriod(
      [
        { completedAt: dayjs(now).hour(9).minute(10).toISOString(), totalMinor: 1000 },
        { completedAt: dayjs(now).hour(9).minute(40).toISOString(), totalMinor: 500 },
        { completedAt: dayjs(now).hour(14).toISOString(), totalMinor: 4000 },
      ],
      'day',
      now,
    );

    expect(points).toHaveLength(24);
    expect(points[0].key).toBe(dayjs(now).startOf('day').format('YYYY-MM-DDTHH'));
    expect(points[9].totalMinor).toBe(1500);
    expect(points[14].totalMinor).toBe(4000);
    expect(points[0].totalMinor).toBe(0);
  });

  it('buckets a week into 7 daily points', () => {
    const points = bucketSalesByPeriod(
      [
        { completedAt: dayjs(now).startOf('week').hour(10).toISOString(), totalMinor: 700 },
        { completedAt: dayjs(now).toISOString(), totalMinor: 300 },
      ],
      'week',
      now,
    );

    const todayIndex = dayjs(now).diff(dayjs(now).startOf('week'), 'day');
    expect(points).toHaveLength(7);
    expect(points[0].key).toBe(dayjs(now).startOf('week').format('YYYY-MM-DD'));
    expect(points[0].totalMinor).toBe(700);
    expect(points[todayIndex].totalMinor).toBe(300);
  });

  it('buckets a month into one point per day and a year into 12 months', () => {
    const monthPoints = bucketSalesByPeriod([], 'month', now);
    expect(monthPoints).toHaveLength(dayjs(now).daysInMonth());

    const yearPoints = bucketSalesByPeriod([], 'year', now);
    expect(yearPoints).toHaveLength(12);
    expect(yearPoints[0].key).toBe(dayjs(now).startOf('year').format('YYYY-MM'));
  });

  it('spans every recorded month for `all` and ignores rows outside the period', () => {
    const allPoints = bucketSalesByPeriod(
      [
        { completedAt: dayjs(now).subtract(2, 'month').toISOString(), totalMinor: 100 },
        { completedAt: dayjs(now).toISOString(), totalMinor: 200 },
      ],
      'all',
      now,
    );
    expect(allPoints).toHaveLength(3);
    expect(allPoints[0].key).toBe(dayjs(now).subtract(2, 'month').format('YYYY-MM'));
    expect(allPoints[2].totalMinor).toBe(200);

    const dayPoints = bucketSalesByPeriod(
      [{ completedAt: dayjs(now).subtract(3, 'day').toISOString(), totalMinor: 9999 }],
      'day',
      now,
    );
    expect(dayPoints.reduce((total, point) => total + point.totalMinor, 0)).toBe(0);
  });
});

describe('averageTicketMinor', () => {
  it('rounds the average to the nearest minor unit', () => {
    expect(averageTicketMinor(1000, 3)).toBe(333);
    expect(averageTicketMinor(1000, 8)).toBe(125);
  });

  it('returns 0 when there were no sales', () => {
    expect(averageTicketMinor(0, 0)).toBe(0);
  });
});

describe('formatTrendLabel', () => {
  it('formats hour, day and month buckets in es and en', () => {
    expect(formatTrendLabel('2026-09-08T14', 'hour', 'es')).toBe('14');
    expect(formatTrendLabel('2026-09-08', 'day', 'es')).toContain('mar');
    expect(formatTrendLabel('2026-09-08', 'day', 'en')).toContain('Tue');
    expect(formatTrendLabel('2026-09', 'month', 'es')).toContain('sep');
    expect(formatTrendLabel('2026-09', 'month', 'en')).toContain('Sep');
  });
});

describe('trendAxisTicks', () => {
  const hourlyDay = Array.from({ length: 24 }, (_, hour) => ({
    key: `2026-09-08T${String(hour).padStart(2, '0')}`,
    totalMinor: hour === 12 ? 5000 : 0,
  }));
  const dailyMonth = Array.from({ length: 31 }, (_, day) => ({
    key: `2026-09-${String(day + 1).padStart(2, '0')}`,
    totalMinor: 1000,
  }));

  it('shows hour ticks for a day, thinned to at most 7', () => {
    const ticks = trendAxisTicks(hourlyDay, 'day');
    expect(ticks.length).toBeLessThanOrEqual(7);
    expect(ticks.every((tick) => tick.kind === 'hour')).toBe(true);
    expect(ticks[0]).toMatchObject({ index: 0, key: '2026-09-08T00' });
    expect(ticks.find((tick) => tick.index === 12)?.totalMinor).toBe(5000);
    // Every tick anchors to a real point so the label lines up with the curve.
    expect(ticks.every((tick) => hourlyDay[tick.index].key === tick.key)).toBe(true);
  });

  it('shows one tick per week block for a month', () => {
    const ticks = trendAxisTicks(dailyMonth, 'month');
    expect(ticks.map((tick) => tick.index)).toEqual([0, 7, 14, 21, 28]);
    expect(ticks.map((tick) => tick.week)).toEqual([1, 2, 3, 4, 5]);
    expect(ticks.every((tick) => tick.kind === 'week')).toBe(true);
    expect(ticks.map((tick) => tick.totalMinor)).toEqual([7000, 7000, 7000, 7000, 3000]);
  });

  it('shows every weekday for a week and month ticks for a year', () => {
    const week = Array.from({ length: 7 }, (_, day) => ({
      key: `2026-09-${String(day + 8).padStart(2, '0')}`,
      totalMinor: 0,
    }));
    expect(trendAxisTicks(week, 'week').map((tick) => tick.kind)).toEqual(Array(7).fill('day'));

    const year = Array.from({ length: 12 }, (_, month) => ({
      key: `2026-${String(month + 1).padStart(2, '0')}`,
      totalMinor: 0,
    }));
    const yearTicks = trendAxisTicks(year, 'year');
    expect(yearTicks.length).toBeLessThanOrEqual(7);
    expect(yearTicks.every((tick) => tick.kind === 'month')).toBe(true);
  });

  it('labels all time by year and sums each year', () => {
    const monthly = [
      { key: '2024-11', totalMinor: 100 },
      { key: '2024-12', totalMinor: 200 },
      { key: '2025-01', totalMinor: 300 },
      { key: '2025-02', totalMinor: 400 },
      { key: '2026-01', totalMinor: 500 },
    ];
    const ticks = trendAxisTicks(monthly, 'all');
    expect(ticks.map((tick) => tick.key)).toEqual(['2024-11', '2025-01', '2026-01']);
    expect(ticks.map((tick) => tick.totalMinor)).toEqual([300, 700, 500]);
    expect(ticks.every((tick) => tick.kind === 'year')).toBe(true);
  });

  it('still labels all time by year when it fits in a single year', () => {
    const monthly = [
      { key: '2026-07', totalMinor: 0 },
      { key: '2026-08', totalMinor: 0 },
      { key: '2026-09', totalMinor: 0 },
    ];
    const ticks = trendAxisTicks(monthly, 'all');
    expect(ticks).toEqual([{ index: 0, key: '2026-07', kind: 'year', week: null, totalMinor: 0 }]);
  });

  it('returns no ticks for an empty series', () => {
    expect(trendAxisTicks([], 'day')).toEqual([]);
  });
});
