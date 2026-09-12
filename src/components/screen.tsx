import type { ReactNode } from 'react';
import { Platform, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MaxContentWidth, Spacing, TouchTarget } from '@/constants/theme';
import { ThemedView } from './themed-view';

/**
 * Height reserved for the floating web tab bar (src/components/app-tabs.web.tsx):
 * container padding (Spacing.three) + pill height (Spacing.one × 2 + TouchTarget.min)
 * + a breathing margin (Spacing.two × 2).
 */
const WEB_TAB_BAR_CLEARANCE =
  Spacing.three + Spacing.one * 2 + TouchTarget.min + Spacing.two * 2;

export type ScreenProps = {
  children: ReactNode;
  /** Render content in a vertical ScrollView instead of a plain View. */
  scroll?: boolean;
  /** Reserve top clearance for the floating web tab bar (tab screens only). */
  underWebTabBar?: boolean;
  /** Set when a native stack header is shown, so the top inset is not applied twice. */
  header?: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
};

/**
 * Safe-area-aware, theme-background screen wrapper. Content is constrained to
 * MaxContentWidth and centered so wide (tablet/desktop) layouts keep readable
 * line lengths. Every Punto screen renders through this primitive.
 */
export function Screen({
  children,
  scroll = false,
  underWebTabBar = false,
  header = false,
  style,
  contentContainerStyle,
}: ScreenProps) {
  const insets = useSafeAreaInsets();

  const topPad =
    Platform.OS === 'web' && underWebTabBar
      ? WEB_TAB_BAR_CLEARANCE
      : header
        ? 0
        : insets.top;

  const contentStyle = [
    styles.content,
    {
      paddingTop: topPad + Spacing.three,
      paddingBottom: insets.bottom + Spacing.four,
    },
    contentContainerStyle,
  ];

  return (
    <ThemedView type="background" style={[styles.root, style]}>
      {scroll ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={contentStyle}
          showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      ) : (
        <View style={contentStyle}>{children}</View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    flexGrow: 1,
    paddingHorizontal: Spacing.three,
  },
});
