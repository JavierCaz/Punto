import { Stack } from 'expo-router';

import { useTheme } from '@/hooks/use-theme';

/**
 * Layout for the guided setup route group (phase === 'setup'). Each step owns
 * its own chrome via `WizardStep`, so the native header stays hidden.
 */
export default function SetupLayout() {
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

/** Resume the wizard at its first data step when the group is entered directly. */
export const unstable_settings = { initialRouteName: 'suppliers' };
