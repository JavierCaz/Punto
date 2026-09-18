import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { validatePin, verifyManagerAuthorizationPin } from '@/auth';
import { BottomSheet } from '@/components/bottom-sheet';
import { FormField } from '@/components/form-field';
import { PrimaryButton } from '@/components/primary-button';
import { SecondaryButton } from '@/components/secondary-button';
import { ThemedText } from '@/components/themed-text';

import { Spacing } from '@/constants/theme';

export type ManagerPinSheetProps = {
  visible: boolean;
  onClose: () => void;
  onAuthorized: (adminId: string) => void;
};

/**
 * Bottom sheet where a manager enters their authorization PIN to approve an
 * employee-initiated refund. The PIN is verified against every active admin
 * that has configured one; the sheet only surfaces the matched `adminId`.
 */
export function ManagerPinSheet({ visible, onClose, onAuthorized }: ManagerPinSheetProps) {
  const { t } = useTranslation();

  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleClose = (): void => {
    setPin('');
    setError(null);
    setBusy(false);
    onClose();
  };

  const handleSubmit = async (): Promise<void> => {
    if (busy) {
      return;
    }
    setError(null);
    if (validatePin(pin) !== null) {
      setError(t('refundAuth.errors.invalidFormat'));
      return;
    }

    setBusy(true);
    try {
      const result = await verifyManagerAuthorizationPin(pin);
      if (result.ok) {
        setPin('');
        onAuthorized(result.adminId);
      } else if (result.code === 'invalid') {
        setError(t('refundAuth.errors.invalid'));
      } else if (result.code === 'no-pin-configured') {
        setError(t('refundAuth.errors.noPin'));
      } else {
        setError(t('refundAuth.errors.locked', { seconds: result.retryAfterSec ?? 0 }));
      }
    } catch {
      setError(t('common.status.error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={handleClose}
      title={t('refundAuth.title')}
      testID="manager-pin-sheet"
      footer={
        <View style={styles.footer}>
          <PrimaryButton
            label={t('refundAuth.authorize')}
            testID="manager-pin-submit"
            disabled={busy}
            onPress={() => {
              void handleSubmit();
            }}
          />
          <SecondaryButton
            label={t('common.actions.cancel')}
            disabled={busy}
            onPress={handleClose}
          />
        </View>
      }>
      <View style={styles.body}>
        <ThemedText type="body1" themeColor="textSecondary">
          {t('refundAuth.message')}
        </ThemedText>
        <FormField
          label={t('refundAuth.pinLabel')}
          accessibilityLabel={t('refundAuth.pinLabel')}
          placeholder={t('refundAuth.pinPlaceholder')}
          value={pin}
          onChangeText={(value) => {
            setPin(value.replace(/\D/g, ''));
            setError(null);
          }}
          secureTextEntry
          keyboardType="number-pad"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          maxLength={6}
          testID="manager-pin-input"
        />
        {error ? (
          <ThemedText type="body2" themeColor="danger">
            {error}
          </ThemedText>
        ) : null}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: Spacing.three,
    paddingBottom: Spacing.three,
  },
  footer: {
    gap: Spacing.two,
  },
});
