import React, { useEffect } from 'react';
import { StyleSheet, Text as RNText, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { G, Path, Rect } from 'react-native-svg';

import { colors } from '@/theme';

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedRect = Animated.createAnimatedComponent(Rect);

export type OwlState =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'talking'
  | 'happy'
  | 'sleep'
  | 'dance'
  | 'dab'
  | 'hips';

interface Props {
  size?: number;
  state?: OwlState;
}

// Palette sampled from the reference snowy-owl illustration.
const OUTLINE = '#3B2B22';
const BODY = '#F3EFE6'; // off-white body
const BODY_SHADE = '#DED6C6'; // light gray shadow for depth
const BODY_SHADE_DEEP = '#C8BEAC';
const BEAK = '#3B2B22';
const BRANCH = '#6A4B3A';
const BRANCH_DARK = '#503628';

/**
 * Chunky pixel-art snowy owl perched on a branch. All shapes use
 * stepped rectangular edges (no curves) so it keeps the 8-bit look.
 *
 * Nine animation states, all driven by Reanimated on the UI thread:
 *
 *   idle       — gentle bob, occasional blink
 *   listening  — slower bob, eyes widen
 *   thinking   — head tilt, pupils look up
 *   talking    — quick bob, pupils dart
 *   happy      — squint + bounce
 *   sleep      — eyes closed, floating Z
 *   dance      — hip shake + tilt + repeating HOOT!
 *   dab        — one-shot tilt pose + pop of HOOT!
 *   hips       — side-to-side wiggle + HOOT!
 */
export const OwlCharacter: React.FC<Props> = ({ size = 200, state = 'idle' }) => {
  const bob = useSharedValue(0);
  const tilt = useSharedValue(0);
  const slide = useSharedValue(0);
  const blink = useSharedValue(1);
  const eyeScale = useSharedValue(1);
  const pupilY = useSharedValue(0);
  const pupilX = useSharedValue(0);
  const zFloat = useSharedValue(0);
  const hoot = useSharedValue(0);

  useEffect(() => {
    // Reset before each new state for clean transitions.
    bob.value = withTiming(0, { duration: 180 });
    tilt.value = withTiming(0, { duration: 180 });
    slide.value = withTiming(0, { duration: 180 });
    eyeScale.value = withTiming(1, { duration: 180 });
    pupilY.value = withTiming(0, { duration: 180 });
    pupilX.value = withTiming(0, { duration: 180 });
    zFloat.value = withTiming(0, { duration: 180 });
    hoot.value = withTiming(0, { duration: 180 });

    switch (state) {
      case 'idle':
        bob.value = withRepeat(
          withSequence(
            withTiming(-3, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
            withTiming(0, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
          ),
          -1,
        );
        blink.value = withRepeat(
          withSequence(
            withDelay(2600, withTiming(0.05, { duration: 110 })),
            withTiming(1, { duration: 110 }),
          ),
          -1,
        );
        break;

      case 'listening':
        bob.value = withRepeat(
          withSequence(
            withTiming(-5, { duration: 1400, easing: Easing.inOut(Easing.quad) }),
            withTiming(0, { duration: 1400, easing: Easing.inOut(Easing.quad) }),
          ),
          -1,
        );
        eyeScale.value = withSpring(1.3, { damping: 12, stiffness: 140 });
        break;

      case 'thinking':
        tilt.value = withRepeat(
          withSequence(
            withTiming(-6, { duration: 700, easing: Easing.inOut(Easing.quad) }),
            withTiming(6, { duration: 700, easing: Easing.inOut(Easing.quad) }),
          ),
          -1,
          true,
        );
        pupilY.value = withRepeat(
          withSequence(
            withTiming(-1.2, { duration: 700 }),
            withTiming(-2, { duration: 700 }),
          ),
          -1,
          true,
        );
        break;

      case 'talking':
        bob.value = withRepeat(
          withSequence(
            withTiming(-2, { duration: 260 }),
            withTiming(0, { duration: 260 }),
          ),
          -1,
        );
        pupilX.value = withRepeat(
          withSequence(
            withTiming(0.8, { duration: 420 }),
            withTiming(-0.8, { duration: 420 }),
          ),
          -1,
          true,
        );
        break;

      case 'happy':
        bob.value = withRepeat(
          withSequence(
            withTiming(-6, { duration: 220, easing: Easing.out(Easing.quad) }),
            withSpring(0, { damping: 6, stiffness: 220 }),
          ),
          3,
          false,
        );
        eyeScale.value = withTiming(0.25, { duration: 160 });
        hoot.value = withRepeat(withTiming(1, { duration: 1400 }), -1);
        break;

      case 'sleep':
        bob.value = withRepeat(
          withSequence(
            withTiming(-1.5, { duration: 1800 }),
            withTiming(0, { duration: 1800 }),
          ),
          -1,
        );
        blink.value = withTiming(0.05, { duration: 300 });
        zFloat.value = withRepeat(withTiming(1, { duration: 2200 }), -1);
        break;

      case 'dance':
        slide.value = withRepeat(
          withSequence(
            withTiming(6, { duration: 280, easing: Easing.inOut(Easing.quad) }),
            withTiming(-6, { duration: 280, easing: Easing.inOut(Easing.quad) }),
          ),
          -1,
          true,
        );
        tilt.value = withRepeat(
          withSequence(
            withTiming(8, { duration: 280 }),
            withTiming(-8, { duration: 280 }),
          ),
          -1,
          true,
        );
        bob.value = withRepeat(
          withSequence(
            withTiming(-4, { duration: 140 }),
            withTiming(0, { duration: 140 }),
          ),
          -1,
        );
        hoot.value = withRepeat(withTiming(1, { duration: 900 }), -1);
        break;

      case 'dab':
        tilt.value = withSequence(
          withTiming(-28, { duration: 180, easing: Easing.out(Easing.back(1.4)) }),
          withDelay(900, withSpring(0, { damping: 10, stiffness: 160 })),
        );
        slide.value = withSequence(
          withTiming(8, { duration: 180 }),
          withDelay(900, withSpring(0, { damping: 10, stiffness: 160 })),
        );
        hoot.value = withSequence(
          withTiming(1, { duration: 200 }),
          withDelay(700, withTiming(0, { duration: 400 })),
        );
        break;

      case 'hips':
        slide.value = withRepeat(
          withSequence(
            withTiming(7, { duration: 340, easing: Easing.inOut(Easing.quad) }),
            withTiming(-7, { duration: 340, easing: Easing.inOut(Easing.quad) }),
          ),
          -1,
          true,
        );
        hoot.value = withRepeat(withTiming(1, { duration: 1200 }), -1);
        break;
    }
  }, [state, bob, tilt, slide, eyeScale, pupilX, pupilY, blink, zFloat, hoot]);

  const bodyStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: slide.value },
      { translateY: bob.value },
      { rotate: `${tilt.value}deg` },
    ],
  }));

  const eyeGroupStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: blink.value }, { scale: eyeScale.value }],
  }));

  const pupilLeft = useAnimatedStyle(() => ({
    transform: [{ translateX: pupilX.value }, { translateY: pupilY.value }],
  }));
  const pupilRight = useAnimatedStyle(() => ({
    transform: [{ translateX: pupilX.value }, { translateY: pupilY.value }],
  }));

  const zStyle = useAnimatedStyle(() => ({
    opacity: zFloat.value,
    transform: [
      { translateY: -zFloat.value * 14 },
      { translateX: zFloat.value * 6 },
    ],
  }));

  const hootStyle = useAnimatedStyle(() => ({
    opacity: hoot.value,
    transform: [
      { translateY: -hoot.value * 18 },
      { scale: 0.8 + hoot.value * 0.2 },
    ],
  }));

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      {/* Branch (stays still — the bird bobs on top of it) */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width={size} height={size} viewBox="0 0 100 112">
          <Rect x="16" y="92" width="68" height="5" fill={BRANCH} />
          <Rect x="16" y="97" width="68" height="2" fill={BRANCH_DARK} />
          <Rect x="25" y="99" width="5" height="13" fill={BRANCH} />
          <Rect x="70" y="99" width="5" height="13" fill={BRANCH} />
        </Svg>
      </View>

      {/* Owl body — animated on top of the branch */}
      <Animated.View style={[{ width: size, height: size }, bodyStyle]}>
        <Svg width={size} height={size} viewBox="0 0 100 112">
          {/* Dark outline silhouette — stepped, no curves, for pixel look */}
          <Path
            d="M34 14 L62 14 L62 18 L66 18 L66 22 L70 22 L70 26 L74 26 L74 30 L78 30 L78 78 L74 78 L74 82 L70 82 L70 86 L66 86 L66 90 L62 90 L62 92 L34 92 L34 90 L30 90 L30 86 L26 86 L26 82 L22 82 L22 78 L18 78 L18 30 L22 30 L22 26 L26 26 L26 22 L30 22 L30 18 L34 18 Z"
            fill={OUTLINE}
          />

          {/* White body fill — inset by 3 units to leave the outline visible */}
          <Path
            d="M37 18 L59 18 L59 22 L63 22 L63 26 L67 26 L67 30 L71 30 L71 34 L75 34 L75 74 L71 74 L71 78 L67 78 L67 82 L63 82 L63 86 L59 86 L59 88 L37 88 L37 86 L33 86 L33 82 L29 82 L29 78 L25 78 L25 74 L21 74 L21 34 L25 34 L25 30 L29 30 L29 26 L33 26 L33 22 L37 22 Z"
            fill={BODY}
          />

          {/* Left wing seam — a vertical gray line hinting at a folded wing */}
          <Rect x="25" y="42" width="3" height="34" fill={BODY_SHADE} />
          <Rect x="25" y="76" width="7" height="3" fill={BODY_SHADE} />
          {/* Right wing seam */}
          <Rect x="72" y="42" width="3" height="34" fill={BODY_SHADE} />
          <Rect x="68" y="76" width="7" height="3" fill={BODY_SHADE} />

          {/* Belly shadow — a few soft gray rectangles for depth */}
          <Rect x="35" y="56" width="30" height="3" fill={BODY_SHADE} opacity={0.6} />
          <Rect x="37" y="64" width="26" height="3" fill={BODY_SHADE} opacity={0.6} />
          <Rect x="39" y="72" width="22" height="3" fill={BODY_SHADE_DEEP} opacity={0.55} />

          {/* Eyes — small dark chunky blocks */}
          <AnimatedG style={eyeGroupStyle}>
            <AnimatedRect
              x="37"
              y="36"
              width="6"
              height="6"
              fill={OUTLINE}
              style={pupilLeft}
            />
            <AnimatedRect
              x="57"
              y="36"
              width="6"
              height="6"
              fill={OUTLINE}
              style={pupilRight}
            />
            {/* Tiny pupil highlights */}
            <Rect x="41" y="36" width="1.5" height="1.5" fill={BODY} />
            <Rect x="61" y="36" width="1.5" height="1.5" fill={BODY} />
          </AnimatedG>

          {/* Beak — small dark triangle between and below eyes */}
          <Path d="M48 44 L52 44 L50 49 Z" fill={BEAK} />

          {/* Feet — two small blocks peeking below the body onto the branch */}
          <Rect x="39" y="88" width="6" height="5" fill={OUTLINE} />
          <Rect x="55" y="88" width="6" height="5" fill={OUTLINE} />
          {/* Toes (tiny splits) */}
          <Rect x="41" y="91" width="1.2" height="2" fill={BODY} />
          <Rect x="43" y="91" width="1.2" height="2" fill={BODY} />
          <Rect x="57" y="91" width="1.2" height="2" fill={BODY} />
          <Rect x="59" y="91" width="1.2" height="2" fill={BODY} />
        </Svg>
      </Animated.View>

      {/* HOOT! speech bubble — rendered on playful states */}
      {(state === 'dance' ||
        state === 'dab' ||
        state === 'hips' ||
        state === 'happy') && (
        <Animated.View style={[styles.hootBubble, hootStyle]}>
          <Svg width={56} height={32} viewBox="0 0 56 32">
            <Path
              d="M6 4 Q6 0, 10 0 L46 0 Q50 0, 50 4 L50 18 Q50 22, 46 22 L22 22 L14 30 L16 22 L10 22 Q6 22, 6 18 Z"
              fill={colors.surfaceInverse}
              stroke={OUTLINE}
              strokeWidth={1.5}
              strokeLinejoin="round"
            />
          </Svg>
          <View style={styles.hootText}>
            <RNText style={styles.hootLabel}>HOOT!</RNText>
          </View>
        </Animated.View>
      )}

      {state === 'sleep' && (
        <Animated.View style={[styles.zBubble, zStyle]}>
          <Svg width={24} height={24} viewBox="0 0 24 24">
            <Path
              d="M7 7 H17 L7 17 H17"
              stroke={colors.textSecondary}
              strokeWidth={2}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  zBubble: {
    position: 'absolute',
    top: '14%',
    right: '18%',
  },
  hootBubble: {
    position: 'absolute',
    top: -6,
    right: '6%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hootText: {
    position: 'absolute',
    top: 3,
    left: 0,
    right: 0,
    bottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hootLabel: {
    color: colors.textInverse,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
});
