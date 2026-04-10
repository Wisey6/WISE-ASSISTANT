import { Platform, ViewStyle } from 'react-native';

/**
 * Soft, almost-invisible shadows. Apple uses very subtle elevation —
 * anything heavier reads as "AI-looking" which we want to avoid.
 */
const ios = (opacity: number, radius: number, offsetY: number): ViewStyle => ({
  shadowColor: '#111113',
  shadowOpacity: opacity,
  shadowRadius: radius,
  shadowOffset: { width: 0, height: offsetY },
});

const android = (elevation: number): ViewStyle => ({ elevation });

export const shadows = {
  none: {} as ViewStyle,
  card: Platform.select({
    ios: ios(0.04, 10, 4),
    android: android(1),
    default: ios(0.04, 10, 4),
  }) as ViewStyle,
  floating: Platform.select({
    ios: ios(0.08, 20, 8),
    android: android(4),
    default: ios(0.08, 20, 8),
  }) as ViewStyle,
} as const;
