import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { SecondaryButton } from './secondary-button';
import { ThemedText } from './themed-text';

import { Radius, Spacing, TouchTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { pickProductImage } from '@/lib/product-image';

export type ProductImageError = 'permission-denied' | 'failed';

export type ProductImagePickerProps = {
  /** Persisted image URI, or null when the product has no image yet. */
  imageUri: string | null;
  /** Fired with the new durable URI, or null when the image is removed. */
  onChange: (uri: string | null) => void;
  /** Surfaces picker failures so the caller can render an i18n message. */
  onError?: (error: ProductImageError) => void;
};

/**
 * Optional product-image control: a tappable square (placeholder until set),
 * plus add/change and remove actions. Picking is delegated to
 * `@/lib/product-image`, which copies the selection into durable app storage
 * before returning the URI. Rendered with `expo-image`.
 */
export function ProductImagePicker({ imageUri, onChange, onError }: ProductImagePickerProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [picking, setPicking] = useState(false);

  async function handlePick(): Promise<void> {
    if (picking) {
      return;
    }
    setPicking(true);
    try {
      const result = await pickProductImage();
      if (result.status === 'picked') {
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

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={imageUri ? t('products.form.imageChange') : t('products.form.imageAdd')}
        disabled={picking}
        onPress={() => {
          void handlePick();
        }}
        testID="product-image-avatar"
        style={[
          styles.avatar,
          { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        ]}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.avatarImage} contentFit="cover" />
        ) : (
          <MaterialCommunityIcons name="silverware-fork-knife" size={28} color={theme.textSecondary} />
        )}
      </Pressable>

      <View style={styles.body}>
        <ThemedText type="body1">{t('products.form.imageLabel')}</ThemedText>
        <ThemedText type="body2" themeColor="textSecondary">
          {t('products.form.imageHint')}
        </ThemedText>

        <View style={styles.actions}>
          <SecondaryButton
            label={imageUri ? t('products.form.imageChange') : t('products.form.imageAdd')}
            icon="image-outline"
            disabled={picking}
            onPress={() => {
              void handlePick();
            }}
            style={styles.actionButton}
          />
          {imageUri ? (
            <SecondaryButton
              label={t('products.form.imageRemove')}
              icon="trash-can-outline"
              disabled={picking}
              onPress={() => onChange(null)}
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
