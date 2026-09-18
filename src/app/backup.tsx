import Constants from 'expo-constants';
import { router, Stack } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useAuthStore } from '@/auth';
import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { SecondaryButton } from '@/components/secondary-button';
import { SectionHeader } from '@/components/section-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { isAccent } from '@/constants/accents';
import { Radius, Spacing } from '@/constants/theme';
import {
  REPO_ERROR,
  clearAllData,
  exportDatabase,
  getBusinessProfile,
  importDatabase,
  inspectBackup,
  isDatabaseEmpty,
  isRepoError,
} from '@/db';
import { showConfirm, showMessage } from '@/dialog';
import { useTheme } from '@/hooks/use-theme';
import {
  buildBackupFileName,
  parseBackupJson,
  serializeBackup,
  summarizeBackup,
  type BackupDocument,
  type BackupStats,
  type BackupValidationError,
} from '@/lib/backup-format';
import {
  backupSharingAvailable,
  copyBackupToClipboard,
  pickBackupFile,
  shareBackupFile,
  writeBackupFile,
} from '@/lib/backup-files';
import { useAccentStore } from '@/theme/accent-store';

const APP_VERSION_FALLBACK = '1.0.0';

/** Join the first few validation problems into a readable alert body. */
function formatValidationErrors(errors: BackupValidationError[]): string {
  return errors
    .slice(0, 3)
    .map((error) => `${error.path}: ${error.message}`)
    .join('\n');
}

function StatRow({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statRow}>
      <ThemedText type="body2" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="body1">{String(value)}</ThemedText>
    </View>
  );
}

/**
 * Backup / data-portability screen (§3.3): inspect the dataset, export it as a
 * JSON file (share sheet) or clipboard payload, import a backup by replacing
 * all data, and erase everything with a strong confirmation.
 */
export default function BackupScreen() {
  const { t } = useTranslation();
  const theme = useTheme();

  const [stats, setStats] = useState<BackupStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEmpty, setIsEmpty] = useState(false);
  const [busy, setBusy] = useState(false);

  const appVersion = Constants.expoConfig?.version ?? APP_VERSION_FALLBACK;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const document = await exportDatabase(useAuthStore.getState().user);
        const empty = await isDatabaseEmpty();
        if (cancelled) {
          return;
        }
        setStats(summarizeBackup(document));
        setIsEmpty(empty);
      } catch {
        if (cancelled) {
          return;
        }
        setStats(null);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleExport = useCallback(async () => {
    setBusy(true);
    try {
      const document = await exportDatabase(useAuthStore.getState().user, { appVersion });
      const json = serializeBackup(document);
      const uri = writeBackupFile(json, buildBackupFileName());

      if (await backupSharingAvailable()) {
        await shareBackupFile(uri, t('backup.shareTitle'));
        showMessage({
          title: t('backup.exportSuccessTitle'),
          message: t('backup.exportSuccessMessage'),
          tone: 'success',
        });
      } else {
        await copyBackupToClipboard(json);
        showMessage({
          title: t('backup.shareUnavailableTitle'),
          message: t('backup.shareUnavailableMessage'),
          tone: 'warning',
        });
      }
    } catch {
      showMessage({
        title: t('backup.errorTitle'),
        message: t('backup.errors.generic'),
        tone: 'danger',
      });
    } finally {
      setBusy(false);
    }
  }, [appVersion, t]);

  const handleCopy = useCallback(async () => {
    setBusy(true);
    try {
      const document = await exportDatabase(useAuthStore.getState().user, { appVersion });
      await copyBackupToClipboard(serializeBackup(document));
      showMessage({
        title: t('backup.copySuccessTitle'),
        message: t('backup.copySuccessMessage'),
        tone: 'success',
      });
    } catch {
      showMessage({
        title: t('backup.errorTitle'),
        message: t('backup.errors.generic'),
        tone: 'danger',
      });
    } finally {
      setBusy(false);
    }
  }, [appVersion, t]);

  const performImport = useCallback(
    async (document: BackupDocument) => {
      setBusy(true);
      try {
        await importDatabase(useAuthStore.getState().user, document, { mode: 'replace' });

        // Imported admin credentials are foreign to this session: return to login.
        useAuthStore.getState().signOut();

        const profile = await getBusinessProfile();
        if (profile && isAccent(profile.accentColor)) {
          useAccentStore.getState().setAccent(profile.accentColor);
        }

        router.replace('/login');
        showMessage({
          title: t('backup.importSuccessTitle'),
          message: t('backup.importSuccessMessage'),
          tone: 'success',
        });
      } catch (error) {
        const message = isRepoError(error, REPO_ERROR.BACKUP_CONFLICT)
          ? t('backup.errors.conflict')
          : isRepoError(error, REPO_ERROR.BACKUP_INVALID)
            ? t('backup.errors.invalid')
            : t('backup.errors.generic');
        showMessage({ title: t('backup.errorTitle'), message, tone: 'danger' });
      } finally {
        setBusy(false);
      }
    },
    [t],
  );

  const handleImport = useCallback(async () => {
    setBusy(true);
    try {
      const picked = await pickBackupFile();
      if (!picked) {
        return;
      }

      const parsed = parseBackupJson(picked.json);
      if (!parsed.ok) {
        showMessage({
          title: t('backup.importInvalidTitle'),
          message: formatValidationErrors(parsed.errors) || t('backup.importInvalidMessage'),
          tone: 'danger',
        });
        return;
      }

      const validation = await inspectBackup(parsed.value);
      if (!validation.ok) {
        showMessage({
          title: t('backup.importInvalidTitle'),
          message: formatValidationErrors(validation.errors) || t('backup.importInvalidMessage'),
          tone: 'danger',
        });
        return;
      }

      showConfirm({
        title: t('backup.importConfirmTitle'),
        message: t('backup.importConfirmMessage'),
        tone: 'danger',
        confirmLabel: t('common.actions.confirm'),
        confirmTone: 'danger',
        onConfirm: () => {
          void performImport(validation.document);
        },
      });
    } catch {
      showMessage({
        title: t('backup.errorTitle'),
        message: t('backup.errors.generic'),
        tone: 'danger',
      });
    } finally {
      setBusy(false);
    }
  }, [performImport, t]);

  const performErase = useCallback(async () => {
    setBusy(true);
    try {
      await clearAllData(useAuthStore.getState().user);
      await useAuthStore.getState().resetToOnboarding();
      router.replace('/onboarding');
      showMessage({
        title: t('backup.eraseSuccessTitle'),
        message: t('backup.eraseSuccessMessage'),
        tone: 'success',
      });
    } catch {
      showMessage({
        title: t('backup.errorTitle'),
        message: t('backup.errors.generic'),
        tone: 'danger',
      });
    } finally {
      setBusy(false);
    }
  }, [t]);

  const handleErase = useCallback(() => {
    showConfirm({
      title: t('backup.eraseConfirmTitle'),
      message: t('backup.eraseConfirmMessage'),
      tone: 'danger',
      confirmLabel: t('backup.eraseAction'),
      confirmTone: 'danger',
      onConfirm: () => {
        void performErase();
      },
    });
  }, [performErase, t]);

  const hasSummary = !loading && stats !== null && stats.totalRows > 0;

  return (
    <Screen scroll header contentContainerStyle={styles.content}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('backup.title'),
          headerBackTitle: t('common.actions.back'),
          headerStyle: { backgroundColor: theme.backgroundElement },
          headerTintColor: theme.text,
          headerTitleStyle: { color: theme.text },
          headerShadowVisible: false,
        }}
      />

      <View style={styles.section}>
        <SectionHeader level="section" title={t('backup.statusTitle')} />
        <ThemedView
          type="backgroundElement"
          style={[styles.card, styles.cardBody, { borderColor: theme.border }]}
          testID="backup-summary">
          {loading ? (
            <ThemedText type="body2" themeColor="textSecondary">
              {t('backup.statusLoading')}
            </ThemedText>
          ) : stats === null ? (
            <ThemedText type="body2" themeColor="textSecondary">
              {t('backup.errors.generic')}
            </ThemedText>
          ) : hasSummary ? (
            <View style={styles.summary}>
              <ThemedText type="body1">
                {t('backup.statusSummary', { count: stats.totalRows })}
              </ThemedText>
              <StatRow label={t('backup.tables.products')} value={stats.perTable.product} />
              <StatRow label={t('backup.tables.sales')} value={stats.perTable.sale} />
              <StatRow
                label={t('backup.tables.ingredients')}
                value={stats.perTable.inventory_item}
              />
            </View>
          ) : (
            <ThemedText type="body2" themeColor="textSecondary">
              {t('backup.statusEmpty')}
            </ThemedText>
          )}
        </ThemedView>
      </View>

      <View style={styles.section}>
        <SectionHeader level="section" title={t('backup.exportTitle')} />
        <ThemedView
          type="backgroundElement"
          style={[styles.card, styles.cardBody, { borderColor: theme.border }]}>
          <PrimaryButton
            label={t('backup.exportAction')}
            icon="share-variant-outline"
            disabled={busy}
            onPress={handleExport}
            testID="backup-export-button"
          />
          <SecondaryButton
            label={t('backup.copyAction')}
            icon="content-copy"
            disabled={busy}
            onPress={handleCopy}
            testID="backup-copy-button"
          />
        </ThemedView>
      </View>

      <View style={styles.section}>
        <SectionHeader level="section" title={t('backup.importTitle')} />
        <ThemedView
          type="backgroundElement"
          style={[styles.card, styles.cardBody, { borderColor: theme.border }]}>
          <SecondaryButton
            label={t('backup.importAction')}
            icon="import"
            disabled={busy}
            onPress={handleImport}
            testID="backup-import-button"
          />
        </ThemedView>
      </View>

      <View style={styles.section}>
        <SectionHeader level="section" title={t('backup.eraseTitle')} />
        <ThemedView
          type="backgroundElement"
          style={[styles.card, styles.cardBody, { borderColor: theme.border }]}>
          <SecondaryButton
            label={t('backup.eraseAction')}
            icon="trash-can-outline"
            disabled={busy || isEmpty}
            onPress={handleErase}
            testID="backup-erase-button"
          />
        </ThemedView>
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
  },
  cardBody: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  summary: {
    gap: Spacing.one,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
