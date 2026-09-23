import { Stack } from 'expo-router';

import { useTheme } from '@/hooks/use-theme';

/**
 * Cash session screens (history + close + detail) — reachable from the More tab
 * and the POS banner. Root layout declares only `name="cash-session"`; this
 * layout owns index (history), close (reconciliation) and [id] (detail).
 */
export default function CashSessionLayout() {
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
