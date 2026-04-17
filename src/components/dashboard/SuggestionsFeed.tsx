import React from 'react';
import { StyleSheet, View } from 'react-native';

import { lightPalette, spacing, typography } from '@/theme';
import { Text } from '@/components/Text';
import { useDashboardStore } from '@/store/useDashboardStore';

import { DashboardCard } from './DashboardCard';
import { SuggestionCard } from './SuggestionCard';

export const SuggestionsFeed: React.FC = () => {
  const suggestions = useDashboardStore((s) => s.suggestions);
  const approve = useDashboardStore((s) => s.approveSuggestion);
  const dismiss = useDashboardStore((s) => s.dismissSuggestion);
  const pending = suggestions.filter((s) => s.status === 'pending');

  return (
    <DashboardCard>
      <View style={styles.header}>
        <Text style={[typography.caption, styles.eyebrow]}>
          ASSISTANT SUGGESTIONS
        </Text>
        <Text style={[typography.footnote, styles.sub]}>
          {pending.length} pending
        </Text>
      </View>
      {pending.length === 0 ? (
        <Text style={[typography.body, styles.empty]}>
          All caught up. I'll flag anything that needs a decision.
        </Text>
      ) : (
        <View>
          {pending.map((s, i) => (
            <React.Fragment key={s.id}>
              {i > 0 && <View style={styles.divider} />}
              <SuggestionCard
                suggestion={s}
                onApprove={approve}
                onDismiss={dismiss}
              />
            </React.Fragment>
          ))}
        </View>
      )}
    </DashboardCard>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  eyebrow: {
    color: lightPalette.textTertiary,
    letterSpacing: 1.2,
  },
  sub: {
    color: lightPalette.textTertiary,
  },
  empty: {
    color: lightPalette.textSecondary,
    paddingVertical: spacing.md,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: lightPalette.divider,
  },
});
