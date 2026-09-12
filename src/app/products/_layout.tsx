import { Stack } from 'expo-router';

import { useTheme } from '@/hooks/use-theme';

/** Products screens (list + edit) reachable from the More menu and the POS. */
export default function ProductsLayout() {
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
