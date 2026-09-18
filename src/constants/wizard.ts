import type { Href } from 'expo-router';

/**
 * Guided first-run setup steps, in dependency order.
 *
 * Steps 1–2 are the required identity steps rendered inside the `onboarding`
 * phase; steps 3–6 are the skippable data steps and step 7 closes the flow,
 * rendered by the `setup` route group once the business row exists.
 *
 * The list is the single source of truth for the progress bar (`index` is the
 * absolute 1-based position) and for skip eligibility, so both halves of the
 * wizard stay in sync without duplicating numbering.
 */
export type WizardStepId =
  | 'business'
  | 'account'
  | 'suppliers'
  | 'categories'
  | 'ingredients'
  | 'products'
  | 'finish';

export interface WizardStepDescriptor {
  id: WizardStepId;
  /** Absolute 1-based position, shown by the progress bar. */
  index: number;
  route: Href;
  /** Data steps can be skipped; the identity + finish steps cannot. */
  skippable: boolean;
}

export const WIZARD_STEPS: readonly WizardStepDescriptor[] = [
  { id: 'business', index: 1, route: '/onboarding', skippable: false },
  { id: 'account', index: 2, route: '/onboarding', skippable: false },
  { id: 'suppliers', index: 3, route: '/setup/suppliers', skippable: true },
  { id: 'categories', index: 4, route: '/setup/categories', skippable: true },
  { id: 'ingredients', index: 5, route: '/setup/ingredients', skippable: true },
  { id: 'products', index: 6, route: '/setup/products', skippable: true },
  { id: 'finish', index: 7, route: '/setup/finish', skippable: false },
];

export const WIZARD_STEP_COUNT = WIZARD_STEPS.length;

/** Look up a step descriptor, throwing on an unknown id (a programming error). */
export function getWizardStep(id: WizardStepId): WizardStepDescriptor {
  const step = WIZARD_STEPS.find((entry) => entry.id === id);
  if (!step) {
    throw new Error(`Unknown wizard step: ${id}`);
  }
  return step;
}

/** The step after `id`, or null when it is the last one. */
export function getNextWizardStep(id: WizardStepId): WizardStepDescriptor | null {
  const position = WIZARD_STEPS.findIndex((entry) => entry.id === id);
  return position >= 0 ? WIZARD_STEPS[position + 1] ?? null : null;
}

/** The step before `id`, or null when it is the first one. */
export function getPreviousWizardStep(id: WizardStepId): WizardStepDescriptor | null {
  const position = WIZARD_STEPS.findIndex((entry) => entry.id === id);
  return position > 0 ? WIZARD_STEPS[position - 1] : null;
}
