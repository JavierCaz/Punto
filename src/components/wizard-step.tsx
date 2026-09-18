import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { PrimaryButton } from './primary-button';
import { Screen } from './screen';
import { SecondaryButton } from './secondary-button';
import { ThemedText } from './themed-text';
import { WizardProgress } from './wizard-progress';

import { Spacing } from '@/constants/theme';
import { WIZARD_STEP_COUNT, getWizardStep, type WizardStepId } from '@/constants/wizard';

export type WizardStepProps = {
  stepId: WizardStepId;
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Advance (or submit) the step. */
  onContinue: () => void;
  /** Optional back action; omitted on the first setup step (no earlier route). */
  onBack?: () => void;
  /** Optional skip action, rendered only for skippable steps. */
  onSkip?: () => void;
  /** Overrides the primary button label (defaults to "Continue"). */
  continueLabel?: string;
  continueDisabled?: boolean;
  busy?: boolean;
  testID?: string;
};

/**
 * Shared chrome for every wizard step (§5, one screen at a time): a segmented
 * progress bar, the step title/subtitle, a scrollable body and a fixed footer
 * with Continue plus optional Back/Skip. Keeps the guided flow visually
 * identical across the onboarding and setup route groups.
 */
export function WizardStep({
  stepId,
  title,
  subtitle,
  children,
  onContinue,
  onBack,
  onSkip,
  continueLabel,
  continueDisabled = false,
  busy = false,
  testID,
}: WizardStepProps) {
  const { t } = useTranslation();
  const step = getWizardStep(stepId);
  const showBack = onBack != null;
  const showSkip = onSkip != null && step.skippable;

  return (
    <Screen contentContainerStyle={styles.content}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        testID={testID}>
        <WizardProgress current={step.index} total={WIZARD_STEP_COUNT} />

        <View style={styles.header}>
          <ThemedText type="heading1">{title}</ThemedText>
          {subtitle ? (
            <ThemedText type="body2" themeColor="textSecondary">
              {subtitle}
            </ThemedText>
          ) : null}
        </View>

        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>

        <View style={styles.footer}>
          <PrimaryButton
            label={continueLabel ?? t('wizard.continue')}
            onPress={onContinue}
            disabled={continueDisabled || busy}
            testID="wizard-continue"
          />
          {showBack || showSkip ? (
            <View style={styles.secondaryRow}>
              {showBack ? (
                <SecondaryButton
                  label={t('common.actions.back')}
                  icon="arrow-left"
                  onPress={onBack}
                  disabled={busy}
                  style={styles.secondaryButton}
                  testID="wizard-back"
                />
              ) : null}
              {showSkip ? (
                <SecondaryButton
                  label={t('wizard.skip')}
                  icon="chevron-right"
                  onPress={onSkip}
                  disabled={busy}
                  style={styles.secondaryButton}
                  testID="wizard-skip"
                />
              ) : null}
            </View>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  root: {
    flex: 1,
    gap: Spacing.three,
  },
  header: {
    gap: Spacing.one,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    gap: Spacing.four,
    paddingBottom: Spacing.three,
  },
  footer: {
    gap: Spacing.two,
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  secondaryButton: {
    flex: 1,
  },
});
