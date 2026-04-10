import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';

import { colors, radius, spacing } from '@/theme';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost';

interface Props {
  label: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
}

/**
 * Three-variant button. Primary is solid soft-black, secondary is
 * a neutral surface, ghost is transparent — following iOS patterns.
 * Haptic tap feedback keeps it feeling native.
 */
export const Button: React.FC<Props> = ({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  fullWidth = true,
  style,
}) => {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        variantStyles[variant],
        fullWidth && styles.fullWidth,
        pressed && styles.pressed,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.textInverse : colors.text} />
      ) : (
        <View style={styles.inner}>
          <Text variant="headline" color={labelColor(variant)} weight="600">
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
};

const labelColor = (variant: Variant): string =>
  variant === 'primary' ? colors.textInverse : colors.text;

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.995 }],
  },
  disabled: {
    opacity: 0.4,
  },
});

const variantStyles: Record<Variant, ViewStyle> = {
  primary: {
    backgroundColor: colors.text,
  },
  secondary: {
    backgroundColor: colors.surfaceMuted,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
};
