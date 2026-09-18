import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type WizardProgressProps = {
  /** 1-based position of the current step. */
  current: number;
  /** Total number of steps in the wizard. */
  total: number;
};

/**
 * Segmented step progress for the guided setup wizard: a filled track plus a
 * "Step X of N" label. Exposed as an accessibility progress bar so screen
 * readers announce the same progress the segments show visually.
 */
export function WizardProgress({ current, total }: WizardProgressProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const clamped = Math.min(Math.max(current, 1), total);

  return (
    <View
      style={styles.container}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 1, max: total, now: clamped }}
      testID="wizard-progress">
      <View style={styles.track}>
        {Array.from({ length: total }, (_, index) => {
          const step = index + 1;
          return (
            <View
              key={step}
              style={[
                styles.segment,
                { backgroundColor: step <= clamped ? theme.primary : theme.border },
              ]}
            />
          );
        })}
      </View>
      <ThemedText type="micro" themeColor="textSecondary">
        {t('wizard.progress', { current: clamped, total })}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.one,
  },
  track: {
    flexDirection: 'row',
    gap: Spacing.half,
    height: 6,
  },
  segment: {
    flex: 1,
    borderRadius: Radius.sm,
  },
});
