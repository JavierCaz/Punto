import { StyleSheet, Text, type TextProps, type StyleProp, type TextStyle } from 'react-native';

import { Fonts, ThemeColor, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  /** §7.3 type-scale style; legacy template names map onto the scale. */
  type?:
    | 'default'
    | 'title'
    | 'subtitle'
    | 'small'
    | 'smallBold'
    | 'link'
    | 'linkPrimary'
    | 'code'
    | 'display'
    | 'heading1'
    | 'heading2'
    | 'body1'
    | 'body2'
    | 'micro'
    | 'badge';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();
  const color = type === 'linkPrimary' ? theme.primary : theme[themeColor ?? 'text'];

  return <Text style={[{ color }, typeStyle[type], style]} {...rest} />;
}

const styles = StyleSheet.create({
  display: Typography.display,
  heading1: Typography.heading1,
  heading2: Typography.heading2,
  body1: Typography.body1,
  body2: Typography.body2,
  micro: Typography.micro,
  badge: Typography.micro,
  /** Semi-bold body-2, used for emphasis inside labels/captions. */
  body2SemiBold: {
    fontSize: Typography.body2.fontSize,
    fontWeight: '600',
    lineHeight: Typography.body2.lineHeight,
  },
  link: {
    fontSize: Typography.body2.fontSize,
    lineHeight: Typography.body2.lineHeight,
  },
  code: {
    fontFamily: Fonts.mono,
    fontSize: Typography.micro.fontSize,
    fontWeight: '500',
    lineHeight: Typography.micro.lineHeight,
  },
});

type ThemedTextType = NonNullable<ThemedTextProps['type']>;

const typeStyle: Record<ThemedTextType, StyleProp<TextStyle>> = {
  // Semantic §7.3 names.
  display: styles.display,
  heading1: styles.heading1,
  heading2: styles.heading2,
  body1: styles.body1,
  body2: styles.body2,
  micro: styles.micro,
  badge: styles.badge,
  link: styles.link,
  linkPrimary: styles.link,
  code: styles.code,
  // Legacy template aliases.
  default: styles.body1,
  title: styles.heading1,
  subtitle: styles.heading2,
  small: styles.body2,
  smallBold: styles.body2SemiBold,
};
