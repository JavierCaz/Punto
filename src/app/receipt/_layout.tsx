import { Stack } from 'expo-router';

import { useTheme } from '@/hooks/use-theme';

/**
 * Receipt stack. The root layout presents `receipt` as a modal (deep-linkable
 * via `/receipt/<saleId>`); this layout owns the screen chrome.
 */
export default function ReceiptLayout() {
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
