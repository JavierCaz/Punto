/**
 * First-run wizard (Stack.Protected guard, phase === 'onboarding'): creates
 * the business + ADMIN owner in one form, then jumps into the POS tabs.
 */
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { getLocales } from 'expo-localization';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, TextInput, View, type StyleProp, type TextStyle } from 'react-native';

import { normalizeUsername, useAuthStore, validatePassword, validateUsername } from '@/auth';
import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/section-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing, TouchTarget, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { i18n } from '@/i18n';

/** Device currency drives the business default; surfaced before submit. */
const DEVICE_CURRENCY = getLocales()[0]?.currencyCode ?? 'USD';

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

  const [businessName, setBusinessName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<OnboardingError | null>(null);

  const languageName =
    i18n.language === 'en' ? t('settings.languageOptions.en') : t('settings.languageOptions.es');

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

  async function handleSubmit(): Promise<void> {
    if (submitting) {
      return;
    }

    if (businessName.trim().length === 0) {
      setError({ field: 'businessName', messageKey: 'onboarding.errors.businessNameRequired' });
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
      currencyCode: DEVICE_CURRENCY,
      locale: i18n.language,
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

    void router.replace('/');
  }

  return (
    <Screen scroll contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <ThemedText type="display">
          {t('common.appName')}
          <ThemedText type="display" themeColor="primary">
            .
          </ThemedText>
        </ThemedText>
      </View>

      <View style={styles.section}>
        <SectionHeader level="section" title={t('onboarding.stepBusiness')} />
        <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
          <View style={styles.cardBody}>
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

            <View style={[styles.noticeRow, { borderTopColor: theme.border }]}>
              <MaterialCommunityIcons
                name="information-outline"
                size={16}
                color={theme.textSecondary}
              />
              <ThemedText type="body2" themeColor="textSecondary" style={styles.noticeText}>
                {t('onboarding.currencyNotice', {
                  currency: DEVICE_CURRENCY,
                  language: languageName,
                })}
              </ThemedText>
            </View>
          </View>
        </ThemedView>
      </View>

      <View style={styles.section}>
        <SectionHeader level="section" title={t('onboarding.stepAccount')} />
        <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
          <View style={styles.cardBody}>
            <ThemedText type="body2" themeColor="textSecondary">
              {t('onboarding.accountHint')}
            </ThemedText>

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
      </View>

      <View style={styles.footer}>
        {error?.field === 'form' ? (
          <ThemedText type="body2" themeColor="danger" style={styles.formErrorText}>
            {t(error.messageKey)}
          </ThemedText>
        ) : null}
        <PrimaryButton
          label={submitting ? t('onboarding.submitPending') : t('onboarding.submit')}
          onPress={() => {
            void handleSubmit();
          }}
          icon="check"
          disabled={submitting}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.four,
  },
  hero: {
    alignItems: 'center',
    paddingTop: Spacing.one,
  },
  section: {
    gap: Spacing.two,
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
  noticeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    paddingTop: Spacing.one,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  noticeText: {
    flex: 1,
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
  footer: {
    gap: Spacing.two,
  },
});
