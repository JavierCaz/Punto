import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';

import { Fonts, Radius, Spacing, TouchTarget } from '@/constants/theme';
import type { Product } from '@/db';
import { useTheme } from '@/hooks/use-theme';
import { formatMoney } from '@/i18n/format';

export type ProductCardProps = {
  product: Product;
  categoryName: string | null;
  currency: string;
  hasRecipe: boolean;
  variant: 'list' | 'grid';
  onPress?: () => void;
};

/**
 * Catalog product card shared by the Products screen (tappable → edit) and
 * the POS catalog (informational until the cart flow lands). Renders as a
 * plain View when `onPress` is omitted.
 */
export function ProductCard({
  product,
  categoryName,
  currency,
  hasRecipe,
  variant,
  onPress,
}: ProductCardProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const isGrid = variant === 'grid';

  const status = !product.isActive
    ? { label: t('products.card.inactive'), color: theme.textSecondary }
    : product.inventoryItemId != null
      ? { label: t('products.card.tracked'), color: theme.success }
      : hasRecipe
        ? { label: t('products.card.recipe'), color: theme.primary }
        : { label: t('products.card.untracked'), color: theme.textSecondary };

  const content = (
    <>
      <View
        style={[
          styles.thumb,
          isGrid ? styles.thumbGrid : styles.thumbList,
          { backgroundColor: theme.backgroundSelected },
        ]}>
        {product.imageUri ? (
          <Image source={{ uri: product.imageUri }} style={styles.thumbImage} contentFit="cover" />
        ) : (
          <MaterialCommunityIcons name="silverware-fork-knife" size={24} color={theme.primary} />
        )}
      </View>

      <View style={styles.cardBody}>
        <ThemedText type="body1" numberOfLines={1}>
          {product.name}
        </ThemedText>
        <ThemedText type="body2" themeColor="textSecondary" numberOfLines={1}>
          {categoryName ?? t('products.uncategorized')}
        </ThemedText>
        <View style={styles.cardMeta}>
          <ThemedText type="body1" style={styles.price}>
            {formatMoney(product.priceMinor, currency)}
          </ThemedText>
          <ThemedText type="micro" style={{ color: status.color }}>
            {status.label}
          </ThemedText>
        </View>
      </View>
    </>
  );

  const cardStyle = [
    styles.card,
    isGrid ? styles.cardGrid : styles.cardList,
    { backgroundColor: theme.backgroundElement, borderColor: theme.border },
  ];

  if (!onPress) {
    return (
      <View testID={`product-card-${product.id}`} style={cardStyle}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      testID={`product-card-${product.id}`}
      style={({ pressed }) => [...cardStyle, pressed && styles.pressed]}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  cardList: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.two,
  },
  cardGrid: {
    flex: 1,
    padding: Spacing.two,
  },
  thumb: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  thumbList: {
    width: TouchTarget.action,
    height: TouchTarget.action,
  },
  thumbGrid: {
    width: '100%',
    height: 96,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  cardBody: {
    flex: 1,
    gap: Spacing.half,
    padding: Spacing.one,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  price: {
    fontFamily: Fonts.mono,
  },
  pressed: {
    opacity: 0.8,
  },
});
