import { Stack } from 'expo-router';

import { useCan } from '@/auth';
import { useTheme } from '@/hooks/use-theme';

/** Products screens (list + edit) reachable from the More menu and the POS. */
export default function ProductsLayout() {
  const theme = useTheme();
  const canManage = useCan('catalog.manage');

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.background },
      }}>
      <Stack.Screen name="index" />
      <Stack.Protected guard={canManage}>
        <Stack.Screen name="edit" />
      </Stack.Protected>
    </Stack>
  );
}
