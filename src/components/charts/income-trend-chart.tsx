import { StyleSheet, View } from 'react-native';
import { CartesianChart, Line } from 'victory-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { i18n } from '@/i18n';
import { formatMoney } from '@/i18n/format';
import { formatTrendLabel, type TrendGranularity, type TrendPoint } from '@/lib/dashboard';

/** Maximum number of x-axis labels rendered, regardless of bucket count. */
const MAX_LABELS = 7;

export type IncomeTrendChartProps = {
  /** Dense, ordered trend series for the active period. */
  data: TrendPoint[];
  /** Bucket granularity, used to format the labels. */
  granularity: TrendGranularity;
  /** Business currency code for locale-aware money formatting. */
  currency: string;
  /** Chart height in dp. */
  height?: number;
  testID?: string;
};

/**
 * Gross completed-sale income across the selected period, as a line chart
 * (victory-native + Skia). Axis labels are plain text rendered by the parent
 * grid — Skia axis text needs a bundled font — and are thinned to at most
 * `MAX_LABELS` so hourly/daily buckets stay readable.
 */
export function IncomeTrendChart({
  data,
  granularity,
  currency,
  height = 180,
  testID,
}: IncomeTrendChartProps) {
  const theme = useTheme();
  const locale = i18n.language === 'en' ? 'en' : 'es';

  const maxMinor = Math.max(0, ...data.map((point) => point.totalMinor));
  const chartData = data.map((point) => ({ key: point.key, totalMinor: point.totalMinor }));
  const labelStride = Math.max(1, Math.ceil(data.length / MAX_LABELS));

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
        {data.map((point, index) => (
          <ThemedText
            key={point.key}
            type="micro"
            themeColor="textSecondary"
            numberOfLines={1}
            style={styles.label}>
            {index % labelStride === 0 ? formatTrendLabel(point.key, granularity, locale) : ''}
          </ThemedText>
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
  label: {
    flex: 1,
    textAlign: 'center',
  },
});
