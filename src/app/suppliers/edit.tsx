import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { SupplierForm, type SupplierFormValues } from '@/components/supplier-form';
import { ThemedText } from '@/components/themed-text';

import { Spacing } from '@/constants/theme';
import {
  REPO_ERROR,
  archiveSupplier,
  createSupplier,
  getSupplierById,
  isRepoError,
  updateSupplier,
  type Supplier,
} from '@/db';
import { useTheme } from '@/hooks/use-theme';

export default function SupplierEditScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const params = useLocalSearchParams<{ id?: string }>();
  const rawId = params.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const editing = typeof id === 'string' && id.length > 0;

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(editing);
  const [loadFailed, setLoadFailed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!editing) {
      return;
    }
    let cancelled = false;

    async function load(): Promise<void> {
      try {
        const found = await getSupplierById(id);
        if (cancelled) {
          return;
        }
        if (!found) {
          setLoadFailed(true);
          return;
        }
        setSupplier(found);
      } catch {
        if (!cancelled) {
          setLoadFailed(true);
        }
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
  }, [editing, id]);

  const handleSave = async (values: SupplierFormValues): Promise<void> => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      if (editing && supplier) {
        await updateSupplier(supplier.id, values);
      } else {
        await createSupplier(values);
      }
      router.back();
    } catch (error) {
      setSubmitError(
        isRepoError(error, REPO_ERROR.DUPLICATE)
          ? t('suppliers.form.duplicate')
          : t('suppliers.form.saveFailed'),
      );
      setSubmitting(false);
    }
  };

  const handleDelete = (): void => {
    if (!supplier) {
      return;
    }
    const name = supplier.name;
    Alert.alert(
      t('suppliers.form.deleteConfirmTitle', { name }),
      t('suppliers.form.deleteConfirmMessage'),
      [
        { text: t('common.actions.cancel'), style: 'cancel' },
        {
          text: t('common.actions.delete'),
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await archiveSupplier(supplier.id);
                router.back();
              } catch {
                Alert.alert(t('common.status.error'), t('suppliers.form.deleteFailed'));
              }
            })();
          },
        },
      ],
    );
  };

  return (
    <Screen scroll header contentContainerStyle={styles.content}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: editing ? t('suppliers.form.editTitle') : t('suppliers.form.newTitle'),
          headerBackTitle: t('common.actions.back'),
          headerStyle: { backgroundColor: theme.backgroundElement },
          headerTintColor: theme.text,
          headerTitleStyle: { color: theme.text },
          headerShadowVisible: false,
        }}
      />

      {loading ? (
        <View style={styles.state}>
          <ActivityIndicator color={theme.primary} />
          <ThemedText type="body2" themeColor="textSecondary">
            {t('common.status.loading')}
          </ThemedText>
        </View>
      ) : loadFailed ? (
        <View style={styles.state}>
          <ThemedText type="body1">{t('common.status.error')}</ThemedText>
        </View>
      ) : (
        <SupplierForm
          initialSupplier={supplier}
          submitting={submitting}
          submitError={submitError}
          onSave={(values) => void handleSave(values)}
          onDelete={editing ? handleDelete : undefined}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.four,
  },
  state: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.five,
  },
});
