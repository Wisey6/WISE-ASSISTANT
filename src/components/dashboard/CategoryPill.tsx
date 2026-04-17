import React from 'react';
import { StyleSheet, View } from 'react-native';

import {
  categoryColorSoft,
  categoryColors,
  categoryLabel,
  lightPalette,
  radius,
  spacing,
  typography,
} from '@/theme';
import { Text } from '@/components/Text';
import type { Category } from '@/types/dashboard';

interface Props {
  category: Category;
  size?: 'xs' | 'sm';
}

export const CategoryPill: React.FC<Props> = ({ category, size = 'sm' }) => (
  <View
    style={[
      styles.pill,
      size === 'xs' && styles.pillXs,
      { backgroundColor: categoryColorSoft[category] },
    ]}
  >
    <View
      style={[
        styles.dot,
        { backgroundColor: categoryColors[category] },
      ]}
    />
    <Text
      style={[
        size === 'xs' ? typography.caption : typography.footnote,
        { color: lightPalette.textPrimary },
      ]}
    >
      {categoryLabel[category]}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  pillXs: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
