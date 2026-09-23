import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { BottomSheet } from './bottom-sheet';
import { FormField } from './form-field';
import { PrimaryButton } from './primary-button';
import { ThemedText } from './themed-text';

import { openSession } from '@/cash-session/cash-session-repository';
import { useCashSessionStore } from '@/cash-session/cash-session-store';
import { Spacing } from '@/constants/theme';
import { parseMoneyInput } from '@/lib/catalog-form';

/**
 * "Abrir caja" bottom sheet (§8.1 mobile / modal tablet). Opening amount input
 * (numeric, monospace via the FormField's default) + optional note; the employee
 * is auto-filled from the signed-in session by the caller. On success it
 * refreshes the cash-session store and invokes `onOpened`.
 */
export interface CashSessionOpenSheetProps {
  visible: boolean;
  onClose: () => void;
  onOpened: () => void;
  /** Auto-filled employee attribution (signed-in user). */
  employeeId?: string | null;
}

export function CashSessionOpenSheet({
  visible,
  onClose,
  onOpened,
  employeeId,
}: CashSessionOpenSheetProps) {
  const { t } = useTranslation();
  const [amountInput, setAmountInput] = useState('');
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleClose = (): void => {
    // Reset the form so the next open starts clean (no stale input).
    setAmountInput('');
    setNotes('');
    setSubmitted(false);
    setSubmitting(false);
    setSubmitError(null);
    onClose();
  };

  const trimmed = amountInput.trim();
  const parsedAmount = parseMoneyInput(amountInput);
  const amountError =
    trimmed.length === 0
      ? t('cashSession.openSheet.amountRequired')
      : parsedAmount == null
        ? t('cashSession.openSheet.amountInvalid')
        : undefined;

  const handleConfirm = async (): Promise<void> => {
    if (submitting) {
      return;
    }
    setSubmitted(true);
    if (amountError != null || parsedAmount == null) {
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      await openSession({
        openingAmountMinor: parsedAmount,
        employeeId: employeeId ?? null,
        notes: notes.trim() || undefined,
      });
      await useCashSessionStore.getState().refresh();
      setAmountInput('');
      setNotes('');
      setSubmitted(false);
      onOpened();
      handleClose();
    } catch {
      setSubmitError(t('cashSession.openSheet.error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={handleClose}
      title={t('cashSession.openSheet.title')}
      testID="cash-session-open-sheet">
      <View style={styles.body}>
        <FormField
          label={t('cashSession.openSheet.amountLabel')}
          accessibilityLabel={t('cashSession.openSheet.amountLabel')}
          placeholder={t('cashSession.openSheet.amountPlaceholder')}
          value={amountInput}
          onChangeText={(value) => setAmountInput(value)}
          keyboardType="decimal-pad"
          autoCapitalize="none"
          error={submitted ? amountError : undefined}
          testID="cash-session-open-amount"
        />
        <FormField
          label={t('cashSession.openSheet.noteLabel')}
          accessibilityLabel={t('cashSession.openSheet.noteLabel')}
          placeholder={t('cashSession.openSheet.notePlaceholder')}
          value={notes}
          onChangeText={setNotes}
          testID="cash-session-open-notes"
        />
        {submitError ? (
          <ThemedText type="body2" themeColor="danger">
            {submitError}
          </ThemedText>
        ) : null}
        <PrimaryButton
          label={t('cashSession.openSheet.confirm')}
          onPress={() => {
            void handleConfirm();
          }}
          disabled={submitting}
          testID="cash-session-open-confirm"
        />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.four,
  },
});
