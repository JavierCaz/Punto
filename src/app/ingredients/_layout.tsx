import { Stack } from 'expo-router';

import { useTheme } from '@/hooks/use-theme';

/** Ingredients screens (management list + edit) reachable from the More menu. */
export default function IngredientsLayout() {
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
