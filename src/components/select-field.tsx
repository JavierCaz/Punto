import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { MaterialIconName } from './empty-state';
import { OptionRow } from './option-row';
import { ThemedText } from './themed-text';

import { Radius, Spacing, TouchTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type SelectFieldItem = {
  value: string;
  label: string;
  icon?: MaterialIconName;
};

export type SelectFieldProps = {
  items: SelectFieldItem[];
  value: string | null;
  onChange: (value: string | null) => void;
  /** Field label; also used as the sheet title. Omit for an unlabeled inline selector. */
  label?: string;
  /** When provided, prepends a row that clears the selection. */
  noneLabel?: string;
  /** Trigger text when no value is selected and there is no `noneLabel`. */
  placeholder?: string;
  hint?: string;
  error?: string;
  /** Screen-reader label for the trigger; defaults to `label`. */
  accessibilityLabel?: string;
  testIDPrefix?: string;
};

/**
 * Single-select dropdown (§5.1): the trigger mirrors `FormField` and opens a
 * full-width bottom sheet of `OptionRow`s (§8.1). Replaces the always-visible
 * radio card for option lists that can grow (categories, suppliers, inventory
 * items, units), so the form no longer grows with every new option.
 */
export function SelectField({
  items,
  value,
  onChange,
  label,
  noneLabel,
  placeholder,
  hint,
  error,
  accessibilityLabel,
  testIDPrefix,
}: SelectFieldProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  const options: SelectFieldItem[] = [
    ...(noneLabel != null ? [{ value: '', label: noneLabel }] : []),
    ...items,
  ];

  const selected = value == null ? null : (items.find((item) => item.value === value) ?? null);
  const displayLabel = selected?.label ?? noneLabel ?? placeholder ?? '';
  const helper = error ?? hint;

  const close = (): void => setOpen(false);

  const handleSelect = (next: string): void => {
    onChange(next === '' ? null : next);
    close();
  };

  return (
    <View style={styles.field}>
      {label != null ? (
        <ThemedText type="body2" themeColor="textSecondary">
          {label}
        </ThemedText>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ expanded: open }}
        testID={testIDPrefix ? `${testIDPrefix}-trigger` : undefined}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.trigger,
          {
            backgroundColor: theme.background,
            borderColor: error != null ? theme.danger : pressed ? theme.primary : theme.border,
          },
        ]}>
        <ThemedText
          type="body1"
          themeColor={selected != null ? 'text' : 'textSecondary'}
          numberOfLines={1}
          style={styles.triggerLabel}>
          {displayLabel}
        </ThemedText>
        <MaterialCommunityIcons name="chevron-down" size={22} color={theme.textSecondary} />
      </Pressable>

      {helper != null ? (
        <ThemedText type="body2" themeColor={error != null ? 'danger' : 'textSecondary'}>
          {helper}
        </ThemedText>
      ) : null}

      <Modal
        visible={open}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={close}>
        <View style={styles.overlay} accessibilityViewIsModal>
          <Pressable
            style={styles.backdrop}
            accessibilityRole="button"
            accessibilityLabel={t('common.actions.close')}
            onPress={close}
          />
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: theme.background,
                borderColor: theme.border,
                paddingBottom: insets.bottom + Spacing.three,
              },
            ]}>
            <View style={styles.sheetHeader}>
              <ThemedText type="heading2">{label ?? t('common.actions.select')}</ThemedText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('common.actions.close')}
                onPress={close}
                style={styles.closeButton}>
                <MaterialCommunityIcons name="close" size={24} color={theme.textSecondary} />
              </Pressable>
            </View>

            <ScrollView
              accessibilityRole="radiogroup"
              style={styles.options}
              contentContainerStyle={styles.optionsContent}
              showsVerticalScrollIndicator={false}>
              {options.map((option, index) => (
                <OptionRow
                  key={option.value === '' ? '__none__' : option.value}
                  icon={option.icon}
                  label={option.label}
                  selected={(option.value === '' ? null : option.value) === value}
                  onPress={() => handleSelect(option.value)}
                  divided={index < options.length - 1}
                  testID={testIDPrefix ? `${testIDPrefix}-${option.value || 'none'}` : undefined}
                />
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.two,
  },
  trigger: {
    minHeight: TouchTarget.min,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
  },
  triggerLabel: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  sheet: {
    maxHeight: '75%',
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  options: {
    flexShrink: 1,
  },
  closeButton: {
    minWidth: TouchTarget.min,
    minHeight: TouchTarget.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionsContent: {
    paddingBottom: Spacing.two,
  },
});
