import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { SecondaryButton } from './secondary-button';
import { ThemedText } from './themed-text';

import { Radius, Spacing, TouchTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { pickBusinessLogo } from '@/lib/business-logo';

export type BusinessLogoError = 'permission-denied' | 'failed';

export type BusinessLogoPickerProps = {
  /** Persisted logo URI, or null when the business has no logo yet. */
  logoUri: string | null;
  /** Fired with the new durable URI, or null when the logo is removed. */
  onChange: (uri: string | null) => void;
  /** Surfaces picker failures so the caller can render an i18n message. */
  onError?: (error: BusinessLogoError) => void;
};

/**
 * Optional business-logo control: a tappable avatar (placeholder until set),
 * plus add/change and remove actions. Picking is delegated to `@/lib/business-logo`,
 * which copies the selection into durable app storage before returning the URI.
 */
export function BusinessLogoPicker({ logoUri, onChange, onError }: BusinessLogoPickerProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [picking, setPicking] = useState(false);

  async function handlePick(): Promise<void> {
    if (picking) {
      return;
    }
    setPicking(true);
    try {
      const result = await pickBusinessLogo();
      if (result.status === 'picked') {
        // Deletion of a superseded logo is the caller's responsibility, so a
        // failed/abandoned save never leaves the persisted row pointing at a
        // file that was already removed.
        onChange(result.uri);
      } else if (result.status === 'permission-denied') {
        onError?.('permission-denied');
      }
    } catch {
      onError?.('failed');
    } finally {
      setPicking(false);
    }
  }

  function handleRemove(): void {
    onChange(null);
  }

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={logoUri ? t('business.logoChange') : t('business.logoAdd')}
        disabled={picking}
        onPress={() => {
          void handlePick();
        }}
        testID="business-logo-avatar"
        style={[styles.avatar, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        {logoUri ? (
          <Image source={{ uri: logoUri }} style={styles.avatarImage} contentFit="cover" />
        ) : (
          <MaterialCommunityIcons name="storefront-outline" size={28} color={theme.textSecondary} />
        )}
      </Pressable>

      <View style={styles.body}>
        <ThemedText type="body1">{t('business.logoLabel')}</ThemedText>
        <ThemedText type="body2" themeColor="textSecondary">
          {t('business.logoHint')}
        </ThemedText>

        <View style={styles.actions}>
          <SecondaryButton
            label={logoUri ? t('business.logoChange') : t('business.logoAdd')}
            icon="image-outline"
            disabled={picking}
            onPress={() => {
              void handlePick();
            }}
            style={styles.actionButton}
          />
          {logoUri ? (
            <SecondaryButton
              label={t('business.logoRemove')}
              icon="trash-can-outline"
              disabled={picking}
              onPress={handleRemove}
              style={styles.actionButton}
            />
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  avatar: {
    width: TouchTarget.action,
    height: TouchTarget.action,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  body: {
    flex: 1,
    gap: Spacing.one,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  actionButton: {
    minHeight: TouchTarget.min,
  },
});
