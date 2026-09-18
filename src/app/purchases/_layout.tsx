import { Stack } from 'expo-router';

import { useCan } from '@/auth';
import { useTheme } from '@/hooks/use-theme';

/** Purchase screens (history + entry) reachable from the More menu. */
export default function PurchasesLayout() {
  const theme = useTheme();
  const canManage = useCan('operations.manage');

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
