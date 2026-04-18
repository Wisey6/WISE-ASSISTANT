import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';

const AnimatedG = Animated.createAnimatedComponent(
  // Wrap an SVG group in an animated proxy so we can drive scaleY.
  // react-native-svg exposes G via the base export, so we can't use
  // Animated.createAnimatedComponent on G directly without importing it;
  // a plain View wrapper works for this 2D blink.
  View,
);

interface Props {
  size?: number;
  /** Glyph color — defaults to white so it reads on the black puck. */
  color?: string;
  /** Set false to freeze the eye open (useful for tiny inline copies). */
  animate?: boolean;
}

/**
 * Ottley's face: three short lashes up top, a round open eye below.
 * The eye "blinks" by collapsing its Y-scale to near zero twice in a
 * row every few seconds, the way real eyes do. Driven by native
 * driver so it doesn't burn JS frames.
 */
export const OttleyEye: React.FC<Props> = ({
  size = 32,
  color = '#FFFFFF',
  animate = true,
}) => {
  const eyeScaleY = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!animate) return;
    // Two quick closes, long open. Adds personality without strobing.
    const blink = Animated.sequence([
      Animated.delay(2600),
      Animated.timing(eyeScaleY, {
        toValue: 0.08,
        duration: 90,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(eyeScaleY, {
        toValue: 1,
        duration: 120,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.delay(140),
      Animated.timing(eyeScaleY, {
        toValue: 0.08,
        duration: 90,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(eyeScaleY, {
        toValue: 1,
        duration: 140,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]);
    const loop = Animated.loop(blink);
    loop.start();
    return () => loop.stop();
  }, [animate, eyeScaleY]);

  // Lashes are static SVG; the eye lives in a separately animated layer
  // pinned to the same origin so scaleY collapses from the center.
  return (
    <View style={{ width: size, height: size }}>
      <Svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        style={StyleSheet.absoluteFill}
      >
        <Line
          x1="14" y1="14" x2="10" y2="6"
          stroke={color}
          strokeWidth={2.4}
          strokeLinecap="round"
        />
        <Line
          x1="24" y1="12" x2="24" y2="4"
          stroke={color}
          strokeWidth={2.4}
          strokeLinecap="round"
        />
        <Line
          x1="34" y1="14" x2="38" y2="6"
          stroke={color}
          strokeWidth={2.4}
          strokeLinecap="round"
        />
      </Svg>

      <AnimatedG
        style={[
          StyleSheet.absoluteFill,
          {
            transform: [{ scaleY: eyeScaleY }],
          },
        ]}
      >
        <Svg width={size} height={size} viewBox="0 0 48 48">
          <Path
            d="M12 26 Q24 38 36 26 Q24 14 12 26 Z"
            fill={color}
          />
        </Svg>
      </AnimatedG>
    </View>
  );
};
