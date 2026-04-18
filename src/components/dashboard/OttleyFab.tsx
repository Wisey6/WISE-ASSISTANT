import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';

import { colors, shadows, spacing } from '@/theme';
import { Text } from '@/components/Text';

interface Props {
  onPress: () => void;
  /** Offset above the floating tab bar. */
  bottomInset?: number;
}

/**
 * Ottley's one-and-only entry point. A compact black puck centered
 * at the bottom of the dashboard. Two layered animations — a slow
 * breathing scale + a softer ring that pulses outward — give the
 * "hey, I'm alive" cue without being obnoxious.
 */
export const OttleyFab: React.FC<Props> = ({ onPress, bottomInset = 100 }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const ring = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const breathe = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.06,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    const pulse = Animated.loop(
      Animated.timing(ring, {
        toValue: 1,
        duration: 1800,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    );
    breathe.start();
    pulse.start();
    return () => {
      breathe.stop();
      pulse.stop();
    };
  }, [scale, ring]);

  const ringScale = ring.interpolate({ inputRange: [0, 1], outputRange: [1, 1.9] });
  const ringOpacity = ring.interpolate({
    inputRange: [0, 0.15, 1],
    outputRange: [0, 0.35, 0],
  });

  return (
    <View
      style={[styles.wrap, { bottom: bottomInset }]}
      pointerEvents="box-none"
    >
      <View style={styles.stack}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.ring,
            { transform: [{ scale: ringScale }], opacity: ringOpacity },
          ]}
        />
        <Animated.View style={{ transform: [{ scale }] }}>
          <Pressable
            onPress={onPress}
            style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
            hitSlop={12}
          >
            <Text style={styles.glyph}>O</Text>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
};

const SIZE = 48;

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  stack: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: SIZE / 2,
    backgroundColor: colors.surfaceInverse,
  },
  btn: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: colors.surfaceInverse,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.floating,
  },
  btnPressed: {
    opacity: 0.88,
  },
  glyph: {
    color: colors.textInverse,
    fontSize: 20,
    fontWeight: '700',
  },
});
