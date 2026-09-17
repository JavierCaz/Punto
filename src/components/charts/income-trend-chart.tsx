import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { CartesianChart, Line } from 'victory-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { i18n } from '@/i18n';
import { formatMoney } from '@/i18n/format';
import {
  formatTrendLabel,
  MAX_TREND_AXIS_TICKS,
  trendAxisTicks,
  type DashboardPeriod,
  type TrendAxisTick,
  type TrendPoint,
} from '@/lib/dashboard';

export type IncomeTrendChartProps = {
  /** Dense, ordered trend series for the active period. */
  data: TrendPoint[];
  /** Active window; drives the x-axis unit (hours / weeks / years). */
  period: DashboardPeriod;
  /** Business currency code for locale-aware money formatting. */
  currency: string;
  /** Chart height in dp. */
  height?: number;
  testID?: string;
};

/**
 * Gross completed-sale income across the selected period, as a line chart
 * (victory-native + Skia). Axis labels are plain text rendered by the parent
 * grid — Skia axis text needs a bundled font — and reflect the unit the owner
 * reasons in for the active period: hours for a day, weekdays for a week, weeks
 * for a month, months for a year and years for all time. Each label also shows
 * the total income of the bucket it represents (a whole week, a whole year).
 * The value domain is padded so a peak or a zero baseline never clips against
 * the plot edges.
 */
export function IncomeTrendChart({
  data,
  period,
  currency,
  height = 180,
  testID,
}: IncomeTrendChartProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const locale = i18n.language === 'en' ? 'en' : 'es';

  const maxMinor = Math.max(0, ...data.map((point) => point.totalMinor));
  const chartData = data.map((point) => ({ key: point.key, totalMinor: point.totalMinor }));
  const ticks = trendAxisTicks(data, period, MAX_TREND_AXIS_TICKS);

  const tickLabel = (tick: TrendAxisTick): string => {
    switch (tick.kind) {
      case 'hour':
      case 'day':
      case 'month':
        return formatTrendLabel(tick.key, tick.kind, locale);
      case 'week':
        return t('dashboard.trendWeekLabel', { week: tick.week ?? 0 });
      case 'year':
        return tick.key.slice(0, 4);
    }
  };

  return (
    <View testID={testID} style={styles.container}>
      <ThemedText type="micro" themeColor="textSecondary">
        {formatMoney(maxMinor, currency)}
      </ThemedText>

      <View style={{ height }}>
        <CartesianChart
          data={chartData}
          xKey="key"
          yKeys={['totalMinor']}
          domain={{ y: [0, maxMinor > 0 ? maxMinor : 1] }}
          domainPadding={{ top: 16, bottom: 12 }}
          axisOptions={{ lineColor: theme.border, labelColor: theme.textSecondary }}
          frame={{ lineColor: theme.border }}>
          {({ points }) => (
            <Line
              points={points.totalMinor}
              color={theme.primary}
              strokeWidth={3}
              curveType="monotoneX"
            />
          )}
        </CartesianChart>
      </View>

      <View style={styles.labels}>
        {ticks.map((tick) => (
          <View key={tick.key} style={styles.tick}>
            <ThemedText type="micro" themeColor="textSecondary" numberOfLines={1}>
              {tickLabel(tick)}
            </ThemedText>
            <ThemedText type="code" themeColor="textSecondary" numberOfLines={1}>
              {formatMoney(tick.totalMinor, currency, { trimZeroFraction: true })}
            </ThemedText>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.one,
  },
  tick: {
    flexShrink: 1,
    alignItems: 'center',
  },
});
