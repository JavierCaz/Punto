import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { BusinessProfileEditor } from '@/components/business-profile-editor';
import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/section-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ThemeModeOptions } from '@/components/theme-options';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <Screen scroll header contentContainerStyle={styles.content}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('settings.title'),
          headerBackTitle: t('common.actions.back'),
          headerStyle: { backgroundColor: theme.backgroundElement },
          headerTintColor: theme.text,
          headerTitleStyle: { color: theme.text },
          headerShadowVisible: false,
        }}
      />

      <View style={styles.section}>
        <SectionHeader level="section" title={t('settings.appearance')} />
        <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
          <ThemeModeOptions />
        </ThemedView>
      </View>

      <View style={styles.section}>
        <SectionHeader level="section" title={t('settings.business')} />
        <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
          <BusinessProfileEditor />
        </ThemedView>
      </View>

      <View style={styles.footer}>
        <ThemedText type="micro" themeColor="textSecondary" style={styles.footerText}>
          {t('common.appName')} — {t('settings.aboutLine')}
        </ThemedText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.four,
  },
  section: {
    gap: Spacing.two,
  },
  card: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: Spacing.four,
    paddingHorizontal: Spacing.three,
  },
  footerText: {
    textAlign: 'center',
  },
});
