import { Stack } from 'expo-router';

import { useTheme } from '@/hooks/use-theme';

/** Inventory edit route reached from the Inventario tab. */
export default function InventoryLayout() {
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
