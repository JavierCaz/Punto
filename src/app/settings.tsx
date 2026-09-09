import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { LanguageOptions } from '@/components/language-options';
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
    <Screen scroll contentContainerStyle={styles.content}>
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
        <SectionHeader level="section" title={t('settings.language')} />
        <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
          <LanguageOptions />
        </ThemedView>
      </View>

      <View style={styles.section}>
        <SectionHeader level="section" title={t('settings.business')} />
        <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
          <View style={styles.noteRow}>
            <MaterialCommunityIcons name="storefront-outline" size={20} color={theme.textSecondary} />
            <ThemedText type="body2" themeColor="textSecondary" style={styles.noteText}>
              {t('settings.businessComingSoon')}
            </ThemedText>
          </View>
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
  noteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
    padding: Spacing.three,
  },
  noteText: {
    flex: 1,
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
