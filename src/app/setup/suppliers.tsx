import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { SecondaryButton } from '@/components/secondary-button';
import { SectionHeader } from '@/components/section-header';
import { SetupEntryList } from '@/components/setup-entry-list';
import { SupplierForm, type SupplierFormValues } from '@/components/supplier-form';
import { ThemedText } from '@/components/themed-text';
import { WizardStep } from '@/components/wizard-step';

import { Spacing } from '@/constants/theme';
import {
  REPO_ERROR,
  archiveSupplier,
  createSupplier,
  isRepoError,
  listSuppliers,
  updateSupplier,
  type Supplier,
} from '@/db';
import { showConfirm, showMessage } from '@/dialog';
import { useTheme } from '@/hooks/use-theme';

/** Setup step 3 — add suppliers. Each save persists immediately. */
export default function SetupSuppliersScreen() {
  const { t } = useTranslation();
  const theme = useTheme();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const list = await listSuppliers();
        if (!cancelled) {
          setSuppliers(list);
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
    router.push('/setup/categories');
  };

  const resetForm = (): void => {
    setEditingSupplier(null);
    setSubmitError(null);
    setFormKey((current) => current + 1);
  };

  const handleSave = async (values: SupplierFormValues): Promise<void> => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      if (editingSupplier) {
        await updateSupplier(editingSupplier.id, values);
      } else {
        await createSupplier(values);
      }
      setSuppliers(await listSuppliers());
      resetForm();
    } catch (error) {
      setSubmitError(
        isRepoError(error, REPO_ERROR.DUPLICATE)
          ? t('suppliers.form.duplicate')
          : t('suppliers.form.saveFailed'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (id: string): void => {
    const found = suppliers.find((supplier) => supplier.id === id) ?? null;
    setEditingSupplier(found);
    setSubmitError(null);
    setFormKey((current) => current + 1);
  };

  const handleDelete = (id: string): void => {
    const found = suppliers.find((supplier) => supplier.id === id);
    if (!found) {
      return;
    }
    showConfirm({
      title: t('suppliers.form.deleteConfirmTitle', { name: found.name }),
      message: t('suppliers.form.deleteConfirmMessage'),
      tone: 'danger',
      confirmLabel: t('common.actions.delete'),
      confirmTone: 'danger',
      onConfirm: () => {
        void (async () => {
          try {
            await archiveSupplier(found.id);
            setSuppliers(await listSuppliers());
            if (editingSupplier?.id === found.id) {
              resetForm();
            }
          } catch {
            showMessage({
              title: t('common.status.error'),
              message: t('suppliers.form.deleteFailed'),
              tone: 'danger',
            });
          }
        })();
      },
    });
  };

  return (
    <WizardStep
      stepId="suppliers"
      title={t('wizard.suppliersTitle')}
      subtitle={t('wizard.suppliersHint')}
      onContinue={goNext}
      onSkip={goNext}
      busy={submitting}
      testID="setup-suppliers">
      {loading ? (
        <View style={styles.state}>
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : (
        <>
          {suppliers.length > 0 ? (
            <SetupEntryList
              title={t('wizard.added')}
              entries={suppliers.map((supplier) => ({
                id: supplier.id,
                title: supplier.name,
                subtitle: supplier.phone ?? undefined,
              }))}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ) : (
            <ThemedText type="body2" themeColor="textSecondary">
              {t('wizard.suppliersEmpty')}
            </ThemedText>
          )}

          <View style={styles.formSection}>
            <SectionHeader
              level="section"
              title={editingSupplier ? t('suppliers.form.editTitle') : t('wizard.addSupplier')}
            />
            <SupplierForm
              key={formKey}
              initialSupplier={editingSupplier}
              submitting={submitting}
              submitError={submitError}
              onSave={(values) => void handleSave(values)}
            />
            {editingSupplier ? (
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
