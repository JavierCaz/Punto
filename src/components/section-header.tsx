import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { ThemedText } from './themed-text';

export type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  /** Optional trailing element rendered on the right (an action, count, …). */
  action?: ReactNode;
};

/**
 * Screen/section title row. Use `level="page"` for a top-of-screen title and
 * `level="section"` for smaller section labels inside a screen.
 */
export function SectionHeader({
  title,
  subtitle,
  action,
  level = 'page',
}: SectionHeaderProps & { level?: 'page' | 'section' }) {
  return (
    <View style={styles.row}>
      <View style={styles.titles}>
        <ThemedText type={level === 'page' ? 'heading1' : 'heading2'}>{title}</ThemedText>
        {subtitle ? (
          <ThemedText type="body2" themeColor="textSecondary">
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  titles: {
    flex: 1,
    gap: Spacing.one,
  },
});
