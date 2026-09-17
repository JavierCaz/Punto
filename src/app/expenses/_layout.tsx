import { Stack } from 'expo-router';

import { useTheme } from '@/hooks/use-theme';

/** Expense screens (history + entry) reachable from the More menu. */
export default function ExpensesLayout() {
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
