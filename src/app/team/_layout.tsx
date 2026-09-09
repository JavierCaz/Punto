import { Stack } from 'expo-router';

import { useTheme } from '@/hooks/use-theme';

/**
 * Team screens (list + add employee) — a small stack reachable from the More
 * tab while signed in as an ADMIN. Root layout declares only `name="team"`;
 * this layout owns index (list) and add (form) with their headers.
 */
export default function TeamLayout() {
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
