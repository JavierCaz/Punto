import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { FormField } from './form-field';
import { PrimaryButton } from './primary-button';
import { SecondaryButton } from './secondary-button';
import { ThemedText } from './themed-text';

import { Spacing } from '@/constants/theme';
import type { Category } from '@/db';

export type CategoryFormProps = {
  initialCategory: Category | null;
  submitting: boolean;
  submitError?: string | null;
  onSave: (name: string) => void;
  onDelete?: () => void;
};

/** Create/edit form for a single category: a name and an optional delete. */
export function CategoryForm({
  initialCategory,
  submitting,
  submitError,
  onSave,
  onDelete,
}: CategoryFormProps) {
  const { t } = useTranslation();

  const savingRef = useRef(false);

  useEffect(() => {
    if (!submitting) {
      savingRef.current = false;
    }
  }, [submitting]);
  const [name, setName] = useState(initialCategory?.name ?? '');
  const [nameError, setNameError] = useState(false);

  const handleSave = (): void => {
    if (savingRef.current || submitting) {
      return;
    }
    savingRef.current = true;
    if (name.trim().length === 0) {
      setNameError(true);
      savingRef.current = false;
      return;
    }
    setNameError(false);
    onSave(name.trim());
  };

  return (
    <View style={styles.container}>
      <FormField
        label={t('categories.form.nameLabel')}
        accessibilityLabel={t('categories.form.nameLabel')}
        placeholder={t('categories.form.namePlaceholder')}
        value={name}
        onChangeText={(value) => {
          setName(value);
          setNameError(false);
        }}
        autoCapitalize="sentences"
        error={nameError ? t('categories.form.nameRequired') : undefined}
        testID="category-name"
      />

      {submitError ? (
        <ThemedText type="body2" themeColor="danger">
          {submitError}
        </ThemedText>
      ) : null}

      <PrimaryButton
        label={submitting ? t('categories.form.savePending') : t('categories.form.save')}
        icon="content-save-outline"
        disabled={submitting}
        onPress={handleSave}
      />

      {onDelete ? (
        <SecondaryButton
          label={t('categories.form.delete')}
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
