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
import Svg, { Circle, Path, Rect, G, Ellipse } from 'react-native-svg';

import { colors } from '@/theme';

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export type OwlState = 'idle' | 'listening' | 'thinking' | 'talking' | 'happy' | 'sleep';

interface Props {
  size?: number;
  state?: OwlState;
}

// Barn-owl palette — chosen to pop against the cream background but
// still read as "minimal". Everything is flat with a single highlight.
const BODY = '#5F4633';
const BODY_DARK = '#3E2C1E';
const FACE = '#F6E9D1';
const FACE_SHADOW = '#E9D9B9';
const BEAK = '#E28A3C';
const FOOT = '#D97A30';
const EYE_WHITE = '#FFFFFF';
const EYE = '#0C0C0E';

/**
 * Barn-owl character rendered as SVG primitives. Five animation states:
 *
 *   idle      — gentle bob, occasional blink
 *   listening — eyes widen, body bobs slower
 *   thinking  — head tilts back and forth, pupils look up
 *   talking   — quick bob, pupils dart
 *   happy     — eye squint + bounce
 *   sleep     — eyes shut, tiny Z floats up
 *
 * Reanimated drives everything on the UI thread so the animation stays
 * smooth while the JS thread is busy parsing tasks or awaiting input.
 */
export const OwlCharacter: React.FC<Props> = ({ size = 200, state = 'idle' }) => {
  const bob = useSharedValue(0);
  const tilt = useSharedValue(0);
  const blink = useSharedValue(1);
  const eyeScale = useSharedValue(1);
  const pupilOffsetY = useSharedValue(0);
  const pupilOffsetX = useSharedValue(0);
  const zFloat = useSharedValue(0);

  useEffect(() => {
    // Reset before applying the new state so transitions feel clean.
    bob.value = withTiming(0, { duration: 180 });
    tilt.value = withTiming(0, { duration: 180 });
    eyeScale.value = withTiming(1, { duration: 180 });
    pupilOffsetY.value = withTiming(0, { duration: 180 });
    pupilOffsetX.value = withTiming(0, { duration: 180 });
    zFloat.value = withTiming(0, { duration: 180 });

    switch (state) {
      case 'idle': {
        bob.value = withRepeat(
          withSequence(
            withTiming(-3, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
            withTiming(0, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
          ),
          -1,
          false,
        );
        blink.value = withRepeat(
          withSequence(
            withDelay(2600, withTiming(0.05, { duration: 110 })),
            withTiming(1, { duration: 110 }),
          ),
          -1,
          false,
        );
        break;
      }

      case 'listening': {
        bob.value = withRepeat(
          withSequence(
            withTiming(-5, { duration: 1400, easing: Easing.inOut(Easing.quad) }),
            withTiming(0, { duration: 1400, easing: Easing.inOut(Easing.quad) }),
          ),
          -1,
          false,
        );
        eyeScale.value = withSpring(1.12, { damping: 12, stiffness: 140 });
        blink.value = withTiming(1, { duration: 120 });
        break;
      }

      case 'thinking': {
        tilt.value = withRepeat(
          withSequence(
            withTiming(-6, { duration: 700, easing: Easing.inOut(Easing.quad) }),
            withTiming(6, { duration: 700, easing: Easing.inOut(Easing.quad) }),
          ),
          -1,
          true,
        );
        pupilOffsetY.value = withRepeat(
          withSequence(
            withTiming(-1.2, { duration: 700 }),
            withTiming(-1.8, { duration: 700 }),
          ),
          -1,
          true,
        );
        blink.value = withTiming(1, { duration: 120 });
        break;
      }

      case 'talking': {
        bob.value = withRepeat(
          withSequence(
            withTiming(-2, { duration: 260, easing: Easing.inOut(Easing.quad) }),
            withTiming(0, { duration: 260, easing: Easing.inOut(Easing.quad) }),
          ),
          -1,
          false,
        );
        pupilOffsetX.value = withRepeat(
          withSequence(
            withTiming(0.8, { duration: 420 }),
            withTiming(-0.8, { duration: 420 }),
          ),
          -1,
          true,
        );
        blink.value = withTiming(1, { duration: 120 });
        break;
      }

      case 'happy': {
        bob.value = withRepeat(
          withSequence(
            withTiming(-6, { duration: 220, easing: Easing.out(Easing.quad) }),
            withSpring(0, { damping: 6, stiffness: 220 }),
          ),
          3,
          false,
        );
        eyeScale.value = withTiming(0.25, { duration: 160 });
        break;
      }

      case 'sleep': {
        bob.value = withRepeat(
          withSequence(
            withTiming(-1.5, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
            withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
          ),
          -1,
          false,
        );
        blink.value = withTiming(0.05, { duration: 300 });
        zFloat.value = withRepeat(
          withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.quad) }),
          -1,
          false,
        );
        break;
      }
    }
  }, [state, bob, tilt, eyeScale, pupilOffsetY, pupilOffsetX, blink, zFloat]);

  const bodyStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: bob.value },
      { rotate: `${tilt.value}deg` },
    ],
  }));

  const eyeGroupStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: blink.value }, { scale: eyeScale.value }],
  }));

  const pupilLeftProps = useAnimatedStyle(() => ({
    transform: [
      { translateX: pupilOffsetX.value },
      { translateY: pupilOffsetY.value },
    ],
  }));

  const pupilRightProps = useAnimatedStyle(() => ({
    transform: [
      { translateX: pupilOffsetX.value },
      { translateY: pupilOffsetY.value },
    ],
  }));

  const zStyle = useAnimatedStyle(() => ({
    opacity: zFloat.value,
    transform: [
      { translateY: -zFloat.value * 14 },
      { translateX: zFloat.value * 6 },
    ],
  }));

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Animated.View style={[{ width: size, height: size }, bodyStyle]}>
        <Svg width={size} height={size} viewBox="0 0 100 110">
          {/* ground shadow — subtle ellipse under the owl */}
          <Ellipse cx="50" cy="101" rx="22" ry="3" fill={colors.border} />

          {/* branch */}
          <Rect x="20" y="95" width="60" height="4" rx="2" fill={BODY_DARK} />

          {/* main body — slightly pear-shaped */}
          <Path
            d="M50 18 C28 18, 16 34, 16 56 C16 78, 28 94, 50 94 C72 94, 84 78, 84 56 C84 34, 72 18, 50 18 Z"
            fill={BODY}
          />

          {/* wing shadows on the sides for volume */}
          <Path
            d="M18 56 C18 42, 24 32, 30 28 L32 86 C24 82, 18 72, 18 56 Z"
            fill={BODY_DARK}
          />
          <Path
            d="M82 56 C82 42, 76 32, 70 28 L68 86 C76 82, 82 72, 82 56 Z"
            fill={BODY_DARK}
          />

          {/* ear tufts (barn owls don't have tufts but it reads 'owl' faster) */}
          <Path d="M32 20 L28 10 L37 16 Z" fill={BODY_DARK} />
          <Path d="M68 20 L72 10 L63 16 Z" fill={BODY_DARK} />

          {/* heart-shaped face disk */}
          <Path
            d="M50 22 C34 22, 28 34, 30 48 C32 60, 40 68, 50 72 C60 68, 68 60, 70 48 C72 34, 66 22, 50 22 Z"
            fill={FACE}
          />
          {/* soft shadow under the face for depth */}
          <Path
            d="M50 72 C42 68, 34 62, 32 52 Q35 66, 50 72 Z"
            fill={FACE_SHADOW}
            opacity={0.6}
          />

          {/* feather marks on chest */}
          <Path
            d="M42 78 Q44 80 46 78 M48 82 Q50 84 52 82 M54 78 Q56 80 58 78"
            stroke={BODY_DARK}
            strokeWidth={0.9}
            fill="none"
            strokeLinecap="round"
          />

          {/* feet / talons */}
          <Path
            d="M42 92 L42 97 M45 92 L45 97 M48 92 L48 97"
            stroke={FOOT}
            strokeWidth={1.6}
            strokeLinecap="round"
          />
          <Path
            d="M52 92 L52 97 M55 92 L55 97 M58 92 L58 97"
            stroke={FOOT}
            strokeWidth={1.6}
            strokeLinecap="round"
          />

          {/* eyes group (blink + scale) */}
          <AnimatedG style={eyeGroupStyle}>
            <Circle cx="41" cy="41" r="8" fill={EYE_WHITE} stroke={EYE} strokeWidth={1.3} />
            <Circle cx="59" cy="41" r="8" fill={EYE_WHITE} stroke={EYE} strokeWidth={1.3} />
            <AnimatedCircle cx="41" cy="41" r="4" fill={EYE} style={pupilLeftProps} />
            <AnimatedCircle cx="59" cy="41" r="4" fill={EYE} style={pupilRightProps} />
            {/* highlights */}
            <Circle cx="42.4" cy="39.4" r="1.1" fill="#FFFFFF" />
            <Circle cx="60.4" cy="39.4" r="1.1" fill="#FFFFFF" />
          </AnimatedG>

          {/* beak — small orange triangle */}
          <Path d="M47 49 L53 49 L50 57 Z" fill={BEAK} />
        </Svg>
      </Animated.View>

      {state === 'sleep' && (
        <Animated.View style={[styles.zWrap, zStyle]}>
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
  zWrap: {
    position: 'absolute',
    top: '14%',
    right: '18%',
  },
});
