import { Stack } from 'expo-router';

import { useTheme } from '@/hooks/use-theme';

/**
 * Reports screens (monthly cash-flow PDF) — reachable from the More tab for
 * users with `dashboard.finance.view`. Root layout declares only
 * `name="reports"`; this layout owns the report screens.
 */
export default function ReportsLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.background },
      }}
    />
  );
}
