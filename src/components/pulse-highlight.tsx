import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

export type PulseHighlightProps = {
  /** Increment to trigger a pulse. Mounting with a positive token also pulses. */
  token: number;
  color: string;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * Absolute-fill highlight that fades/scales in twice whenever `token` increases.
 * Sits behind its sibling content to signal that a counter just changed; the
 * host must clip it (`overflow: 'hidden'`).
 */
export function PulseHighlight({
  token,
  color,
  borderRadius = 0,
  style,
  testID,
}: PulseHighlightProps) {
  const [pulse] = useState(() => new Animated.Value(0));
  const previous = useRef(0);

  useEffect(() => {
    if (token > previous.current) {
      pulse.setValue(0);
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 180,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 220,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 180,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 220,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
    }
    previous.current = token;
  }, [token, pulse]);

  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0, 0.55] });
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] });

  return (
    <Animated.View
      pointerEvents="none"
      testID={testID}
      style={[
        StyleSheet.absoluteFill,
        { backgroundColor: color, borderRadius, opacity, transform: [{ scale }] },
        style,
      ]}
    />
  );
}
