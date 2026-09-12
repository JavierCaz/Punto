import { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type TextInputProps,
} from 'react-native';

import { ThemedText } from './themed-text';

import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type FormFieldProps = {
  label: string;
  accessibilityLabel: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  hint?: string;
  error?: string;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: NonNullable<TextInputProps['autoCapitalize']>;
  autoCorrect?: boolean;
  autoComplete?: NonNullable<TextInputProps['autoComplete']>;
  maxLength?: number;
  testID?: string;
};

/**
 * Labeled text input with a focus-driven primary border and a helper line
 * that shows either the validation error (danger) or a hint (secondary).
 * Extracted from the team add-employee form so every catalog form matches.
 */
export function FormField({
  label,
  accessibilityLabel,
  placeholder,
  value,
  onChangeText,
  hint,
  error,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  autoCorrect = true,
  autoComplete,
  maxLength,
  testID,
}: FormFieldProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);

  const helper = error ?? hint;

  return (
    <View style={styles.field}>
      <ThemedText type="body2" themeColor="textSecondary">
        {label}
      </ThemedText>
      <View
        style={[
          styles.inputBox,
          { backgroundColor: theme.background, borderColor: focused ? theme.primary : theme.border },
        ]}>
        <TextInput
          style={[styles.input, { color: theme.text }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.textSecondary}
          accessibilityLabel={accessibilityLabel}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          autoComplete={autoComplete}
          maxLength={maxLength}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          testID={testID}
        />
      </View>
      {helper ? (
        <ThemedText type="body2" themeColor={error ? 'danger' : 'textSecondary'}>
          {helper}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.two,
  },
  inputBox: {
    minHeight: 48,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    justifyContent: 'center',
  },
  input: {
    fontSize: Typography.body1.fontSize,
    lineHeight: Typography.body1.lineHeight,
    paddingVertical: 0,
  },
});
