import { Redirect, router, Stack } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { createEmployee, useAuthStore } from '@/auth';
import { normalizeUsername, validatePin, validateUsername } from '@/auth/validation';
import { FormField } from '@/components/form-field';
import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { hashSecret } from '@/lib/hash';

type ErrorKey = 'firstName' | 'lastName' | 'username' | 'pin' | 'confirmPin' | 'form';

type FormErrors = Partial<Record<ErrorKey, string>>;

export default function AddEmployeeScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const user = useAuthStore((state) => state.user);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);

  if (user?.role !== 'ADMIN') {
    return <Redirect href="/" />;
  }

  const clearError = (key: ErrorKey) => {
    setErrors((prev) => {
      if (prev[key] === undefined && prev.form === undefined) {
        return prev;
      }
      const next = { ...prev };
      delete next[key];
      delete next.form;
      return next;
    });
  };

  const onSubmit = async () => {
    if (saving) {
      return;
    }

    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();

    const nextErrors: FormErrors = {};
    if (trimmedFirstName.length === 0) {
      nextErrors.firstName = t('team.form.errors.firstNameRequired');
    }
    if (validateUsername(username) !== null) {
      nextErrors.username = t('team.form.errors.usernameInvalid');
    }
    if (validatePin(pin) !== null) {
      nextErrors.pin = t('team.form.errors.pinInvalid');
    } else if (pin !== confirmPin) {
      nextErrors.confirmPin = t('team.form.errors.pinInvalid');
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setSaving(true);
    try {
      const pinHash = await hashSecret(pin);
      await createEmployee({
        firstName: trimmedFirstName,
        lastName: trimmedLastName.length > 0 ? trimmedLastName : undefined,
        username: normalizeUsername(username),
        pinHash,
      });
      router.back();
    } catch (error) {
      if (error instanceof Error && error.message === 'AUTH_USERNAME_TAKEN') {
        setErrors({ username: t('team.form.errors.usernameTaken') });
      } else {
        setErrors({ form: t('team.form.errors.failed') });
      }
      setSaving(false);
    }
  };

  const confirmPinLabel = `${t('common.actions.confirm')} ${t('team.form.pinLabel')}`;

  return (
    <Screen scroll header contentContainerStyle={styles.content}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('team.form.title'),
          headerBackTitle: t('common.actions.back'),
          headerStyle: { backgroundColor: theme.backgroundElement },
          headerTintColor: theme.text,
          headerTitleStyle: { color: theme.text },
          headerShadowVisible: false,
        }}
      />

      <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
        <View style={styles.cardBody}>
          <FormField
            label={t('team.form.firstNameLabel')}
            accessibilityLabel={t('team.form.firstNameLabel')}
            placeholder={t('team.form.firstNamePlaceholder')}
            value={firstName}
            onChangeText={(value) => {
              setFirstName(value);
              clearError('firstName');
            }}
            autoCapitalize="words"
            error={errors.firstName}
          />

          <FormField
            label={t('team.form.lastNameLabel')}
            accessibilityLabel={t('team.form.lastNameLabel')}
            placeholder={t('team.form.lastNamePlaceholder')}
            value={lastName}
            onChangeText={(value) => {
              setLastName(value);
              clearError('lastName');
            }}
            autoCapitalize="words"
          />

          <FormField
            label={t('team.form.usernameLabel')}
            accessibilityLabel={t('team.form.usernameLabel')}
            placeholder={t('team.form.usernamePlaceholder')}
            value={username}
            onChangeText={(value) => {
              setUsername(value);
              clearError('username');
            }}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username"
            hint={t('team.form.usernameHint')}
            error={errors.username}
          />

          <FormField
            label={t('team.form.pinLabel')}
            accessibilityLabel={t('team.form.pinLabel')}
            placeholder={t('team.form.pinPlaceholder')}
            value={pin}
            onChangeText={(value) => {
              setPin(value.replace(/\D/g, ''));
              clearError('pin');
            }}
            secureTextEntry
            keyboardType="number-pad"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="off"
            maxLength={6}
            hint={t('team.form.pinHint')}
            error={errors.pin}
          />

          <FormField
            label={confirmPinLabel}
            accessibilityLabel={confirmPinLabel}
            placeholder={t('team.form.pinPlaceholder')}
            value={confirmPin}
            onChangeText={(value) => {
              setConfirmPin(value.replace(/\D/g, ''));
              clearError('confirmPin');
            }}
            secureTextEntry
            keyboardType="number-pad"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="off"
            maxLength={6}
            error={errors.confirmPin}
          />
        </View>
      </ThemedView>

      {errors.form ? (
        <ThemedText type="body2" themeColor="danger" style={styles.formError}>
          {errors.form}
        </ThemedText>
      ) : null}

      <PrimaryButton
        label={saving ? t('common.status.loading') : t('team.form.submit')}
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
