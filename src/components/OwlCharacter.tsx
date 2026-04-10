import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path, G, Rect } from 'react-native-svg';

import { colors } from '@/theme';

const AnimatedG = Animated.createAnimatedComponent(G);

interface Props {
  size?: number;
  /** 'idle' | 'listening' | 'thinking' */
  state?: 'idle' | 'listening' | 'thinking';
}

/**
 * An 8-bit-style owl rendered with SVG primitives so we don't need
 * to bundle pixel art. Three subtle animations:
 *
 *   • idle: gentle vertical bob + occasional blink
 *   • listening: slower bob, eyes stay open (tracking you)
 *   • thinking: head tilts side to side
 *
 * Reanimated drives everything on the UI thread, so it stays smooth
 * while the JS thread is busy parsing tasks.
 */
export const OwlCharacter: React.FC<Props> = ({ size = 180, state = 'idle' }) => {
  const bob = useSharedValue(0);
  const blink = useSharedValue(1);
  const tilt = useSharedValue(0);

  useEffect(() => {
    // Bobbing
    const bobDuration = state === 'listening' ? 1600 : 1200;
    bob.value = withRepeat(
      withSequence(
        withTiming(-4, { duration: bobDuration, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: bobDuration, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );

    // Blinking — long open, quick close, only when idle
    if (state === 'idle') {
      blink.value = withRepeat(
        withSequence(
          withDelay(2400, withTiming(0.1, { duration: 110 })),
          withTiming(1, { duration: 110 }),
        ),
        -1,
        false,
      );
    } else {
      blink.value = withTiming(1, { duration: 120 });
    }

    // Thinking head-tilt
    if (state === 'thinking') {
      tilt.value = withRepeat(
        withSequence(
          withTiming(-5, { duration: 600, easing: Easing.inOut(Easing.quad) }),
          withTiming(5, { duration: 600, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        true,
      );
    } else {
      tilt.value = withTiming(0, { duration: 300 });
    }

    return () => {
      bob.value = 0;
      blink.value = 1;
      tilt.value = 0;
    };
  }, [state, bob, blink, tilt]);

  const bodyStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: bob.value },
      { rotate: `${tilt.value}deg` },
    ],
  }));

  const eyeProps = useAnimatedStyle(() => ({
    transform: [{ scaleY: blink.value }],
  }));

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Animated.View style={bodyStyle}>
        <Svg width={size} height={size} viewBox="0 0 100 100">
          {/* Branch (pixel bar) */}
          <Rect x="20" y="86" width="60" height="4" fill={colors.text} />

          {/* Body — squat, pixel-style */}
          <G>
            {/* tufts */}
            <Rect x="22" y="14" width="8" height="6" fill={colors.text} />
            <Rect x="70" y="14" width="8" height="6" fill={colors.text} />
            {/* head + body block */}
            <Rect x="18" y="20" width="64" height="62" fill={colors.text} />
            {/* chest cut (lighter warm amber — feels like the owl's front feathers) */}
            <Rect x="28" y="44" width="44" height="34" fill={colors.accent} />
            {/* feet */}
            <Rect x="36" y="82" width="8" height="4" fill={colors.accent} />
            <Rect x="56" y="82" width="8" height="4" fill={colors.accent} />
          </G>

          {/* Eyes — white rounds with pupil that "blinks" via scaleY */}
          <AnimatedG style={eyeProps}>
            <Circle cx="36" cy="38" r="8" fill="#FFFFFF" />
            <Circle cx="64" cy="38" r="8" fill="#FFFFFF" />
            <Circle cx="36" cy="38" r="3" fill={colors.text} />
            <Circle cx="64" cy="38" r="3" fill={colors.text} />
          </AnimatedG>

          {/* Beak (tiny triangle in pixel style) */}
          <Path d="M47 48 L53 48 L50 54 Z" fill={colors.accent} />
        </Svg>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
