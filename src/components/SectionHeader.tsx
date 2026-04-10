import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { spacing } from '@/theme';
import { Text } from './Text';

interface Props {
  title: string;
  action?: { label: string; onPress: () => void };
}

export const SectionHeader: React.FC<Props> = ({ title, action }) => (
  <View style={styles.row}>
    <Text variant="title3">{title}</Text>
    {action && (
      <Pressable onPress={action.onPress} hitSlop={10}>
        <Text variant="subhead">{action.label}</Text>
      </Pressable>
    )}
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
});
