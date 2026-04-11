import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
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
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

import { colors } from '@/theme';

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

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

// Palette sampled from the reference illustration.
const OUTLINE = '#3B2716';
const BODY = '#8A5A33';
const BODY_HILITE = '#A06B3E';
const BELLY = '#EED08A';
const BELLY_MARK = '#7C4A23';
const BEAK = '#F4A930';
const FOOT = '#F3A837';
const FOOT_STRIPE = '#3B2716';
const EYE_WHITE = '#FAFAF5';
const PUPIL = '#120E08';

/**
 * Pixel-art style barn owl. Stylized but recognisable — round brown
 * body with pointed ear tufts, big white eyes with full black pupils,
 * cream chest with V-feathers, orange beak and striped feet.
 *
 * Nine animation states — all driven by Reanimated on the UI thread:
 *
 *   idle       — gentle bob + occasional blink
 *   listening  — eyes widen, slow bob
 *   thinking   — head tilt + pupils look up
 *   talking    — quick bob + pupils dart
 *   happy      — squint + bounce
 *   sleep      — eyes closed + floating Z
 *   dance      — hip shake with rotation + "HOOT!" bubble
 *   dab        — one-off dab pose with "HOOT!" bubble
 *   hips       — side-to-side hip wiggle with "HOOT!" bubble
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
        eyeScale.value = withSpring(1.12, { damping: 12, stiffness: 140 });
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
            withTiming(-1.4, { duration: 700 }),
            withTiming(-2, { duration: 700 }),
          ),
          -1,
          true,
        );
        break;

      case 'talking':
        bob.value = withRepeat(
          withSequence(
            withTiming(-2, { duration: 260, easing: Easing.inOut(Easing.quad) }),
            withTiming(0, { duration: 260, easing: Easing.inOut(Easing.quad) }),
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
        eyeScale.value = withTiming(0.3, { duration: 160 });
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
            withTiming(8, { duration: 280, easing: Easing.inOut(Easing.quad) }),
            withTiming(-8, { duration: 280, easing: Easing.inOut(Easing.quad) }),
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
        // A one-shot tilted pose — quick drop + hold + release
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
      <Animated.View style={[{ width: size, height: size }, bodyStyle]}>
        <Svg width={size} height={size} viewBox="0 0 100 102">
          {/* ear tufts */}
          <Path
            d="M30 18 L34 6 L40 18 Z"
            fill={BODY}
            stroke={OUTLINE}
            strokeWidth={1.6}
            strokeLinejoin="round"
          />
          <Path
            d="M60 18 L66 6 L70 18 Z"
            fill={BODY}
            stroke={OUTLINE}
            strokeWidth={1.6}
            strokeLinejoin="round"
          />

          {/* body (outline + fill) */}
          <Path
            d="M50 12 C26 12, 12 30, 12 58 C12 84, 26 96, 50 96 C74 96, 88 84, 88 58 C88 30, 74 12, 50 12 Z"
            fill={BODY}
            stroke={OUTLINE}
            strokeWidth={2.2}
          />

          {/* subtle highlight patch on the body */}
          <Path
            d="M22 40 C20 52, 22 62, 28 72 C22 60, 22 48, 26 38 Z"
            fill={BODY_HILITE}
            opacity={0.7}
          />

          {/* cream belly */}
          <Path
            d="M50 42 C36 42, 28 54, 30 74 C32 88, 42 94, 50 94 C58 94, 68 88, 70 74 C72 54, 64 42, 50 42 Z"
            fill={BELLY}
            stroke={OUTLINE}
            strokeWidth={1.8}
          />

          {/* V feather marks on belly */}
          <Path
            d="M39 62 l2.4 2.2 l2.4 -2.2 M46 62 l2.4 2.2 l2.4 -2.2 M53 62 l2.4 2.2 l2.4 -2.2"
            stroke={BELLY_MARK}
            strokeWidth={1.5}
            fill="none"
            strokeLinecap="round"
          />
          <Path
            d="M42 70 l2.4 2.2 l2.4 -2.2 M49 70 l2.4 2.2 l2.4 -2.2 M56 70 l2.4 2.2 l2.4 -2.2"
            stroke={BELLY_MARK}
            strokeWidth={1.5}
            fill="none"
            strokeLinecap="round"
          />
          <Path
            d="M45 78 l2.4 2.2 l2.4 -2.2 M52 78 l2.4 2.2 l2.4 -2.2"
            stroke={BELLY_MARK}
            strokeWidth={1.5}
            fill="none"
            strokeLinecap="round"
          />

          {/* feet */}
          <Rect
            x="34"
            y="92"
            width="14"
            height="7"
            rx="1.5"
            fill={FOOT}
            stroke={OUTLINE}
            strokeWidth={1.5}
          />
          <Rect
            x="52"
            y="92"
            width="14"
            height="7"
            rx="1.5"
            fill={FOOT}
            stroke={OUTLINE}
            strokeWidth={1.5}
          />
          {/* talon stripes */}
          <Rect x="37" y="92.5" width="1.6" height="6" fill={FOOT_STRIPE} />
          <Rect x="41" y="92.5" width="1.6" height="6" fill={FOOT_STRIPE} />
          <Rect x="44.6" y="92.5" width="1.6" height="6" fill={FOOT_STRIPE} />
          <Rect x="55" y="92.5" width="1.6" height="6" fill={FOOT_STRIPE} />
          <Rect x="59" y="92.5" width="1.6" height="6" fill={FOOT_STRIPE} />
          <Rect x="62.6" y="92.5" width="1.6" height="6" fill={FOOT_STRIPE} />

          {/* eyes — big white circles with large dark pupils */}
          <AnimatedG style={eyeGroupStyle}>
            <Circle
              cx="38"
              cy="40"
              r="11"
              fill={EYE_WHITE}
              stroke={OUTLINE}
              strokeWidth={2}
            />
            <Circle
              cx="62"
              cy="40"
              r="11"
              fill={EYE_WHITE}
              stroke={OUTLINE}
              strokeWidth={2}
            />
            <AnimatedCircle cx="38" cy="41" r="6.5" fill={PUPIL} style={pupilLeft} />
            <AnimatedCircle cx="62" cy="41" r="6.5" fill={PUPIL} style={pupilRight} />
            <Circle cx="40" cy="39" r="1.5" fill={EYE_WHITE} />
            <Circle cx="64" cy="39" r="1.5" fill={EYE_WHITE} />
          </AnimatedG>

          {/* beak */}
          <Path
            d="M46 50 L54 50 L50 60 Z"
            fill={BEAK}
            stroke={OUTLINE}
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
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
            <HootLabel />
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

import { Text as RNText } from 'react-native';

const HootLabel: React.FC = () => (
  <RNText
    style={{
      color: colors.textInverse,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.8,
    }}
  >
    HOOT!
  </RNText>
);

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
});
