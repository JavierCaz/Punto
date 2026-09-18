import { Redirect, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { hasAuthorizationPin, setAuthorizationPin, useAuthStore, validatePin } from '@/auth';
import { FormField } from '@/components/form-field';
import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

import { Radius, Spacing } from '@/constants/theme';
import { showMessage } from '@/dialog';
import { useTheme } from '@/hooks/use-theme';
import { hashSecret } from '@/lib/hash';

export default function ManagerPinScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const user = useAuthStore((state) => state.user);

  const [hasPin, setHasPin] = useState(false);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) {
      return;
    }
    void hasAuthorizationPin(user.id).then(setHasPin);
  }, [user]);

  if (user?.role !== 'ADMIN') {
    return <Redirect href="/" />;
  }

  const onSubmit = async (): Promise<void> => {
    if (saving) {
      return;
    }

    if (validatePin(pin) !== null) {
      setError(t('managerPin.errors.pinInvalid'));
      return;
    }
    if (pin !== confirmPin) {
      setError(t('managerPin.errors.pinMismatch'));
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const pinHash = await hashSecret(pin);
      await setAuthorizationPin(user, pinHash);
      setHasPin(true);
      setPin('');
      setConfirmPin('');
      showMessage({
        title: t('managerPin.savedTitle'),
        message: t('managerPin.savedMessage'),
        tone: 'success',
      });
    } catch {
      setError(t('managerPin.errors.failed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen scroll header contentContainerStyle={styles.content}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('managerPin.title'),
          headerBackTitle: t('common.actions.back'),
          headerStyle: { backgroundColor: theme.backgroundElement },
          headerTintColor: theme.text,
          headerTitleStyle: { color: theme.text },
          headerShadowVisible: false,
        }}
      />

      <ThemedText type="body1" themeColor="textSecondary">
        {t('managerPin.subtitle')}
      </ThemedText>

      <ThemedText type="body2" themeColor={hasPin ? 'success' : 'textSecondary'}>
        {hasPin ? t('managerPin.statusSet') : t('managerPin.statusUnset')}
      </ThemedText>

      <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
        <View style={styles.cardBody}>
          <FormField
            label={t('managerPin.pinLabel')}
            accessibilityLabel={t('managerPin.pinLabel')}
            placeholder=""
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
            hint={t('managerPin.pinHint')}
            testID="manager-pin-new"
          />

          <FormField
            label={t('managerPin.confirmLabel')}
            accessibilityLabel={t('managerPin.confirmLabel')}
            placeholder=""
            value={confirmPin}
            onChangeText={(value) => {
              setConfirmPin(value.replace(/\D/g, ''));
              setError(null);
            }}
            secureTextEntry
            keyboardType="number-pad"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="off"
            maxLength={6}
            testID="manager-pin-confirm"
          />
        </View>
      </ThemedView>

      {error ? (
        <ThemedText type="body2" themeColor="danger" style={styles.formError}>
          {error}
        </ThemedText>
      ) : null}

      <PrimaryButton
        label={saving ? t('common.status.loading') : t('managerPin.save')}
        onPress={() => {
          void onSubmit();
        }}
        disabled={saving}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.four,
  },
  card: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  cardBody: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  formError: {
    textAlign: 'center',
  },
});
