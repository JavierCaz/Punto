import { Stack } from 'expo-router';

import { useTheme } from '@/hooks/use-theme';

/** Categories screens (list + edit) reachable from the More menu. */
export default function CategoriesLayout() {
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
