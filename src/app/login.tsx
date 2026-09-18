import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { normalizeUsername, resolveAuthKind, useAuthStore } from '@/auth';
import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { SecondaryButton } from '@/components/secondary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Login — two-step credential entry (username → password/PIN by auth kind).
 * Sits behind the root layout's `authPhase === 'login'` Stack.Protected guard.
 */
type LoginStep = 'username' | 'credential';
type CredentialKind = 'password' | 'pin';
type LoginErrorKey =
  | 'usernameRequired'
  | 'userNotFound'
  | 'invalidCredentials'
  | 'invalidPin'
  | 'inactive'
  | 'failed';

export default function LoginScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const signIn = useAuthStore((state) => state.signIn);

  const [step, setStep] = useState<LoginStep>('username');
  const [authKind, setAuthKind] = useState<CredentialKind | null>(null);
  const [username, setUsername] = useState('');
  const [secret, setSecret] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [fieldError, setFieldError] = useState<LoginErrorKey | null>(null);
  const [lockSecondsLeft, setLockSecondsLeft] = useState<number | null>(null);
  const [focusedField, setFocusedField] = useState<LoginStep | null>(null);

  // Live lock countdown; each second tick re-schedules until the lock clears.
  useEffect(() => {
    if (lockSecondsLeft == null) {
      return;
    }
    const id = setTimeout(() => {
      setLockSecondsLeft((current) => {
        if (current == null) {
          return null;
        }
        return current <= 1 ? null : current - 1;
      });
    }, 1000);
    return () => clearTimeout(id);
  }, [lockSecondsLeft]);

  const handleContinue = async (): Promise<void> => {
    if (isBusy) {
      return;
    }
    const trimmed = username.trim();
    if (!trimmed) {
      setFieldError('usernameRequired');
      return;
    }
    setIsBusy(true);
    setFieldError(null);
    try {
      const resolved = await resolveAuthKind(trimmed);
      if (resolved.kind === 'found') {
        setAuthKind(resolved.authKind);
        setSecret('');
        setFieldError(null);
        setStep('credential');
        setFocusedField(null);
      } else {
        setFieldError('userNotFound');
      }
    } catch {
      setFieldError('failed');
    } finally {
      setIsBusy(false);
    }
  };

  const handleSubmit = async (): Promise<void> => {
    if (isBusy || lockSecondsLeft != null) {
      return;
    }
    setIsBusy(true);
    setFieldError(null);
    try {
      const outcome = await signIn(normalizeUsername(username), secret);
      if (outcome.ok) {
        // A brand-new owner (or one who signed out mid-wizard) resumes the
        // guided setup; everyone else lands in the tabs.
        const phase = useAuthStore.getState().phase;
        router.replace(phase === 'setup' ? '/setup/suppliers' : '/');
        return;
      }
      if (outcome.code === 'locked') {
        const seconds = outcome.retryAfterSec ?? 0;
        if (seconds > 0) {
          setLockSecondsLeft(seconds);
          return;
        }
      }
      setFieldError(authKind === 'pin' ? 'invalidPin' : 'invalidCredentials');
    } catch {
      setFieldError('failed');
    } finally {
      setIsBusy(false);
    }
  };

  const handleSwitchUser = (): void => {
    setStep('username');
    setAuthKind(null);
    setSecret('');
    setFieldError(null);
    setLockSecondsLeft(null);
    setFocusedField(null);
  };

  const errorMessage =
    lockSecondsLeft != null && lockSecondsLeft > 0
      ? t('login.errors.locked', { seconds: lockSecondsLeft })
      : fieldError
        ? t(`login.errors.${fieldError}`)
        : null;

  const inputBorderColor = (hasError: boolean): string => {
    if (hasError) {
      return theme.danger;
    }
    if (focusedField === step) {
      return theme.primary;
    }
    return theme.border;
  };

  const busyLabel = t('common.status.loading');

  return (
    <Screen>
      <ScrollView
        style={styles.fill}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <ThemedView type="backgroundSelected" style={styles.mark}>
            <View style={[styles.markDot, { backgroundColor: theme.primary }]} />
          </ThemedView>
          <ThemedText type="heading1">{t('common.appName')}</ThemedText>
          <ThemedText type="body2" themeColor="textSecondary">
            {t('login.welcomeBack')}
          </ThemedText>
        </View>

        {step === 'username' ? (
          <ThemedView
            type="backgroundElement"
            style={[styles.card, { borderColor: theme.border }]}>
            <View style={styles.field}>
              <ThemedText type="body2" themeColor="textSecondary">
                {t('login.usernameLabel')}
              </ThemedText>
              <View
                style={[
                  styles.inputRow,
                  { backgroundColor: theme.background, borderColor: inputBorderColor(fieldError != null) },
                ]}>
                <MaterialCommunityIcons
                  name="account-outline"
                  size={20}
                  color={theme.textSecondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  value={username}
                  onChangeText={(text) => {
                    setUsername(text);
                    setFieldError(null);
                  }}
                  placeholder={t('login.usernamePlaceholder')}
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.input, { color: theme.text }]}
                  accessibilityLabel={t('login.usernameLabel')}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="username"
                  textContentType="username"
                  returnKeyType="go"
                  onSubmitEditing={() => {
                    void handleContinue();
                  }}
                  editable={!isBusy}
                  autoFocus
                  onFocus={() => setFocusedField('username')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>

            {errorMessage ? (
              <ThemedText
                type="micro"
                themeColor="danger"
                accessibilityLiveRegion="polite">
                {errorMessage}
              </ThemedText>
            ) : null}

            <PrimaryButton
              label={isBusy ? busyLabel : t('login.continueButton')}
              onPress={() => {
                void handleContinue();
              }}
              disabled={isBusy}
            />
          </ThemedView>
        ) : (
          <ThemedView
            type="backgroundElement"
            style={[styles.card, { borderColor: theme.border }]}>
            <View style={styles.field}>
              <ThemedText type="body2" themeColor="textSecondary">
                {authKind === 'pin' ? t('login.pinLabel') : t('login.passwordLabel')}
              </ThemedText>
              <View
                style={[
                  styles.inputRow,
                  { backgroundColor: theme.background, borderColor: inputBorderColor(fieldError != null) },
                ]}>
                <MaterialCommunityIcons
                  name={authKind === 'pin' ? 'dialpad' : 'lock-outline'}
                  size={20}
                  color={theme.textSecondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  value={secret}
                  onChangeText={(text) => {
                    const next =
                      authKind === 'pin' ? text.replace(/\D/g, '').slice(0, 6) : text;
                    setSecret(next);
                    setFieldError(null);
                  }}
                  placeholder={authKind === 'pin' ? t('login.pinLabel') : t('login.passwordLabel')}
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.input, { color: theme.text }]}
                  accessibilityLabel={
                    authKind === 'pin' ? t('login.pinLabel') : t('login.passwordLabel')
                  }
                  secureTextEntry
                  autoCorrect={false}
                  keyboardType={authKind === 'pin' ? 'number-pad' : 'default'}
                  maxLength={authKind === 'pin' ? 6 : undefined}
                  autoCapitalize="none"
                  autoComplete={authKind === 'pin' ? undefined : 'password'}
                  textContentType={authKind === 'pin' ? undefined : 'password'}
                  returnKeyType="go"
                  onSubmitEditing={() => {
                    void handleSubmit();
                  }}
                  editable={!isBusy}
                  autoFocus
                  onFocus={() => setFocusedField('credential')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>

            {errorMessage ? (
              <ThemedText
                type="micro"
                themeColor="danger"
                accessibilityLiveRegion="polite">
                {errorMessage}
              </ThemedText>
            ) : null}

            <PrimaryButton
              label={isBusy ? busyLabel : t('login.submitButton')}
              onPress={() => {
                void handleSubmit();
              }}
              disabled={isBusy || lockSecondsLeft != null}
            />

            <SecondaryButton
              label={t('login.backToUsername')}
              icon="account-switch-outline"
              onPress={handleSwitchUser}
              disabled={isBusy}
            />
          </ThemedView>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: Spacing.four,
    gap: Spacing.five,
  },
  header: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  mark: {
    width: 64,
    height: 64,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
  markDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  field: {
    gap: Spacing.one,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    minHeight: 48,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  inputIcon: {
    width: 20,
    textAlign: 'center',
  },
  input: {
    flex: 1,
    fontSize: Typography.body1.fontSize,
    lineHeight: Typography.body1.lineHeight,
    minHeight: 48,
    paddingVertical: 0,
  },
});
