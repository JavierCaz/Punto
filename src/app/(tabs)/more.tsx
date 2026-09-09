import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, View } from 'react-native';

import { useAuthStore } from '@/auth';
import { ListRow } from '@/components/list-row';
import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/section-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

function fullName(firstName: string, lastName: string | null): string {
  return lastName ? `${firstName} ${lastName}` : firstName;
}

export default function MoreScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);

  const isAdmin = user?.role === 'ADMIN';

  const confirmSignOut = () => {
    Alert.alert(t('auth.confirmSignOutTitle'), t('auth.confirmSignOutMessage'), [
      { text: t('common.actions.cancel'), style: 'cancel' },
      { text: t('common.actions.signOut'), style: 'destructive', onPress: () => signOut() },
    ]);
  };

  return (
    <Screen underWebTabBar>
      <SectionHeader title={t('tabs.more')} />

      {user ? (
        <View style={styles.section}>
          <SectionHeader level="section" title={t('more.account')} />
          <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
            <View style={styles.accountRow}>
              <View style={[styles.avatar, { backgroundColor: theme.backgroundSelected }]}>
                <MaterialCommunityIcons name="account" size={22} color={theme.primary} />
              </View>
              <View style={styles.accountText}>
                <ThemedText type="body1">{fullName(user.firstName, user.lastName)}</ThemedText>
                <ThemedText type="body2" themeColor="textSecondary">
                  {user.role === 'ADMIN' ? t('roles.admin') : t('roles.employee')}
                </ThemedText>
              </View>
            </View>
          </ThemedView>
        </View>
      ) : null}

      {isAdmin ? (
        <View style={styles.section}>
          <SectionHeader level="section" title={t('more.team')} />
          <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
            <ListRow
              icon="account-group-outline"
              title={t('more.team')}
              subtitle={t('more.teamSubtitle')}
              onPress={() => router.push('/team')}
              trailing={<MaterialCommunityIcons name="chevron-right" size={24} color={theme.textSecondary} />}
            />
          </ThemedView>
        </View>
      ) : null}

      <View style={styles.section}>
        <SectionHeader level="section" title={t('settings.entry')} />
        <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
          <ListRow
            icon="cog-outline"
            title={t('settings.entry')}
            subtitle={t('more.settingsSubtitle')}
            onPress={() => router.push('/settings')}
            trailing={<MaterialCommunityIcons name="chevron-right" size={24} color={theme.textSecondary} />}
          />
        </ThemedView>
      </View>

      {user ? (
        <View style={styles.section}>
          <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
          <ListRow
            icon="logout"
            title={t('common.actions.signOut')}
            onPress={confirmSignOut}
            testID="sign-out-row"
          />
          </ThemedView>
        </View>
      ) : null}

      <View style={styles.section}>
        <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
          <ListRow
            icon="information-outline"
            title={t('more.about')}
            trailing={
              <ThemedText type="body2" themeColor="textSecondary">
                {t('common.appName')}
              </ThemedText>
            }
          />
        </ThemedView>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: Spacing.four,
    gap: Spacing.two,
  },
  card: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountText: {
    flex: 1,
    gap: Spacing.half,
  },
});
