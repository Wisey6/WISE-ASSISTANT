import React, { useEffect, useMemo } from 'react';
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
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';

import { colors, userPalettes } from '@/theme';

// Cast to any — react-native-reanimated's type inference for
// createAnimatedComponent wrapping react-native-svg primitives loses
// the `style` prop. The runtime behavior is correct.
const AnimatedG = Animated.createAnimatedComponent(G) as any;
const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse) as any;

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

/** Owl color variant — pink for Sarah, blue for Tyler. */
export type OwlVariant = 'sarah' | 'tyler';

interface Props {
  size?: number;
  state?: OwlState;
  /** Which user's color variant to render. Defaults to Sarah (pink). */
  variant?: OwlVariant;
}

interface OwlPalette {
  outline: string;
  body: string;
  bodyShade: string;
  bodyDeep: string;
  cheek: string;
}

function getPalette(variant: OwlVariant): OwlPalette {
  const p = userPalettes[variant];
  return {
    outline: p.owlOutline,
    body: p.owlBody,
    bodyShade: p.owlBodyShade,
    bodyDeep: p.owlBodyDeep,
    cheek: p.owlCheek,
  };
}

const BEAK = '#F2A23C'; // warm amber beak — reads cute against both variants
const BRANCH = '#8B5E3C';
const BRANCH_DARK = '#6A4527';
const EYE_WHITE = '#FDFCFA';

/**
 * Chunky round cartoon owl perched on a branch. The silhouette uses
 * soft curves and big eyes for a cute, plushie-like look rather
 * than the previous pixel-art stepped silhouette.
 *
 * Colors come from a per-user palette (Sarah = pink, Tyler = blue)
 * via the `variant` prop.
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
export const OwlCharacter: React.FC<Props> = ({
  size = 200,
  state = 'idle',
  variant = 'sarah',
}) => {
  const palette = useMemo(() => getPalette(variant), [variant]);

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
          <Rect x="14" y="93" width="72" height="5" rx="2" fill={BRANCH} />
          <Rect x="14" y="97" width="72" height="2" rx="1" fill={BRANCH_DARK} />
          <Rect x="25" y="99" width="5" height="13" rx="2" fill={BRANCH} />
          <Rect x="70" y="99" width="5" height="13" rx="2" fill={BRANCH} />
        </Svg>
      </View>

      {/* Owl body — animated on top of the branch */}
      <Animated.View style={[{ width: size, height: size }, bodyStyle]}>
        <Svg width={size} height={size} viewBox="0 0 100 112">
          {/* Dark outline — single rounded blob, no steps */}
          <Path
            d="M50 12
               C68 12 80 24 80 44
               L80 74
               C80 88 68 94 50 94
               C32 94 20 88 20 74
               L20 44
               C20 24 32 12 50 12 Z"
            fill={palette.outline}
          />

          {/* Body fill — slightly smaller, same rounded shape */}
          <Path
            d="M50 15
               C66 15 77 26 77 44
               L77 73
               C77 85 66 91 50 91
               C34 91 23 85 23 73
               L23 44
               C23 26 34 15 50 15 Z"
            fill={palette.body}
          />

          {/* Little tufts on the head — gives the owl "ears" */}
          <Path
            d="M30 18 L26 10 L34 16 Z"
            fill={palette.outline}
          />
          <Path
            d="M70 18 L74 10 L66 16 Z"
            fill={palette.outline}
          />

          {/* Belly panel — a lighter oval for depth */}
          <Ellipse
            cx="50"
            cy="66"
            rx="19"
            ry="18"
            fill={palette.bodyShade}
            opacity={0.55}
          />

          {/* Wings — rounded teardrops on each side */}
          <Path
            d="M25 44 C22 50 22 66 26 74 C30 80 34 78 33 70 L33 46 Z"
            fill={palette.bodyShade}
          />
          <Path
            d="M75 44 C78 50 78 66 74 74 C70 80 66 78 67 70 L67 46 Z"
            fill={palette.bodyShade}
          />

          {/* Feather lines on the wings for detail */}
          <Path
            d="M27 50 L31 50 M26 56 L32 56 M27 62 L31 62 M28 68 L30 68"
            stroke={palette.bodyDeep}
            strokeWidth={0.8}
            strokeLinecap="round"
          />
          <Path
            d="M69 50 L73 50 M68 56 L74 56 M69 62 L73 62 M70 68 L72 68"
            stroke={palette.bodyDeep}
            strokeWidth={0.8}
            strokeLinecap="round"
          />

          {/* Big round eye sockets — cream circles with dark outline */}
          <Circle
            cx="40"
            cy="42"
            r="10"
            fill={EYE_WHITE}
            stroke={palette.outline}
            strokeWidth={1.5}
          />
          <Circle
            cx="60"
            cy="42"
            r="10"
            fill={EYE_WHITE}
            stroke={palette.outline}
            strokeWidth={1.5}
          />

          {/* Animated pupils — large, cute, with a glint */}
          <AnimatedG style={eyeGroupStyle}>
            <AnimatedEllipse
              cx="40"
              cy="43"
              rx="4.5"
              ry="5.5"
              fill={palette.outline}
              style={pupilLeft}
            />
            <AnimatedEllipse
              cx="60"
              cy="43"
              rx="4.5"
              ry="5.5"
              fill={palette.outline}
              style={pupilRight}
            />
            {/* Glint highlights */}
            <Circle cx="42" cy="41" r="1.5" fill={EYE_WHITE} />
            <Circle cx="62" cy="41" r="1.5" fill={EYE_WHITE} />
            <Circle cx="38.5" cy="44.5" r="0.8" fill={EYE_WHITE} />
            <Circle cx="58.5" cy="44.5" r="0.8" fill={EYE_WHITE} />
          </AnimatedG>

          {/* Rosy cheeks — the cuteness multiplier */}
          <Ellipse cx="30" cy="56" rx="4" ry="2.5" fill={palette.cheek} opacity={0.75} />
          <Ellipse cx="70" cy="56" rx="4" ry="2.5" fill={palette.cheek} opacity={0.75} />

          {/* Beak — small rounded triangle between the eyes */}
          <Path
            d="M47 51 L53 51 L50 57 Z"
            fill={BEAK}
            stroke={palette.outline}
            strokeWidth={0.8}
            strokeLinejoin="round"
          />

          {/* Feet — two small rounded blocks onto the branch */}
          <Ellipse cx="42" cy="93" rx="4" ry="2.5" fill={BEAK} />
          <Ellipse cx="58" cy="93" rx="4" ry="2.5" fill={BEAK} />
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
              stroke={palette.outline}
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
