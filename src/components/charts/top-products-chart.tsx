import { StyleSheet, View } from 'react-native';
import { Bar, CartesianChart } from 'victory-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { TopProduct } from '@/db';

export type TopProductsChartProps = {
  /** Best sellers, already sorted by revenue descending. */
  data: TopProduct[];
  /** Chart height in dp. */
  height?: number;
  testID?: string;
};

/**
 * Best-selling products by revenue as a bar chart (victory-native + Skia).
 * Product names are rendered below as plain text because Skia axis text needs
 * a bundled font; the chart itself stays font-free.
 */
export function TopProductsChart({ data, height = 180, testID }: TopProductsChartProps) {
  const theme = useTheme();

  const chartData = data.map((product) => ({
    name: product.name,
    revenueMinor: product.revenueMinor,
  }));

  return (
    <View testID={testID} style={styles.container}>
      <View style={{ height }}>
        <CartesianChart
          data={chartData}
          xKey="name"
          yKeys={['revenueMinor']}
          domainPadding={{ left: 16, right: 16, top: 12 }}
          axisOptions={{ lineColor: theme.border, labelColor: theme.textSecondary }}
          frame={{ lineColor: theme.border }}>
          {({ points, chartBounds }) => (
            <Bar
              points={points.revenueMinor}
              chartBounds={chartBounds}
              color={theme.primary}
              roundedCorners={{ topLeft: 6, topRight: 6 }}
            />
          )}
        </CartesianChart>
      </View>

      <View style={styles.labels}>
        {data.map((product) => (
          <ThemedText
            key={product.name}
            type="micro"
            themeColor="textSecondary"
            numberOfLines={1}
            style={styles.label}>
            {product.name}
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
