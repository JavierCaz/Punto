import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { FormField } from './form-field';
import { PrimaryButton } from './primary-button';
import { SecondaryButton } from './secondary-button';
import { ThemedText } from './themed-text';

import { Spacing } from '@/constants/theme';
import type { Supplier } from '@/db';

/** Trimmed, presentation-agnostic values handed to the caller on save. */
export type SupplierFormValues = {
  name: string;
  businessName: string;
  phone: string;
  email: string;
  taxId: string;
  notes: string;
};

export type SupplierFormProps = {
  initialSupplier: Supplier | null;
  submitting: boolean;
  submitError?: string | null;
  onSave: (values: SupplierFormValues) => void;
  onDelete?: () => void;
};

/**
 * Create/edit form for a single supplier: a required name plus optional
 * contact details. Validation is intentionally light (name required) and
 * errors are revealed only after a submit attempt (§5.3 progressive disclosure).
 */
export function SupplierForm({
  initialSupplier,
  submitting,
  submitError,
  onSave,
  onDelete,
}: SupplierFormProps) {
  const { t } = useTranslation();

  const savingRef = useRef(false);

  useEffect(() => {
    if (!submitting) {
      savingRef.current = false;
    }
  }, [submitting]);

  const [name, setName] = useState(initialSupplier?.name ?? '');
  const [businessName, setBusinessName] = useState(initialSupplier?.businessName ?? '');
  const [phone, setPhone] = useState(initialSupplier?.phone ?? '');
  const [email, setEmail] = useState(initialSupplier?.email ?? '');
  const [taxId, setTaxId] = useState(initialSupplier?.taxId ?? '');
  const [notes, setNotes] = useState(initialSupplier?.notes ?? '');
  const [submitted, setSubmitted] = useState(false);

  const nameError = submitted && name.trim().length === 0;

  const handleSave = (): void => {
    if (savingRef.current || submitting) {
      return;
    }
    savingRef.current = true;
    setSubmitted(true);
    if (name.trim().length === 0) {
      savingRef.current = false;
      return;
    }
    onSave({
      name: name.trim(),
      businessName: businessName.trim(),
      phone: phone.trim(),
      email: email.trim(),
      taxId: taxId.trim(),
      notes: notes.trim(),
    });
  };

  return (
    <View style={styles.container}>
      <FormField
        label={t('suppliers.form.nameLabel')}
        accessibilityLabel={t('suppliers.form.nameLabel')}
        placeholder={t('suppliers.form.namePlaceholder')}
        value={name}
        onChangeText={setName}
        autoCapitalize="sentences"
        error={nameError ? t('suppliers.form.nameRequired') : undefined}
        testID="supplier-name"
      />

      <FormField
        label={t('suppliers.form.businessNameLabel')}
        accessibilityLabel={t('suppliers.form.businessNameLabel')}
        placeholder={t('suppliers.form.businessNamePlaceholder')}
        value={businessName}
        onChangeText={setBusinessName}
        autoCapitalize="sentences"
        testID="supplier-business-name"
      />

      <FormField
        label={t('suppliers.form.phoneLabel')}
        accessibilityLabel={t('suppliers.form.phoneLabel')}
        placeholder={t('suppliers.form.phonePlaceholder')}
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        testID="supplier-phone"
      />

      <FormField
        label={t('suppliers.form.emailLabel')}
        accessibilityLabel={t('suppliers.form.emailLabel')}
        placeholder={t('suppliers.form.emailPlaceholder')}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        testID="supplier-email"
      />

      <FormField
        label={t('suppliers.form.taxIdLabel')}
        accessibilityLabel={t('suppliers.form.taxIdLabel')}
        placeholder={t('suppliers.form.taxIdPlaceholder')}
        value={taxId}
        onChangeText={setTaxId}
        autoCapitalize="characters"
        autoCorrect={false}
        testID="supplier-tax-id"
      />

      <FormField
        label={t('suppliers.form.notesLabel')}
        accessibilityLabel={t('suppliers.form.notesLabel')}
        placeholder={t('suppliers.form.notesPlaceholder')}
        value={notes}
        onChangeText={setNotes}
        autoCapitalize="sentences"
        testID="supplier-notes"
      />

      {submitError ? (
        <ThemedText type="body2" themeColor="danger">
          {submitError}
        </ThemedText>
      ) : null}

      <PrimaryButton
        label={submitting ? t('suppliers.form.savePending') : t('suppliers.form.save')}
        icon="content-save-outline"
        disabled={submitting}
        onPress={handleSave}
      />

      {onDelete ? (
        <SecondaryButton
          label={t('suppliers.form.delete')}
          icon="trash-can-outline"
          disabled={submitting}
          onPress={onDelete}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.four,
  },
});
