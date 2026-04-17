import React from 'react';
import { StyleSheet, View } from 'react-native';

import { lightPalette, spacing, typography } from '@/theme';
import { Text } from '@/components/Text';
import { useDashboardStore } from '@/store/useDashboardStore';

import { DashboardCard } from './DashboardCard';

export const JokeCard: React.FC = () => {
  const joke = useDashboardStore((s) => s.joke);
  return (
    <DashboardCard>
      <Text style={[typography.caption, styles.eyebrow]}>
        JOKE OF THE DAY
      </Text>
      <View style={styles.body}>
        <Text style={[typography.title3, styles.text]}>
          {joke ? joke.text : 'Loading a little levity…'}
        </Text>
      </View>
      <Text style={[typography.caption, styles.foot]}>
        Resets at midnight.
      </Text>
    </DashboardCard>
  );
};

const styles = StyleSheet.create({
  eyebrow: {
    color: lightPalette.textTertiary,
    letterSpacing: 1.2,
  },
  body: {
    paddingVertical: spacing.md,
  },
  text: {
    color: lightPalette.textPrimary,
    lineHeight: 28,
  },
  foot: {
    color: lightPalette.textTertiary,
  },
});
