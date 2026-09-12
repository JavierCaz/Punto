import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Redirect, Stack, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import {
  archiveEmployee,
  listActiveEmployees,
  useAuthStore,
  type AuthEmployee,
  type AuthRole,
  type PublicEmployee,
} from '@/auth';
import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/screen';
import { SecondaryButton } from '@/components/secondary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

import { Radius, Spacing, TouchTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

function RoleBadge({ role, label }: { role: AuthRole; label: string }) {
  const theme = useTheme();
  const isAdmin = role === 'ADMIN';

  return (
    <View
      style={[
        styles.badge,
        isAdmin
          ? { backgroundColor: theme.backgroundSelected }
          : {
              backgroundColor: theme.backgroundElement,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: theme.border,
            },
      ]}>
      <ThemedText type="micro" themeColor={isAdmin ? 'primary' : 'textSecondary'}>
        {label}
      </ThemedText>
    </View>
  );
}

export default function TeamScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === 'ADMIN';

  const [employees, setEmployees] = useState<PublicEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [archivingId, setArchivingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoadFailed(false);
      setLoading(true);
      setEmployees(await listActiveEmployees());
    } catch {
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!isAdmin) {
        return;
      }
      void load();
    }, [isAdmin, load]),
  );

  if (!isAdmin) {
    return <Redirect href="/" />;
  }

  const fullName = (employee: Pick<AuthEmployee, 'firstName' | 'lastName'>): string => {
    const names = [employee.firstName, employee.lastName?.trim()].filter(
      (part): part is string => part != null && part.length > 0,
    );
    return names.join(' ');
  };

  const archive = async (target: PublicEmployee) => {
    if (!user) {
      return;
    }
    setArchivingId(target.id);
    try {
      await archiveEmployee(user.id, target.id);
      await load();
    } catch (err) {
      const reason =
        err instanceof Error && err.message === 'AUTH_LAST_ADMIN'
          ? t('auth.archiveBlockedLastAdmin')
          : err instanceof Error && err.message === 'AUTH_CANNOT_ARCHIVE_SELF'
            ? t('auth.archiveBlockedSelf')
            : t('common.status.error');
      Alert.alert(t('common.status.error'), reason);
    } finally {
      setArchivingId(null);
    }
  };

  const confirmArchive = (target: PublicEmployee) => {
    const name = fullName(target);
    Alert.alert(
      t('auth.archiveConfirmTitle', { name }),
      t('auth.archiveConfirmMessage', { name }),
      [
        { text: t('common.actions.cancel'), style: 'cancel' },
        {
          text: t('common.actions.confirm'),
          style: 'destructive',
          onPress: () => void archive(target),
        },
      ],
    );
  };

  const renderHeaderAdd = () => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('team.add')}
      hitSlop={Spacing.two}
      onPress={() => router.push('/team/add')}
      style={({ pressed }) => [styles.headerAction, pressed && styles.headerActionPressed]}>
      <MaterialCommunityIcons name="account-plus-outline" size={24} color={theme.text} />
    </Pressable>
  );

  return (
    <Screen header>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('team.title'),
          headerBackTitle: t('common.actions.back'),
          headerStyle: { backgroundColor: theme.backgroundElement },
          headerTintColor: theme.text,
          headerTitleStyle: { color: theme.text },
          headerShadowVisible: false,
          headerRight: renderHeaderAdd,
        }}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading && employees.length > 0}
            onRefresh={() => void load()}
            tintColor={theme.primary}
            colors={[theme.primary]}
            progressBackgroundColor={theme.backgroundElement}
          />
        }>
        <ThemedText type="body2" themeColor="textSecondary">
          {t('team.subtitle')}
        </ThemedText>

        {loading && employees.length === 0 ? (
          <View style={styles.state}>
            <ActivityIndicator color={theme.primary} />
            <ThemedText type="body2" themeColor="textSecondary">
              {t('common.status.loading')}
            </ThemedText>
          </View>
        ) : loadFailed && employees.length === 0 ? (
          <View style={styles.state}>
            <ThemedText type="body1">{t('common.status.error')}</ThemedText>
            <SecondaryButton
              label={t('common.actions.retry')}
              icon="refresh"
              onPress={() => void load()}
            />
          </View>
        ) : employees.length === 0 ? (
          <EmptyState
            icon="account-multiple-outline"
            title={t('team.emptyTitle')}
            message={t('team.emptyMessage')}
          />
        ) : (
          <ThemedView
            type="backgroundElement"
            style={[styles.card, { borderColor: theme.border }]}>
            {employees.map((employee, index) => {
              const isSelf = employee.id === user?.id;
              const canArchive = employee.role === 'EMPLOYEE' && !isSelf;
              const isArchiving = archivingId === employee.id;

              return (
                <View key={employee.id}>
                  {index > 0 ? (
                    <View style={[styles.divider, { backgroundColor: theme.border }]} />
                  ) : null}
                  <View style={styles.row}>
                    <View style={[styles.avatarTile, { backgroundColor: theme.backgroundSelected }]}>
                      <MaterialCommunityIcons name="account" size={22} color={theme.primary} />
                    </View>

                    <View style={styles.rowTitles}>
                      <View style={styles.nameRow}>
                        <ThemedText type="body1" numberOfLines={1} style={styles.name}>
                          {fullName(employee)}
                        </ThemedText>
                        {isSelf ? (
                          <ThemedText type="body2" themeColor="textSecondary">
                            {t('team.currentUserSuffix')}
                          </ThemedText>
                        ) : null}
                      </View>

                      <View style={styles.metaRow}>
                        <ThemedText
                          type="body2"
                          themeColor="textSecondary"
                          numberOfLines={1}
                          style={styles.username}>
                          {employee.username}
                        </ThemedText>
                        <RoleBadge
                          role={employee.role}
                          label={employee.role === 'ADMIN' ? t('roles.admin') : t('roles.employee')}
                        />
                      </View>
                    </View>

                    {canArchive ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t('common.actions.delete')}
                        disabled={archivingId != null}
                        hitSlop={Spacing.one}
                        onPress={() => confirmArchive(employee)}
                        style={({ pressed }) => [
                          styles.archiveButton,
                          pressed && archivingId == null && {
                            backgroundColor: theme.background,
                          },
                        ]}>
                        {isArchiving ? (
                          <ActivityIndicator size="small" color={theme.danger} />
                        ) : (
                          <MaterialCommunityIcons
                            name="account-remove-outline"
                            size={22}
                            color={theme.danger}
                          />
                        )}
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </ThemedView>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    gap: Spacing.three,
    flexGrow: 1,
  },
  state: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.five,
  },
  card: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: Spacing.three + 44 + Spacing.three,
  },
  row: {
    minHeight: TouchTarget.min,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  avatarTile: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitles: {
    flex: 1,
    gap: Spacing.half,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.one,
  },
  name: {
    flexShrink: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  username: {
    flexShrink: 1,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  archiveButton: {
    width: TouchTarget.min,
    height: TouchTarget.min,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAction: {
    minWidth: TouchTarget.min,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActionPressed: {
    opacity: 0.6,
  },
});
