import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from './themed-text';

import { Radius, Spacing, TouchTarget, Typography } from '@/constants/theme';
import type { Category } from '@/db';
import { useTheme } from '@/hooks/use-theme';

export type CatalogFilterBarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  categories: Category[];
  selectedCategoryId: string | null;
  onCategoryChange: (categoryId: string | null) => void;
  searchPlaceholder: string;
  searchTestID?: string;
};

/** Search field + horizontal category chips shared by the catalog screens. */
export function CatalogFilterBar({
  search,
  onSearchChange,
  categories,
  selectedCategoryId,
  onCategoryChange,
  searchPlaceholder,
  searchTestID,
}: CatalogFilterBarProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  const renderChip = (label: string, selected: boolean, onPress: () => void, key: string) => (
    <Pressable
      key={key}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.chip,
        selected
          ? { backgroundColor: theme.backgroundSelected, borderColor: theme.backgroundSelected }
          : { backgroundColor: theme.backgroundElement, borderColor: theme.border },
      ]}>
      <ThemedText type="body2" themeColor={selected ? 'primary' : 'textSecondary'}>
        {label}
      </ThemedText>
    </Pressable>
  );

  return (
    <>
      <View
        style={[
          styles.searchBox,
          { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        ]}>
        <MaterialCommunityIcons name="magnify" size={20} color={theme.textSecondary} />
        <TextInput
          value={search}
          onChangeText={onSearchChange}
          placeholder={searchPlaceholder}
          placeholderTextColor={theme.textSecondary}
          style={[styles.searchInput, { color: theme.text }]}
          accessibilityLabel={searchPlaceholder}
          testID={searchTestID}
        />
      </View>

      {categories.length > 0 ? (
        <ScrollView
          horizontal
          style={styles.chipsScroll}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}>
          {renderChip(
            t('products.allCategories'),
            selectedCategoryId === null,
            () => onCategoryChange(null),
            '__all__',
          )}
          {categories.map((category) =>
            renderChip(
              category.name,
              selectedCategoryId === category.id,
              () => onCategoryChange(category.id),
              category.id,
            ),
          )}
        </ScrollView>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    minHeight: TouchTarget.min,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.body1.fontSize,
    lineHeight: Typography.body1.lineHeight,
    paddingVertical: 0,
  },
  chipsScroll: {
    flexGrow: 0,
    flexShrink: 0,
  },
  chips: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingRight: Spacing.three,
  },
  chip: {
    height: 36,
    justifyContent: 'center',
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
  },
});
