import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

import { PrimaryButton } from './primary-button';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type MaterialIconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export type EmptyStateProps = {
  icon: MaterialIconName;
  title: string;
  message?: string;
  actionLabel?: string;
  onActionPress?: () => void;
};

/**
 * Intentional empty-state block: soft icon tile, title, optional message and
 * an optional primary action. Used by POS / Sales / Inventory until real data
 * exists.
 */
export function EmptyState({ icon, title, message, actionLabel, onActionPress }: EmptyStateProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <ThemedView
        type="backgroundSelected"
        style={[styles.iconTile, { borderColor: theme.backgroundSelected }]}>
        <MaterialCommunityIcons name={icon} size={32} color={theme.primary} />
      </ThemedView>

      <ThemedText type="heading2" style={styles.title}>
        {title}
      </ThemedText>

      {message ? (
        <ThemedText type="body2" themeColor="textSecondary" style={styles.message}>
          {message}
        </ThemedText>
      ) : null}

      {actionLabel && onActionPress ? (
        <PrimaryButton label={actionLabel} onPress={onActionPress} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 360,
    alignSelf: 'center',
    paddingVertical: Spacing.five,
    gap: Spacing.three,
  },
  iconTile: {
    width: 72,
    height: 72,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  title: {
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
  },
});
