import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import type { MaterialIconName } from './empty-state';
import { PrimaryButton, type PrimaryButtonTone } from './primary-button';
import { SecondaryButton } from './secondary-button';
import { ThemedText } from './themed-text';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Semantic intent of a dialog; drives the icon and its accent color. */
export type DialogTone = 'info' | 'success' | 'warning' | 'danger';

const TONE_ICONS: Record<DialogTone, MaterialIconName> = {
  info: 'information-outline',
  success: 'check-circle-outline',
  warning: 'alert-outline',
  danger: 'alert-circle-outline',
};

export type AppDialogProps = {
  visible: boolean;
  /** Visual intent. Defaults to 'info'. */
  tone?: DialogTone;
  title?: string;
  message?: string;
  /** Label + handler for the leading (confirm/acknowledge) button. */
  primaryLabel: string;
  onPrimaryPress: () => void;
  /** Emphasis of the primary button. Use 'danger' for destructive actions. */
  primaryTone?: PrimaryButtonTone;
  /** When provided, renders a secondary (cancel) button beside the primary one. */
  secondaryLabel?: string;
  onSecondaryPress?: () => void;
  /** Backdrop / Android-back dismissal. Omit to make the dialog non-dismissible. */
  onDismiss?: () => void;
  testID?: string;
};

/**
 * Custom modal dialog used for every confirmation and system message in Punto
 * (§5, §7). A centered card built exclusively from design tokens — hairline
 * border instead of heavy elevation, radius-lg per §7.4 — so it reads as part
 * of the app rather than a native OS alert. Backdrop and Android back both
 * dismiss via `onDismiss`.
 */
export function AppDialog({
  visible,
  tone = 'info',
  title,
  message,
  primaryLabel,
  onPrimaryPress,
  primaryTone = 'primary',
  secondaryLabel,
  onSecondaryPress,
  onDismiss,
  testID,
}: AppDialogProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  const toneColor =
    tone === 'success'
      ? theme.success
      : tone === 'warning'
        ? theme.warning
        : tone === 'danger'
          ? theme.danger
          : theme.primary;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDismiss}>
      <View style={styles.overlay} accessibilityViewIsModal>
        <Pressable
          testID={testID ? `${testID}-backdrop` : undefined}
          style={styles.backdrop}
          accessibilityRole="button"
          accessibilityLabel={t('common.actions.close')}
          onPress={onDismiss}
        />

        <View
          testID={testID}
          style={[styles.card, { backgroundColor: theme.background, borderColor: theme.border }]}>
          <View style={styles.header}>
            <View
              style={[
                styles.iconTile,
                { backgroundColor: theme.backgroundElement, borderColor: theme.border },
              ]}>
              <MaterialCommunityIcons name={TONE_ICONS[tone]} size={24} color={toneColor} />
            </View>

            {title != null ? (
              <ThemedText type="heading2" accessibilityRole="header" style={styles.title}>
                {title}
              </ThemedText>
            ) : null}
          </View>

          {message != null ? (
            <ThemedText type="body1" themeColor="textSecondary">
              {message}
            </ThemedText>
          ) : null}

          <View style={styles.actions}>
            {secondaryLabel != null ? (
              <SecondaryButton
                label={secondaryLabel}
                onPress={onSecondaryPress ?? onDismiss ?? onPrimaryPress}
                style={styles.action}
                testID={testID ? `${testID}-cancel` : undefined}
              />
            ) : null}
            <PrimaryButton
              label={primaryLabel}
              tone={primaryTone}
              onPress={onPrimaryPress}
              style={styles.action}
              testID={testID ? `${testID}-confirm` : undefined}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.three,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  iconTile: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  action: {
    flex: 1,
  },
});
