import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

import { spacing } from '@/theme';
import { useBreakpoint } from '@/hooks/useBreakpoint';

export interface GridCellProps {
  /** Column span on desktop (1–12). Ignored below lg. */
  span?: number;
  children: React.ReactNode;
  style?: ViewStyle;
}

export const GridCell: React.FC<GridCellProps> = ({
  span = 12,
  children,
  style,
}) => {
  const bp = useBreakpoint();
  const widthPct = bp === 'lg' ? `${(span / 12) * 100}%` : '100%';
  return (
    <View
      style={[
        {
          width: widthPct as `${number}%`,
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.sm,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

interface GridProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

/**
 * 12-column responsive grid. Below the `lg` breakpoint, every cell
 * collapses to full width. Cells manage their own outer spacing via
 * symmetric padding so the grid itself stays zero-margin.
 */
export const GridLayout: React.FC<GridProps> = ({ children, style }) => (
  <View style={[styles.grid, style]}>{children}</View>
);

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.sm,
  },
});
