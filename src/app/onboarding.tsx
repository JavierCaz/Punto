/**
 * First-run wizard, steps 1–2 (Stack.Protected guard, phase === 'onboarding'):
 * creates the business + ADMIN owner, then hands off to the `setup` route group
 * for the remaining data steps.
 *
 * One screen at a time, sharing the same progress bar / footer chrome as the
 * setup steps via `WizardStep` (see @/constants/wizard for the full step list).
 */
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { getLocales } from 'expo-localization';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, TextInput, View, type StyleProp, type TextStyle } from 'react-native';

import { normalizeUsername, useAuthStore, validatePassword, validateUsername } from '@/auth';
import { BusinessLogoPicker, type BusinessLogoError } from '@/components/business-logo-picker';
import { CurrencySwitch } from '@/components/currency-switch';
import { LanguageSwitch } from '@/components/language-switch';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WizardStep } from '@/components/wizard-step';
import { resolveDefaultCurrency, type CurrencyCode } from '@/constants/currencies';
import { Radius, Spacing, TouchTarget, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { i18n, resolveLanguage } from '@/i18n';
import { deleteBusinessLogo } from '@/lib/business-logo';

/** Device currency seeds the initial selection when it is one of ours. */
const INITIAL_CURRENCY = resolveDefaultCurrency(getLocales()[0]?.currencyCode);

type OnboardingStep = 'business' | 'account';

type ErrorField =
  | 'businessName'
  | 'firstName'
  | 'username'
  | 'password'
  | 'confirm'
  | 'form';

type ErrorMessageKey =
  | 'onboarding.errors.businessNameRequired'
  | 'onboarding.errors.firstNameRequired'
  | 'onboarding.errors.usernameInvalid'
  | 'onboarding.errors.passwordTooShort'
  | 'onboarding.errors.passwordMismatch'
  | 'onboarding.errors.usernameTaken'
  | 'onboarding.errors.failed';

type OnboardingError = {
  field: ErrorField;
  messageKey: ErrorMessageKey;
};

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const theme = useTheme();

  const [step, setStep] = useState<OnboardingStep>('business');
  const [businessName, setBusinessName] = useState('');
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<BusinessLogoError | null>(null);
  const [currency, setCurrency] = useState<CurrencyCode>(INITIAL_CURRENCY);
  const [firstName, setFirstName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<OnboardingError | null>(null);

  function clearErrorsFor(fields: readonly ErrorField[]): void {
    setError((current) => (current && fields.includes(current.field) ? null : current));
  }

  function renderFieldError(field: ErrorField) {
    if (error?.field !== field) {
      return null;
    }
    return (
      <ThemedText type="body2" themeColor="danger">
        {t(error.messageKey)}
      </ThemedText>
    );
  }

  const inputStyle = (field: ErrorField): StyleProp<TextStyle> => [
    styles.input,
    {
      color: theme.text,
      backgroundColor: theme.backgroundElement,
      borderColor: error?.field === field ? theme.danger : theme.border,
    },
  ];

  function handleBusinessContinue(): void {
    if (businessName.trim().length === 0) {
      setError({ field: 'businessName', messageKey: 'onboarding.errors.businessNameRequired' });
      return;
    }
    setError(null);
    setStep('account');
  }

  async function handleSubmit(): Promise<void> {
    if (submitting) {
      return;
    }

    if (firstName.trim().length === 0) {
      setError({ field: 'firstName', messageKey: 'onboarding.errors.firstNameRequired' });
      return;
    }
    if (validateUsername(username) !== null) {
      setError({ field: 'username', messageKey: 'onboarding.errors.usernameInvalid' });
      return;
    }
    if (validatePassword(password) !== null) {
      setError({ field: 'password', messageKey: 'onboarding.errors.passwordTooShort' });
      return;
    }
    if (password !== confirmPassword) {
      setError({ field: 'confirm', messageKey: 'onboarding.errors.passwordMismatch' });
      return;
    }

    setError(null);
    setSubmitting(true);

    const outcome = await useAuthStore.getState().completeOnboarding({
      businessName: businessName.trim(),
      logoUri,
      currencyCode: currency,
      locale: resolveLanguage(i18n.language),
      adminFirstName: firstName.trim(),
      username: normalizeUsername(username),
      password,
    });

    if (!outcome.ok) {
      setSubmitting(false);
      setError(
        outcome.code === 'failed'
          ? { field: 'form', messageKey: 'onboarding.errors.failed' }
          : { field: 'username', messageKey: 'onboarding.errors.usernameTaken' },
      );
      return;
    }

    // The store flipped the guard to the setup phase; jump into step 3.
    void router.replace('/setup/suppliers');
  }

  if (step === 'business') {
    return (
      <WizardStep
        stepId="business"
        title={t('onboarding.stepBusiness')}
        onContinue={handleBusinessContinue}
        testID="onboarding-business">
        <View style={styles.hero}>
          <ThemedText type="display">
            {t('common.appName')}
            <ThemedText type="display" themeColor="primary">
              .
            </ThemedText>
          </ThemedText>
        </View>

        <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
          <View style={styles.cardBody}>
            <View style={styles.fieldGroup}>
              <BusinessLogoPicker
                logoUri={logoUri}
                onChange={(uri) => {
                  // Onboarding logo files are session-local (not persisted yet),
                  // so a superseded pick can be removed immediately.
                  if (logoUri && logoUri !== uri) {
                    deleteBusinessLogo(logoUri);
                  }
                  setLogoUri(uri);
                  setLogoError(null);
                }}
                onError={setLogoError}
              />
              {logoError ? (
                <ThemedText type="body2" themeColor="danger">
                  {t(
                    logoError === 'permission-denied'
                      ? 'business.logoPermissionDenied'
                      : 'business.logoFailed',
                  )}
                </ThemedText>
              ) : null}
            </View>

            <View style={styles.fieldGroup}>
              <ThemedText type="body2">{t('onboarding.businessNameLabel')}</ThemedText>
              <TextInput
                value={businessName}
                onChangeText={(text) => {
                  setBusinessName(text);
                  clearErrorsFor(['businessName']);
                }}
                placeholder={t('onboarding.businessNamePlaceholder')}
                placeholderTextColor={theme.textSecondary}
                style={inputStyle('businessName')}
                textContentType="organizationName"
                accessibilityLabel={t('onboarding.businessNameLabel')}
              />
              {renderFieldError('businessName')}
              <ThemedText type="body2" themeColor="textSecondary">
                {t('onboarding.businessNameHint')}
              </ThemedText>
            </View>

            <View style={styles.fieldGroup}>
              <ThemedView
                type="background"
                style={[styles.optionsBox, { borderColor: theme.border }]}>
                <CurrencySwitch value={currency} onChange={setCurrency} />
              </ThemedView>
            </View>

            <View style={styles.fieldGroup}>
              <ThemedView
                type="background"
                style={[styles.optionsBox, { borderColor: theme.border }]}>
                <LanguageSwitch />
              </ThemedView>
            </View>
          </View>
        </ThemedView>
      </WizardStep>
    );
  }

  return (
    <WizardStep
      stepId="account"
      title={t('onboarding.stepAccount')}
      subtitle={t('onboarding.accountHint')}
      onBack={() => setStep('business')}
      onContinue={() => {
        void handleSubmit();
      }}
      continueLabel={submitting ? t('onboarding.submitPending') : t('onboarding.submit')}
      busy={submitting}
      testID="onboarding-account">
      <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
        <View style={styles.cardBody}>
          <View
            style={[
              styles.roleBadge,
              { backgroundColor: theme.backgroundSelected, borderColor: theme.backgroundSelected },
            ]}>
            <MaterialCommunityIcons name="shield-account-outline" size={14} color={theme.text} />
            <ThemedText type="micro">{t('roles.admin')}</ThemedText>
          </View>

          <View style={styles.fieldGroup}>
            <ThemedText type="body2">{t('onboarding.firstNameLabel')}</ThemedText>
            <TextInput
              value={firstName}
              onChangeText={(text) => {
                setFirstName(text);
                clearErrorsFor(['firstName']);
              }}
              placeholder={t('onboarding.firstNamePlaceholder')}
              placeholderTextColor={theme.textSecondary}
              style={inputStyle('firstName')}
              textContentType="givenName"
              accessibilityLabel={t('onboarding.firstNameLabel')}
            />
            {renderFieldError('firstName')}
          </View>

          <View style={styles.fieldGroup}>
            <ThemedText type="body2">{t('onboarding.usernameLabel')}</ThemedText>
            <TextInput
              value={username}
              onChangeText={(text) => {
                setUsername(text);
                clearErrorsFor(['username']);
              }}
              placeholder={t('onboarding.usernamePlaceholder')}
              placeholderTextColor={theme.textSecondary}
              style={inputStyle('username')}
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="username"
              accessibilityLabel={t('onboarding.usernameLabel')}
            />
            {renderFieldError('username')}
            <ThemedText type="body2" themeColor="textSecondary">
              {t('onboarding.usernameHint')}
            </ThemedText>
          </View>

          <View style={styles.fieldGroup}>
            <ThemedText type="body2">{t('onboarding.passwordLabel')}</ThemedText>
            <TextInput
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                clearErrorsFor(['password', 'confirm']);
              }}
              placeholder={t('onboarding.passwordPlaceholder')}
              placeholderTextColor={theme.textSecondary}
              style={inputStyle('password')}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="newPassword"
              accessibilityLabel={t('onboarding.passwordLabel')}
            />
            {renderFieldError('password')}
          </View>

          <View style={styles.fieldGroup}>
            <ThemedText type="body2">{t('onboarding.confirmPasswordLabel')}</ThemedText>
            <TextInput
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                clearErrorsFor(['confirm']);
              }}
              style={inputStyle('confirm')}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="newPassword"
              returnKeyType="done"
              onSubmitEditing={() => {
                void handleSubmit();
              }}
              accessibilityLabel={t('onboarding.confirmPasswordLabel')}
            />
            {renderFieldError('confirm')}
          </View>
        </View>
      </ThemedView>

      {error?.field === 'form' ? (
        <ThemedText type="body2" themeColor="danger" style={styles.formErrorText}>
          {t(error.messageKey)}
        </ThemedText>
      ) : null}
    </WizardStep>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    paddingTop: Spacing.one,
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
  fieldGroup: {
    gap: Spacing.one,
  },
  input: {
    minHeight: TouchTarget.min,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    paddingVertical: 0,
    fontSize: Typography.body1.fontSize,
    lineHeight: Typography.body1.lineHeight,
  },
  optionsBox: {
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    alignSelf: 'flex-start',
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderWidth: StyleSheet.hairlineWidth,
  },
  formErrorText: {
    textAlign: 'center',
  },
});
