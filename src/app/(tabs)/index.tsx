import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { StyleSheet, TextInput, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';

import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDate } from '@/i18n/format';

/**
 * POS — the main screen. Answers "charge a customer" (§5.2). With an empty
 * catalog it renders the real layout skeleton: header, search, then an
 * intentional empty state with the primary next action.
 */
export default function PosScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const today = formatDate(new Date().toISOString());

  return (
    <Screen underWebTabBar>
      <View style={styles.header}>
        <ThemedText type="heading1">{t('pos.title')}</ThemedText>
        <ThemedText type="body2" themeColor="textSecondary">
          {today}
        </ThemedText>
      </View>

      <View style={[styles.searchBox, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <MaterialCommunityIcons name="magnify" size={20} color={theme.textSecondary} />
        <TextInput
          editable={false}
          placeholder={t('pos.searchPlaceholder')}
          placeholderTextColor={theme.textSecondary}
          style={[styles.searchInput, { color: theme.text }]}
          accessibilityLabel={t('pos.searchPlaceholder')}
        />
      </View>

      <View style={styles.body}>
        <EmptyState
          icon="shopping-outline"
          title={t('pos.empty.title')}
          message={t('pos.empty.message')}
          actionLabel={t('pos.empty.action')}
          onActionPress={() => {
            // Noop until the catalog CRUD feature lands (AGENTS.md §3.1); the
            // action stays visible so the POS layout reads complete.
          }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.one,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.four,
    paddingHorizontal: Spacing.three,
    minHeight: 48,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.body1.fontSize,
    lineHeight: Typography.body1.lineHeight,
    paddingVertical: 0,
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: Spacing.four,
  },
});
