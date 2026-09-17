import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

// Side-effects initialised before any screen renders:
//  - i18n + dayjs locale (the named import below also runs these)
//  - web font CSS variables (--font-display / --font-mono, …)
import '@/global.css';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { useAuthStore } from '@/auth';
import { getBusinessProfile, getDb } from '@/db';
import { DialogHost } from '@/dialog';
import { useDbBootstrap } from '@/hooks/use-db-bootstrap';
import { useEffectiveColorScheme, useTheme } from '@/hooks/use-theme';
import { i18n, setLanguage } from '@/i18n'; // also initialises i18n + dayjs locale
import { useLanguageStore } from '@/i18n/language-store';
import { useAccentStore } from '@/theme/accent-store';
import { useThemeStore } from '@/theme/theme-store';

SplashScreen.preventAutoHideAsync();

/**
 * Root layout — providers + auth-gated navigator.
 *
 * The router is mounted once, after every store has hydrated, with its three
 * Stack.Protected guard groups already carrying their final values (SDK-57
 * auth pattern, docs.expo.dev/router/advanced/authentication/):
 * - no business yet      → onboarding (first-run wizard)
 * - business, no session → login
 * - session active       → (tabs) + settings + team
 *
 * Guards derive from a single `authPhase` resolved during auth hydrate, so
 * they never flip between first mount and first paint (no redirect-on-first-
 * frame). Sign-in / onboarding completion flips the phase, evicting the
 * now-protected screen automatically; screens call `router.replace('/')` for a
 * deterministic forward jump.
 */
export default function RootLayout() {
  const { status, error } = useDbBootstrap();
  const hasThemeHydrated = useThemeStore((state) => state.hasHydrated);
  const hasAccentHydrated = useAccentStore((state) => state.hasHydrated);
  const authPhase = useAuthStore((state) => state.phase);
  const authHydrated = useAuthStore((state) => state.hasHydrated);
  const [hasLanguageHydrated, setHasLanguageHydrated] = useState(false);
  const scheme = useEffectiveColorScheme();
  const theme = useTheme();

  // Load persisted preferences + the auth session once at startup. Store
  // updates happen inside async callbacks (never synchronously in the effect).
  useEffect(() => {
    let cancelled = false;

    async function hydrateStores() {
      // expo-sqlite's web worker does not guard its VFS initialization against
      // concurrent database opens. Open the app database first so the kv-store
      // (a second database, opened by the hydrations below) cannot race it and
      // corrupt the OPFS access-handle pool setup.
      try {
        await getDb();
      } catch {
        // useDbBootstrap surfaces DB failures; skip preference hydration.
        return;
      }
      await Promise.all([
        useThemeStore.getState().hydrate(),
        useAccentStore.getState().hydrate(getBusinessProfile),
        useLanguageStore.getState().hydrate(),
        useAuthStore.getState().hydrate(),
      ]);
      if (cancelled) {
        return;
      }
      const { language, hasPersisted } = useLanguageStore.getState();
      if (hasPersisted && i18n.language !== language) {
        await setLanguage(language);
      }
      setHasLanguageHydrated(true);
    }

    void hydrateStores();
    return () => {
      cancelled = true;
    };
  }, []);

  // Hold the native splash until the database (schema + migrations), the auth
  // phase and persisted preferences are all resolved, so first-paint screens
  // never observe a half-initialized database or a half-resolved auth phase.
  useEffect(() => {
    if (status !== 'loading' && authPhase !== 'loading' && hasLanguageHydrated) {
      SplashScreen.hideAsync();
    }
  }, [status, authPhase, hasLanguageHydrated]);

  // Startup failure is fatal for an offline-first app: without SQLite nothing
  // can render meaningfully. Surface it instead of rendering an empty UI.
  if (status === 'error') {
    throw error;
  }

  const baseNavigationTheme = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...baseNavigationTheme,
    colors: {
      ...baseNavigationTheme.colors,
      primary: theme.primary,
      background: theme.background,
      card: theme.backgroundElement,
      text: theme.text,
      border: theme.border,
      notification: theme.danger,
    },
  };

  // Content is gated on every store having hydrated so persisted overrides and
  // the auth phase never flash against defaults while resolving.
  const canRender =
    status === 'ready' &&
    authHydrated &&
    hasThemeHydrated &&
    hasAccentHydrated &&
    hasLanguageHydrated;

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ThemeProvider value={navigationTheme}>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        <AnimatedSplashOverlay />
        {canRender ? (
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: theme.background },
            }}>
            <Stack.Protected guard={authPhase === 'onboarding'}>
              <Stack.Screen name="onboarding" />
            </Stack.Protected>

            <Stack.Protected guard={authPhase === 'login'}>
              <Stack.Screen name="login" />
            </Stack.Protected>

            <Stack.Protected guard={authPhase === 'ready'}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="settings" />
              <Stack.Screen name="backup" />
              <Stack.Screen name="team" />
              <Stack.Screen name="products" />
              <Stack.Screen name="categories" />
              <Stack.Screen name="ingredients" />
              <Stack.Screen name="inventory" />
              <Stack.Screen name="suppliers" />
              <Stack.Screen name="purchases" />
              <Stack.Screen name="expenses" />
              <Stack.Screen name="receipt" options={{ presentation: 'modal' }} />
            </Stack.Protected>
          </Stack>
        ) : null}
        <DialogHost />
      </ThemeProvider>
    </View>
  );
}
