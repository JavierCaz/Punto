/**
 * Pure dashboard aggregation helpers.
 *
 * The dashboard answers "how is my business doing today?" (AGENTS §5.2). All
 * the arithmetic that turns raw ledger rows into the numbers an owner sees is
 * deliberately kept here — free of database access, React and locale state —
 * so it can be unit-tested exhaustively with plain objects.
 *
 * Money is INTEGER minor units and every subtraction/addition is integer math
 * (AGENTS §6). Timestamps are ISO-8601 UTC `TEXT`; a business day is the
 * device-LOCAL calendar day, so ranges are built with dayjs (local) and
 * converted to UTC ISO for the SQL comparison.
 */

import { dayjs, type Dayjs } from '@/lib/dayjs';
import type { TimestampIso } from '@/db/repositories/types';

/** Inclusive `[from, to]` ISO-8601 UTC timestamp range. */
export interface DayRange {
  from: TimestampIso;
  to: TimestampIso;
}

/** Anything dayjs can turn into a date (Date, ISO string, Dayjs, ms epoch). */
export type DateLike = Date | string | number | Dayjs;

/** The local calendar day containing `date`, as an inclusive UTC ISO range. */
export function dayRange(date: DateLike = new Date()): DayRange {
  const day = dayjs(date);
  return {
    from: day.startOf('day').toISOString(),
    to: day.endOf('day').toISOString(),
  };
}

/**
 * The trailing window of `days` LOCAL calendar days ending on `end` (inclusive),
 * as an inclusive UTC ISO range. `trailingDayRange(7)` covers today plus the
 * previous six days, which is the income-trend window.
 */
export function trailingDayRange(days: number, end: DateLike = new Date()): DayRange {
  if (days < 1) {
    throw new Error('trailingDayRange requires days >= 1');
  }
  const last = dayjs(end);
  return {
    from: last.subtract(days - 1, 'day').startOf('day').toISOString(),
    to: last.endOf('day').toISOString(),
  };
}

/** Local calendar-day key (`YYYY-MM-DD`) for an ISO-8601 UTC timestamp. */
export function localDayKey(iso: TimestampIso): string {
  return dayjs(iso).format('YYYY-MM-DD');
}

/** Raw money inputs for a period, all POSITIVE minor units. */
export interface DashboardTotalsInput {
  /** Gross income from COMPLETED sales in the period. */
  salesMinor: number;
  /** Gross value of sales REFUNDED in the period (money back out). */
  refundsMinor: number;
  /** Manual INCOME transactions in the period. */
  otherIncomeMinor: number;
  /** Manual EXPENSE transactions in the period. */
  manualExpenseMinor: number;
  /** COMPLETED supplier purchases in the period (stock bought). */
  purchaseExpenseMinor: number;
}

/** Derived money figures shown on the dashboard. */
export interface DashboardTotals {
  /** Money in: sales + other income. */
  incomeMinor: number;
  /** Money out: refunds + manual expenses + purchases. */
  expenseMinor: number;
  /** Income − expense. May be negative. */
  netMinor: number;
}

/**
 * Combine the period's raw money flows into income, expense and net.
 *
 * Net = (sales + other income) − (refunds + manual expenses + purchases).
 * Supplier purchases are counted here and NOT duplicated as a
 * `financial_transaction` (the finance ledger is for non-sale money only), so
 * a purchase is never subtracted twice.
 */
export function computeDashboardTotals(input: DashboardTotalsInput): DashboardTotals {
  const incomeMinor = input.salesMinor + input.otherIncomeMinor;
  const expenseMinor = input.refundsMinor + input.manualExpenseMinor + input.purchaseExpenseMinor;
  return { incomeMinor, expenseMinor, netMinor: incomeMinor - expenseMinor };
}

/**
 * Selectable reporting window for the dashboard. `day` is today, `week` the
 * current calendar week, `month` the current month, `year` the current year,
 * and `all` every recorded sale.
 */
export type DashboardPeriod = 'day' | 'week' | 'month' | 'year' | 'all';

/** Display order of the period tabs. */
export const DASHBOARD_PERIODS = ['day', 'week', 'month', 'year', 'all'] as const;

/** How the income trend is bucketed for a given period. */
export type TrendGranularity = 'hour' | 'day' | 'month';

/**
 * Inclusive UTC ISO range for a period. `week`/`month`/`year` start at the
 * LOCAL start of the calendar week/month/year and always end at the end of
 * today, so future-dated rows are never counted.
 */
export function periodRange(period: DashboardPeriod, now: DateLike = new Date()): DayRange {
  const end = dayjs(now);
  switch (period) {
    case 'day':
      return { from: end.startOf('day').toISOString(), to: end.endOf('day').toISOString() };
    case 'week':
      return { from: end.startOf('week').toISOString(), to: end.endOf('day').toISOString() };
    case 'month':
      return { from: end.startOf('month').toISOString(), to: end.endOf('day').toISOString() };
    case 'year':
      return { from: end.startOf('year').toISOString(), to: end.endOf('day').toISOString() };
    case 'all':
      // Epoch sentinel: ISO-8601 UTC strings sort lexicographically, so any
      // real `completed_at` is `>=` this value.
      return { from: dayjs(0).toISOString(), to: end.endOf('day').toISOString() };
  }
}

/** Bucket granularity for the income trend of a period. */
export function periodGranularity(period: DashboardPeriod): TrendGranularity {
  switch (period) {
    case 'day':
      return 'hour';
    case 'week':
    case 'month':
      return 'day';
    case 'year':
    case 'all':
      return 'month';
  }
}

/** A COMPLETED sale reduced to what the trend needs. */
export interface CompletedSaleRow {
  completedAt: TimestampIso;
  totalMinor: number;
}

/** One point in the income-trend series. */
export interface TrendPoint {
  /** Stable bucket key: `YYYY-MM-DDTHH` (hour), `YYYY-MM-DD` (day) or `YYYY-MM` (month). */
  key: string;
  /** Gross COMPLETED-sale income for the bucket, minor units. */
  totalMinor: number;
}

/** Bucket key for one sale at the period's granularity. */
function trendKey(iso: TimestampIso, granularity: TrendGranularity): string {
  const value = dayjs(iso);
  if (granularity === 'hour') {
    return value.format('YYYY-MM-DDTHH');
  }
  if (granularity === 'day') {
    return value.format('YYYY-MM-DD');
  }
  return value.format('YYYY-MM');
}

/**
 * Bucket completed sales into a dense, ordered trend for `period` (empty
 * buckets are present with `totalMinor: 0`). Bucketing happens on the DEVICE
 * in local time, so a sale near midnight lands on the right local day.
 */
export function bucketSalesByPeriod(
  rows: readonly CompletedSaleRow[],
  period: DashboardPeriod,
  now: DateLike = new Date(),
): TrendPoint[] {
  const end = dayjs(now);
  const granularity = periodGranularity(period);
  const keys: string[] = [];

  if (period === 'day') {
    const startOfDay = end.startOf('day');
    for (let hour = 0; hour < 24; hour++) {
      keys.push(startOfDay.add(hour, 'hour').format('YYYY-MM-DDTHH'));
    }
  } else if (period === 'week') {
    const start = end.startOf('week');
    for (let offset = 0; offset < 7; offset++) {
      keys.push(start.add(offset, 'day').format('YYYY-MM-DD'));
    }
  } else if (period === 'month') {
    const start = end.startOf('month');
    const daysInMonth = end.daysInMonth();
    for (let offset = 0; offset < daysInMonth; offset++) {
      keys.push(start.add(offset, 'day').format('YYYY-MM-DD'));
    }
  } else if (period === 'year') {
    const start = end.startOf('year');
    for (let month = 0; month < 12; month++) {
      keys.push(start.add(month, 'month').format('YYYY-MM'));
    }
  } else {
    // `all`: span from the first recorded sale's month through the current
    // month. The guard caps a pathological future-dated row.
    let earliest = end;
    for (const row of rows) {
      const value = dayjs(row.completedAt);
      if (value.isBefore(earliest)) {
        earliest = value;
      }
    }
    let cursor = (rows.length > 0 ? earliest : end).startOf('month');
    let guard = 0;
    while (!cursor.isAfter(end, 'month') && guard < 600) {
      keys.push(cursor.format('YYYY-MM'));
      cursor = cursor.add(1, 'month');
      guard++;
    }
  }

  const indexByKey = new Map<string, number>();
  const points: TrendPoint[] = keys.map((key, index) => {
    indexByKey.set(key, index);
    return { key, totalMinor: 0 };
  });

  for (const row of rows) {
    const index = indexByKey.get(trendKey(row.completedAt, granularity));
    if (index !== undefined) {
      points[index].totalMinor += row.totalMinor;
    }
  }

  return points;
}

/** Average ticket (integer minor units) or 0 when there were no sales. */
export function averageTicketMinor(salesMinor: number, salesCount: number): number {
  return salesCount > 0 ? Math.round(salesMinor / salesCount) : 0;
}

/**
 * Localized label for a trend bucket key. Kept here so the chart and tests
 * agree on the exact format: hours (`14`), days (`lun 8` / `Mon 8`) and months
 * (`sep` / `Sep`).
 */
export function formatTrendLabel(
  key: string,
  granularity: TrendGranularity,
  locale: string,
): string {
  if (granularity === 'hour') {
    return dayjs(`${key}:00:00`).locale(locale).format('HH');
  }
  if (granularity === 'day') {
    return dayjs(`${key}T00:00:00`).locale(locale).format('ddd D');
  }
  return dayjs(`${key}-01T00:00:00`).locale(locale).format('MMM');
}

/** Maximum x-axis labels a trend chart shows, regardless of bucket count. */
export const MAX_TREND_AXIS_TICKS = 7;

/** Unit a trend axis tick represents; drives how its label is formatted. */
export type TrendAxisTickKind = 'hour' | 'day' | 'week' | 'month' | 'year';

/** One label rendered under the income-trend chart. */
export interface TrendAxisTick {
  /** Index into the dense trend series the tick anchors to. */
  index: number;
  /** Bucket key the tick anchors to (used for the label and the React key). */
  key: string;
  /** Unit the label represents. */
  kind: TrendAxisTickKind;
  /** 1-based week ordinal for `week` ticks; null for every other kind. */
  week: number | null;
  /** Total income for the bucket this tick represents, in minor units. */
  totalMinor: number;
}

/**
 * Pick the x-axis ticks for a period's trend series. Labels reflect the unit
 * the owner reasons in for that window (AGENTS §5.2): hours for a day, days
 * for a week, weeks for a month, months for a year, and years for all time.
 * Ticks are thinned to at most `maxTicks` so labels never overlap.
 */
export function trendAxisTicks(
  points: readonly TrendPoint[],
  period: DashboardPeriod,
  maxTicks: number = MAX_TREND_AXIS_TICKS,
): TrendAxisTick[] {
  if (points.length === 0 || maxTicks < 1) {
    return [];
  }

  if (period === 'day') {
    return evenlySpacedTicks(points, 'hour', maxTicks);
  }
  if (period === 'week') {
    return evenlySpacedTicks(points, 'day', maxTicks);
  }
  if (period === 'month') {
    // One tick per week block (days 1–7, 8–14, …), summing each block so the
    // label can show the week's total.
    const ticks: TrendAxisTick[] = [];
    for (let index = 0; index < points.length; index += 7) {
      ticks.push({
        index,
        key: points[index].key,
        kind: 'week',
        week: ticks.length + 1,
        totalMinor: sumRange(points, index, index + 7),
      });
    }
    return ticks;
  }
  if (period === 'year') {
    return evenlySpacedTicks(points, 'month', maxTicks);
  }

  // `all`: one tick per year present, even when every sale falls in one year.
  // The owner reads this window in years, so never fall back to month labels.
  // Each tick sums its whole year.
  const yearTicks: TrendAxisTick[] = [];
  let previousYear: string | null = null;
  for (let index = 0; index < points.length; index++) {
    const year = points[index].key.slice(0, 4);
    if (year !== previousYear) {
      yearTicks.push({
        index,
        key: points[index].key,
        kind: 'year',
        week: null,
        totalMinor: 0,
      });
      previousYear = year;
    }
  }
  for (let position = 0; position < yearTicks.length; position++) {
    const end =
      position + 1 < yearTicks.length ? yearTicks[position + 1].index : points.length;
    yearTicks[position].totalMinor = sumRange(points, yearTicks[position].index, end);
  }
  return thinTicks(yearTicks, maxTicks);
}

/** Every `stride`-th point, so at most `maxTicks` labels are shown. */
function evenlySpacedTicks(
  points: readonly TrendPoint[],
  kind: TrendAxisTickKind,
  maxTicks: number,
): TrendAxisTick[] {
  const stride = Math.max(1, Math.ceil(points.length / maxTicks));
  const ticks: TrendAxisTick[] = [];
  for (let index = 0; index < points.length; index += stride) {
    ticks.push({ index, key: points[index].key, kind, week: null, totalMinor: points[index].totalMinor });
  }
  return ticks;
}

/** Thin an already-built tick list down to at most `maxTicks`. */
function thinTicks(ticks: readonly TrendAxisTick[], maxTicks: number): TrendAxisTick[] {
  const stride = Math.max(1, Math.ceil(ticks.length / maxTicks));
  const thinned: TrendAxisTick[] = [];
  for (let index = 0; index < ticks.length; index += stride) {
    thinned.push(ticks[index]);
  }
  return thinned;
}

/** Sum of a half-open range of trend points, for aggregate tick values. */
function sumRange(points: readonly TrendPoint[], from: number, toExclusive: number): number {
  let total = 0;
  for (let index = from; index < toExclusive && index < points.length; index++) {
    total += points[index].totalMinor;
  }
  return total;
}
