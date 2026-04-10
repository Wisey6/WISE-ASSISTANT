import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import { colors, radius } from '@/theme';

interface Props {
  /** 0..1 */
  value: number;
  height?: number;
  color?: string;
  track?: string;
}

/**
 * Animated progress bar. Fills smoothly when `value` changes so the
 * dashboard feels alive without being noisy.
 */
export const ProgressBar: React.FC<Props> = ({
  value,
  height = 8,
  color = colors.text,
  track = colors.surfaceMuted,
}) => {
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withTiming(Math.max(0, Math.min(1, value)), {
      duration: 550,
      easing: Easing.out(Easing.cubic),
    });
  }, [value, width]);

  const animated = useAnimatedStyle(() => ({
    width: `${width.value * 100}%`,
  }));

  return (
    <View style={[styles.track, { height, backgroundColor: track }]}>
      <Animated.View
        style={[styles.fill, { height, backgroundColor: color }, animated]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: radius.pill,
  },
});
