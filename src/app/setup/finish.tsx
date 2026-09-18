import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';

import { ListRow } from '@/components/list-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WizardStep } from '@/components/wizard-step';

import { Radius } from '@/constants/theme';
import {
  listCategories,
  listInventoryItems,
  listProducts,
  listSuppliers,
} from '@/db';
import { showMessage } from '@/dialog';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/auth';

type SetupCounts = {
  suppliers: number;
  categories: number;
  ingredients: number;
  products: number;
};

const EMPTY_COUNTS: SetupCounts = { suppliers: 0, categories: 0, ingredients: 0, products: 0 };

/** Setup step 7 — summary + finish; marks the guided setup complete. */
export default function SetupFinishScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const completeSetup = useAuthStore((state) => state.completeSetup);

  const [counts, setCounts] = useState<SetupCounts>(EMPTY_COUNTS);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [suppliers, categories, ingredients, products] = await Promise.all([
          listSuppliers(),
          listCategories(),
          listInventoryItems(),
          listProducts(),
        ]);
        if (!cancelled) {
          setCounts({
            suppliers: suppliers.length,
            categories: categories.length,
            ingredients: ingredients.length,
            products: products.length,
          });
        }
      } catch {
        // The summary is informational; a failed read just shows zeros.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleFinish = async (): Promise<void> => {
    if (busy) {
      return;
    }
    setBusy(true);
    try {
      await completeSetup();
      router.replace('/');
    } catch {
      setBusy(false);
      showMessage({
        title: t('common.status.error'),
        message: t('onboarding.errors.failed'),
        tone: 'danger',
      });
    }
  };

  const summary = [
    { key: 'suppliers', label: t('wizard.summarySuppliers'), count: counts.suppliers },
    { key: 'categories', label: t('wizard.summaryCategories'), count: counts.categories },
    { key: 'ingredients', label: t('wizard.summaryIngredients'), count: counts.ingredients },
    { key: 'products', label: t('wizard.summaryProducts'), count: counts.products },
  ];

  return (
    <WizardStep
      stepId="finish"
      title={t('wizard.finishTitle')}
      subtitle={t('wizard.finishHint')}
      onBack={() => router.back()}
      onContinue={() => void handleFinish()}
      continueLabel={busy ? t('wizard.finishPending') : t('wizard.finishStart')}
      busy={busy}
      testID="setup-finish">
      <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
        {summary.map((row, index) => (
          <ListRow
            key={row.key}
            title={row.label}
            divided={index < summary.length - 1}
            trailing={<ThemedText type="code">{String(row.count)}</ThemedText>}
          />
        ))}
      </ThemedView>
    </WizardStep>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
});
