import { View, type ViewProps } from 'react-native';

import type { ThemeColor } from '@/constants/theme';
import { useEffectiveColorScheme, useTheme } from '@/hooks/use-theme';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
  /** Background color token; defaults to the app background. */
  type?: ThemeColor;
};

/**
 * View with a themed background. `type` selects a semantic color token
 * (background, backgroundElement, backgroundSelected, ...); only background-ish
 * tokens are meaningful, but any ThemeColor is accepted for convenience.
 */
export function ThemedView({ style, lightColor, darkColor, type, ...otherProps }: ThemedViewProps) {
  const theme = useTheme();
  const scheme = useEffectiveColorScheme();

  const hasOverride = lightColor != null || darkColor != null;
  const backgroundColor = hasOverride
    ? scheme === 'dark'
      ? darkColor ?? lightColor ?? theme.background
      : lightColor ?? theme.background
    : theme[type ?? 'background'];

  return <View style={[{ backgroundColor }, style]} {...otherProps} />;
}
