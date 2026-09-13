import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type DimensionValue,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from './themed-text';

import { Radius, Spacing, TouchTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type BottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  /** Optional element at the end of the header (before the close button). */
  headerAction?: ReactNode;
  children: ReactNode;
  /** Pinned footer below the scrollable body (e.g. a Charge button). */
  footer?: ReactNode;
  /** When false, children render in a plain view (host manages scrolling). */
  scroll?: boolean;
  /** Default '85%'. */
  maxHeight?: DimensionValue;
  testID?: string;
};

/**
 * Reusable bottom-anchored modal sheet (§8.1). Mirrors the SelectField modal
 * pattern: transparent slide-up `Modal`, tap-to-dismiss backdrop, top-rounded
 * sheet with a hairline border and safe-area-aware bottom padding. The body
 * scrolls; an optional footer stays pinned below it.
 */
export function BottomSheet({
  visible,
  onClose,
  title,
  headerAction,
  children,
  footer,
  scroll = true,
  maxHeight = '85%',
  testID,
}: BottomSheetProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const bottomInset = insets.bottom + Spacing.three;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}>
      <View style={styles.overlay} accessibilityViewIsModal>
        <Pressable
          testID={testID ? `${testID}-backdrop` : undefined}
          style={styles.backdrop}
          accessibilityRole="button"
          accessibilityLabel={t('common.actions.close')}
          onPress={onClose}
        />
        <View
          testID={testID}
          style={[
            styles.sheet,
            {
              maxHeight,
              backgroundColor: theme.background,
              borderColor: theme.border,
            },
          ]}>
          <View style={styles.sheetHeader}>
            <ThemedText type="heading2" numberOfLines={1} style={styles.title}>
              {title ?? ''}
            </ThemedText>
            {headerAction}
            <Pressable
              testID={testID ? `${testID}-close` : undefined}
              accessibilityRole="button"
              accessibilityLabel={t('common.actions.close')}
              onPress={onClose}
              style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={24} color={theme.textSecondary} />
            </Pressable>
          </View>

          {scroll ? (
            <ScrollView
              style={styles.body}
              contentContainerStyle={[
                styles.bodyContent,
                footer == null ? { paddingBottom: bottomInset } : null,
              ]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              {children}
            </ScrollView>
          ) : (
            <View style={[styles.body, styles.bodyContent]}>{children}</View>
          )}

          {footer != null ? (
            <View
              style={[
                styles.footer,
                {
                  borderTopColor: theme.border,
                  paddingBottom: bottomInset,
                },
              ]}>
              {footer}
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  title: {
    flex: 1,
  },
  closeButton: {
    minWidth: TouchTarget.min,
    minHeight: TouchTarget.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flexShrink: 1,
  },
  bodyContent: {
    paddingHorizontal: Spacing.three,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
  },
});
