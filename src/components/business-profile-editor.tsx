import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, TextInput, View } from 'react-native';

import { AccentOptions } from './accent-options';
import { BusinessLogoPicker, type BusinessLogoError } from './business-logo-picker';
import { CurrencySwitch } from './currency-switch';
import { LanguageSwitch } from './language-switch';
import { PrimaryButton } from './primary-button';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { DEFAULT_ACCENT, type Accent } from '@/constants/accents';
import { resolveDefaultCurrency } from '@/constants/currencies';
import { Radius, Spacing, TouchTarget, Typography } from '@/constants/theme';
import { getBusinessProfile, updateBusinessProfile } from '@/db';
import { useTheme } from '@/hooks/use-theme';
import { i18n, setLanguage, type SupportedLanguage } from '@/i18n';
import { useLanguageStore } from '@/i18n/language-store';
import { deleteBusinessLogo } from '@/lib/business-logo';
import { useAccentStore } from '@/theme/accent-store';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

/**
 * Business profile editor (Settings → Negocio): name, optional logo, accent,
 * currency and locale. Loads the single business row on mount and writes it
 * back with the existing `updateBusinessProfile` repository (which validates
 * locale and accent).
 *
 * Locale is a controlled field seeded from the persisted business row — it is
 * NOT derived from the live UI language, so saving a name/currency change never
 * silently rewrites the business locale. Applying the saved locale to i18n
 * (which keeps the UI and business locale in sync) happens only after a
 * successful write, alongside cleanup of the superseded logo file.
 */
export function BusinessProfileEditor() {
  const { t } = useTranslation();
  const theme = useTheme();

  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [name, setName] = useState('');
  const [logoUri, setLogoUri] = useState<string | null>(null);
  /** Logo currently persisted in SQLite; deleted only after a successful save. */
  const [persistedLogoUri, setPersistedLogoUri] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<BusinessLogoError | null>(null);
  const [currency, setCurrency] = useState<string>(resolveDefaultCurrency(null));
  const [locale, setLocale] = useState<SupportedLanguage>('es');
  const [accent, setAccent] = useState<Accent>(DEFAULT_ACCENT);
  const [nameError, setNameError] = useState(false);
  const [status, setStatus] = useState<SaveStatus>('idle');

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      try {
        const profile = await getBusinessProfile();
        if (cancelled) {
          return;
        }
        if (!profile) {
          setLoadFailed(true);
          return;
        }
        setName(profile.name);
        setLogoUri(profile.logoUri);
        setPersistedLogoUri(profile.logoUri);
        // Preserve the stored code verbatim (currency_code has no CHECK); the
        // selector simply highlights nothing if it is outside our short list.
        setCurrency(profile.currencyCode || resolveDefaultCurrency(null));
        setLocale(profile.locale);
        setAccent(profile.accentColor);
      } catch {
        if (!cancelled) {
          setLoadFailed(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSave(): Promise<void> {
    if (status === 'saving') {
      return;
    }
    if (name.trim().length === 0) {
      setNameError(true);
      setStatus('idle');
      return;
    }
    setNameError(false);
    setStatus('saving');
    try {
      await updateBusinessProfile({
        name: name.trim(),
        logoUri,
        currencyCode: currency,
        locale,
        accentColor: accent,
      });
      useAccentStore.getState().setAccent(accent);

      // Business locale and UI language are one control in v1: apply the saved
      // value so the running UI matches what was just persisted.
      if (i18n.language !== locale) {
        useLanguageStore.getState().setLanguage(locale);
        await setLanguage(locale);
      }

      // Clean up the superseded persisted logo only now that the write succeeded,
      // so an abandoned/failed save never leaves the row pointing at a deleted file.
      if (persistedLogoUri && persistedLogoUri !== logoUri) {
        deleteBusinessLogo(persistedLogoUri);
      }
      setPersistedLogoUri(logoUri);
      setStatus('saved');
    } catch {
      setStatus('error');
    }
  }

  if (loading) {
    return (
      <View style={styles.stateBox}>
        <ThemedText type="body2" themeColor="textSecondary">
          {t('business.loading')}
        </ThemedText>
      </View>
    );
  }

  if (loadFailed) {
    return (
      <View style={styles.stateBox}>
        <ThemedText type="body2" themeColor="danger">
          {t('common.status.error')}
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.fieldGroup}>
        <BusinessLogoPicker
          logoUri={logoUri}
          onChange={(uri) => {
            setLogoUri(uri);
            setLogoError(null);
            setStatus('idle');
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
        <ThemedText type="body2">{t('business.nameLabel')}</ThemedText>
        <TextInput
          value={name}
          onChangeText={(text) => {
            setName(text);
            setNameError(false);
            setStatus('idle');
          }}
          placeholder={t('business.namePlaceholder')}
          placeholderTextColor={theme.textSecondary}
          style={[
            styles.input,
            {
              color: theme.text,
              backgroundColor: theme.background,
              borderColor: nameError ? theme.danger : theme.border,
            },
          ]}
          textContentType="organizationName"
          accessibilityLabel={t('business.nameLabel')}
        />
        {nameError ? (
          <ThemedText type="body2" themeColor="danger">
            {t('business.nameRequired')}
          </ThemedText>
        ) : null}
      </View>

      <View style={styles.fieldGroup}>
        <ThemedText type="body2">{t('business.accentLabel')}</ThemedText>
        <ThemedView type="background" style={[styles.optionsBox, { borderColor: theme.border }]}>
          <AccentOptions
            value={accent}
            onChange={(next) => {
              setAccent(next);
              setStatus('idle');
            }}
          />
        </ThemedView>
      </View>

      <View style={styles.fieldGroup}>
        <ThemedView type="background" style={[styles.optionsBox, { borderColor: theme.border }]}>
          <CurrencySwitch
            value={currency}
            onChange={(next) => {
              setCurrency(next);
              setStatus('idle');
            }}
          />
        </ThemedView>
      </View>

      <View style={styles.fieldGroup}>
        <ThemedView type="background" style={[styles.optionsBox, { borderColor: theme.border }]}>
          <LanguageSwitch
            value={locale}
            onChange={(next) => {
              setLocale(next);
              setStatus('idle');
            }}
          />
        </ThemedView>
      </View>

      <View style={styles.footer}>
        {status === 'saved' ? (
          <ThemedText type="body2" themeColor="success">
            {t('business.saved')}
          </ThemedText>
        ) : null}
        {status === 'error' ? (
          <ThemedText type="body2" themeColor="danger">
            {t('business.saveFailed')}
          </ThemedText>
        ) : null}
        <PrimaryButton
          label={status === 'saving' ? t('business.savePending') : t('business.save')}
          icon="content-save-outline"
          disabled={status === 'saving'}
          onPress={() => {
            void handleSave();
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  stateBox: {
    padding: Spacing.three,
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
  footer: {
    gap: Spacing.two,
  },
});
