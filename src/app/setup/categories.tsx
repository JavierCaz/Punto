import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { SecondaryButton } from '@/components/secondary-button';
import { CategoryForm } from '@/components/category-form';
import { SectionHeader } from '@/components/section-header';
import { SetupEntryList } from '@/components/setup-entry-list';
import { ThemedText } from '@/components/themed-text';
import { WizardStep } from '@/components/wizard-step';

import { Spacing } from '@/constants/theme';
import {
  REPO_ERROR,
  archiveCategory,
  createCategory,
  isRepoError,
  listCategories,
  updateCategory,
  type Category,
} from '@/db';
import { showConfirm, showMessage } from '@/dialog';
import { useTheme } from '@/hooks/use-theme';

/** Setup step 4 — add categories. Each save persists immediately. */
export default function SetupCategoriesScreen() {
  const { t } = useTranslation();
  const theme = useTheme();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const list = await listCategories();
        if (!cancelled) {
          setCategories(list);
        }
      } catch {
        // A failed read leaves the step empty; the user can still add or skip.
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const goNext = (): void => {
    router.push('/setup/ingredients');
  };

  const resetForm = (): void => {
    setEditingCategory(null);
    setSubmitError(null);
    setFormKey((current) => current + 1);
  };

  const handleSave = async (name: string): Promise<void> => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, { name });
      } else {
        await createCategory({ name });
      }
      setCategories(await listCategories());
      resetForm();
    } catch (error) {
      setSubmitError(
        isRepoError(error, REPO_ERROR.DUPLICATE)
          ? t('categories.form.duplicate')
          : t('categories.form.saveFailed'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (id: string): void => {
    const found = categories.find((category) => category.id === id) ?? null;
    setEditingCategory(found);
    setSubmitError(null);
    setFormKey((current) => current + 1);
  };

  const handleDelete = (id: string): void => {
    const found = categories.find((category) => category.id === id);
    if (!found) {
      return;
    }
    showConfirm({
      title: t('categories.form.deleteConfirmTitle', { name: found.name }),
      message: t('categories.form.deleteConfirmMessage'),
      tone: 'danger',
      confirmLabel: t('common.actions.delete'),
      confirmTone: 'danger',
      onConfirm: () => {
        void (async () => {
          try {
            await archiveCategory(found.id);
            setCategories(await listCategories());
            if (editingCategory?.id === found.id) {
              resetForm();
            }
          } catch {
            showMessage({
              title: t('common.status.error'),
              message: t('categories.form.deleteFailed'),
              tone: 'danger',
            });
          }
        })();
      },
    });
  };

  return (
    <WizardStep
      stepId="categories"
      title={t('wizard.categoriesTitle')}
      subtitle={t('wizard.categoriesHint')}
      onBack={() => router.back()}
      onContinue={goNext}
      onSkip={goNext}
      busy={submitting}
      testID="setup-categories">
      {loading ? (
        <View style={styles.state}>
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : (
        <>
          {categories.length > 0 ? (
            <SetupEntryList
              title={t('wizard.added')}
              entries={categories.map((category) => ({ id: category.id, title: category.name }))}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ) : (
            <ThemedText type="body2" themeColor="textSecondary">
              {t('wizard.categoriesEmpty')}
            </ThemedText>
          )}

          <View style={styles.formSection}>
            <SectionHeader
              level="section"
              title={editingCategory ? t('categories.form.editTitle') : t('wizard.addCategory')}
            />
            <CategoryForm
              key={formKey}
              initialCategory={editingCategory}
              submitting={submitting}
              submitError={submitError}
              onSave={(name) => void handleSave(name)}
            />
            {editingCategory ? (
              <SecondaryButton
                label={t('common.actions.cancel')}
                icon="close"
                onPress={resetForm}
                disabled={submitting}
              />
            ) : null}
          </View>
        </>
      )}
    </WizardStep>
  );
}

const styles = StyleSheet.create({
  state: {
    alignItems: 'center',
    paddingVertical: Spacing.five,
  },
  formSection: {
    gap: Spacing.three,
  },
});
