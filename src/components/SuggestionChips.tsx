import React from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { colors, radius, spacing } from '@/theme';
import { Text } from './Text';

interface Props {
  items: string[];
  onPick: (value: string) => void;
}

/**
 * Horizontally-scrolling row of tap-to-reply chips. Used under the
 * assistant's latest message to speed up the most common answers.
 */
export const SuggestionChips: React.FC<Props> = ({ items, onPick }) => {
  if (items.length === 0) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {items.map((item) => (
        <Pressable
          key={item}
          onPress={() => onPick(item)}
          style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
        >
          <Text variant="footnote" weight="500">
            {item}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  row: {
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  chip: {
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chipPressed: {
    backgroundColor: colors.surfaceMuted,
  },
});
