import React from 'react';
import { StyleSheet, View } from 'react-native';
import { format } from 'date-fns';

import { lightPalette, spacing, typography } from '@/theme';
import { Text } from '@/components/Text';
import { useUserStore } from '@/store/useUserStore';

function greetingFor(d: Date): string {
  const h = d.getHours();
  if (h < 5) return 'Still up';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Good night';
}

export const GreetingHeader: React.FC = () => {
  const userId = useUserStore((s) => s.currentUserId);
  const name = userId ? userId[0].toUpperCase() + userId.slice(1) : 'there';
  const now = new Date();
  return (
    <View style={styles.wrap}>
      <Text
        style={[typography.caption, styles.eyebrow]}
      >{format(now, 'EEEE, d MMMM').toUpperCase()}</Text>
      <Text
        style={[typography.largeTitle, { color: lightPalette.textPrimary }]}
      >
        {greetingFor(now)}, {name}.
      </Text>
      <Text
        style={[typography.subhead, { color: lightPalette.textSecondary }]}
      >
        Here's what deserves your attention today.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  eyebrow: {
    color: lightPalette.textTertiary,
    letterSpacing: 1.2,
  },
});
