import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

import { colors, radius, shadows, spacing } from '@/theme';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  padded?: boolean;
  elevated?: boolean;
}

/**
 * Default card — white surface, 20px radius, almost-invisible shadow.
 * Set `elevated` for slightly stronger shadow (used for modal-style cards).
 */
export const Card: React.FC<Props> = ({
  children,
  style,
  padded = true,
  elevated = false,
}) => (
  <View
    style={[
      styles.card,
      elevated ? shadows.floating : shadows.card,
      padded && styles.padded,
      style,
    ]}
  >
    {children}
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  padded: {
    padding: spacing.lg,
  },
});
