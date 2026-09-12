import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';

import { CategoryForm } from '@/components/category-form';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';

import { Spacing } from '@/constants/theme';
import {
  REPO_ERROR,
  archiveCategory,
  createCategory,
  getCategoryById,
  isRepoError,
  updateCategory,
  type Category,
} from '@/db';
import { useTheme } from '@/hooks/use-theme';

export default function CategoryEditScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const params = useLocalSearchParams<{ id?: string }>();
  const rawId = params.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const editing = typeof id === 'string' && id.length > 0;

  const [category, setCategory] = useState<Category | null>(null);
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
        const found = await getCategoryById(id);
        if (cancelled) {
          return;
        }
        if (!found) {
          setLoadFailed(true);
          return;
        }
        setCategory(found);
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

  const handleSave = async (name: string): Promise<void> => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      if (editing && category) {
        await updateCategory(category.id, { name });
      } else {
        await createCategory({ name });
      }
      router.back();
    } catch (error) {
      setSubmitError(
        isRepoError(error, REPO_ERROR.DUPLICATE)
          ? t('categories.form.duplicate')
          : t('categories.form.saveFailed'),
      );
      setSubmitting(false);
    }
  };

  const handleDelete = (): void => {
    if (!category) {
      return;
    }
    const name = category.name;
    Alert.alert(
      t('categories.form.deleteConfirmTitle', { name }),
      t('categories.form.deleteConfirmMessage'),
      [
        { text: t('common.actions.cancel'), style: 'cancel' },
        {
          text: t('common.actions.delete'),
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await archiveCategory(category.id);
                router.back();
              } catch {
                Alert.alert(t('common.status.error'), t('categories.form.deleteFailed'));
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
          title: editing ? t('categories.form.editTitle') : t('categories.form.newTitle'),
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
        <CategoryForm
          initialCategory={category}
          submitting={submitting}
          submitError={submitError}
          onSave={(name) => void handleSave(name)}
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
