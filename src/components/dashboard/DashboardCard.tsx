import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

import { lightPalette, radius, spacing } from '@/theme';

interface Props {
  children: React.ReactNode;
  padded?: boolean;
  style?: ViewStyle;
}

/**
 * Local Card variant for the Dashboard. Matches the rest of the
 * Dashboard's light-surface palette — plain white fill, hairline
 * border, no shadow. Deliberately avoids the warm-cream Card used
 * elsewhere in the app.
 */
export const DashboardCard: React.FC<Props> = ({
  children,
  padded = true,
  style,
}) => (
  <View style={[styles.card, padded && styles.padded, style]}>{children}</View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: lightPalette.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: lightPalette.border,
    overflow: 'hidden',
  },
  padded: {
    padding: spacing.lg,
  },
});
