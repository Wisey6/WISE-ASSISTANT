import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  lightPalette,
  spacing,
  statusColors,
  typography,
} from '@/theme';
import { Text } from '@/components/Text';
import { useDashboardStore } from '@/store/useDashboardStore';
import type { UnifiedTask } from '@/types/dashboard';
import { bucketFor, humanDueLabel } from '@/utils/dateBuckets';

import { CategoryPill } from './CategoryPill';
import { DashboardCard } from './DashboardCard';
import { StatusDot } from './StatusDot';

export const UpcomingDeadlines: React.FC = () => {
  const tasks = useDashboardStore((s) => s.tasks);
  const rows = useMemo(() => selectUpcoming(tasks), [tasks]);

  return (
    <DashboardCard>
      <Text style={[typography.caption, styles.eyebrow]}>UPCOMING</Text>
      {rows.length === 0 ? (
        <Text style={[typography.body, styles.empty]}>
          No deadlines in the next week.
        </Text>
      ) : (
        <View>
          {rows.map((t, i) => (
            <React.Fragment key={t.id}>
              {i > 0 && <View style={styles.divider} />}
              <View style={styles.row}>
                <View style={styles.main}>
                  <View style={styles.titleRow}>
                    <StatusDot status={t.status} />
                    <Text
                      style={[typography.body, styles.title]}
                      numberOfLines={1}
                    >
                      {t.title}
                    </Text>
                  </View>
                  <View style={styles.meta}>
                    <CategoryPill category={t.category} size="xs" />
                    <Text style={[typography.caption, styles.source]}>
                      {t.source === 'clickup' ? 'ClickUp' : 'Local'}
                    </Text>
                  </View>
                </View>
                <View style={styles.due}>
                  <Text
                    style={[typography.footnote, dueLabelStyle(t)]}
                    weight="600"
                  >
                    {humanDueLabel(t.dueAt)}
                  </Text>
                </View>
              </View>
            </React.Fragment>
          ))}
        </View>
      )}
    </DashboardCard>
  );
};

function selectUpcoming(tasks: UnifiedTask[]): UnifiedTask[] {
  return tasks
    .filter((t) => {
      if (t.status === 'completed') return false;
      const b = bucketFor(t.dueAt);
      return b === 'overdue' || b === 'today' || b === 'tomorrow' || b === 'thisWeek';
    })
    .sort((a, b) => (a.dueAt ?? '').localeCompare(b.dueAt ?? ''))
    .slice(0, 6);
}

function dueLabelStyle(t: UnifiedTask) {
  const b = bucketFor(t.dueAt);
  if (b === 'overdue') return { color: statusColors.blocked };
  if (b === 'today') return { color: statusColors.inProgress };
  return { color: lightPalette.textSecondary };
}

const styles = StyleSheet.create({
  eyebrow: {
    color: lightPalette.textTertiary,
    letterSpacing: 1.2,
    marginBottom: spacing.md,
  },
  empty: {
    color: lightPalette.textSecondary,
    paddingVertical: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  main: {
    flex: 1,
    gap: spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    color: lightPalette.textPrimary,
    flexShrink: 1,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  source: {
    color: lightPalette.textTertiary,
  },
  due: {
    alignItems: 'flex-end',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: lightPalette.divider,
  },
});
