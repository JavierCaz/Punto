import { Stack } from 'expo-router';

import { useTheme } from '@/hooks/use-theme';

/** Suppliers screens (list + edit) reachable from the More menu. */
export default function SuppliersLayout() {
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
