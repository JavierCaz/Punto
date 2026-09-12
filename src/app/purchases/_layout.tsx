import { Stack } from 'expo-router';

import { useTheme } from '@/hooks/use-theme';

/** Purchase screens (history + entry) reachable from the More menu. */
export default function PurchasesLayout() {
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
