import { Redirect, router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import {
  findActiveEmployeeById,
  updateEmployee,
  useAuthStore,
  type PublicEmployee,
} from '@/auth';
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

/**
 * Edit an existing team member: name, username and an optional PIN reset.
 * Admin-only (enforced both by the route guard and by the More tab entry).
 * The PIN section is hidden for ADMIN rows because admins sign in with a
 * password, and the repository rejects a PIN patch for them.
 */
export default function EditEmployeeScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((state) => state.user);

  const [employee, setEmployee] = useState<PublicEmployee | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadFailed(false);
    try {
      const found = await findActiveEmployeeById(id);
      setEmployee(found);
      if (found) {
        setFirstName(found.firstName);
        setLastName(found.lastName ?? '');
        setUsername(found.username);
      }
    } catch {
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

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

  const isAdminAccount = employee?.role === 'ADMIN';

  const onSubmit = async () => {
    if (saving || !employee) {
      return;
    }

    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    const resetPin = pin.length > 0 || confirmPin.length > 0;

    const nextErrors: FormErrors = {};
    if (trimmedFirstName.length === 0) {
      nextErrors.firstName = t('team.form.errors.firstNameRequired');
    }
    if (validateUsername(username) !== null) {
      nextErrors.username = t('team.form.errors.usernameInvalid');
    }
    if (!isAdminAccount && resetPin) {
      if (validatePin(pin) !== null) {
        nextErrors.pin = t('team.form.errors.pinInvalid');
      } else if (pin !== confirmPin) {
        nextErrors.confirmPin = t('team.form.errors.pinInvalid');
      }
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setSaving(true);
    try {
      const pinHash = !isAdminAccount && resetPin ? await hashSecret(pin) : undefined;
      await updateEmployee(employee.id, {
        firstName: trimmedFirstName,
        lastName: trimmedLastName.length > 0 ? trimmedLastName : null,
        username: normalizeUsername(username),
        ...(pinHash !== undefined ? { pinHash } : {}),
      });
      router.back();
    } catch (error) {
      const code = error instanceof Error ? error.message : '';
      if (code === 'AUTH_USERNAME_TAKEN') {
        setErrors({ username: t('team.form.errors.usernameTaken') });
      } else if (code === 'AUTH_PIN_NOT_ALLOWED') {
        setErrors({ form: t('team.form.errors.pinNotAllowed') });
      } else if (code === 'AUTH_FIRST_NAME_REQUIRED') {
        setErrors({ firstName: t('team.form.errors.firstNameRequired') });
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
          title: t('team.edit.title'),
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
        </View>
      ) : loadFailed ? (
        <View style={styles.state}>
          <ThemedText type="body1">{t('common.status.error')}</ThemedText>
        </View>
      ) : !employee ? (
        <View style={styles.state}>
          <ThemedText type="body1" themeColor="textSecondary">
            {t('team.edit.notFound')}
          </ThemedText>
        </View>
      ) : (
        <>
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
                testID="team-edit-first-name"
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
                testID="team-edit-last-name"
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
                testID="team-edit-username"
              />

              {!isAdminAccount ? (
                <>
                  <FormField
                    label={t('team.edit.pinLabel')}
                    accessibilityLabel={t('team.edit.pinLabel')}
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
                    hint={t('team.edit.pinHint')}
                    error={errors.pin}
                    testID="team-edit-pin"
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
                    testID="team-edit-confirm-pin"
                  />
                </>
              ) : null}
            </View>
          </ThemedView>

          {errors.form ? (
            <ThemedText type="body2" themeColor="danger" style={styles.formError}>
              {errors.form}
            </ThemedText>
          ) : null}

          <PrimaryButton
            label={saving ? t('common.status.loading') : t('team.edit.submit')}
            onPress={() => {
              void onSubmit();
            }}
            disabled={saving}
          />
        </>
      )}
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
  state: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.five,
  },
});
