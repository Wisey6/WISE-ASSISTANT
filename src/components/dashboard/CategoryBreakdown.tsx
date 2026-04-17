import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  categoryColors,
  categoryLabel,
  lightPalette,
  spacing,
  typography,
} from '@/theme';
import { Text } from '@/components/Text';
import { useDashboardStore } from '@/store/useDashboardStore';
import type { Category, UnifiedTask } from '@/types/dashboard';

import { DashboardCard } from './DashboardCard';

const CATEGORIES: Category[] = ['work', 'study', 'personal'];

export const CategoryBreakdown: React.FC = () => {
  const tasks = useDashboardStore((s) => s.tasks);
  const counts = useMemo(() => countByCategory(tasks), [tasks]);

  return (
    <DashboardCard>
      <Text
        style={[typography.caption, styles.eyebrow]}
      >BY CATEGORY</Text>
      <View style={styles.row}>
        {CATEGORIES.map((c, i) => (
          <React.Fragment key={c}>
            {i > 0 && <View style={styles.divider} />}
            <View style={styles.cell}>
              <View
                style={[styles.dot, { backgroundColor: categoryColors[c] }]}
              />
              <Text
                style={[typography.largeTitle, styles.count]}
              >{counts[c].open}</Text>
              <Text
                style={[typography.footnote, styles.label]}
              >{categoryLabel[c]}</Text>
              <Text
                style={[typography.caption, styles.sub]}
              >{counts[c].completed} done</Text>
            </View>
          </React.Fragment>
        ))}
      </View>
    </DashboardCard>
  );
};

function countByCategory(
  tasks: UnifiedTask[],
): Record<Category, { open: number; completed: number }> {
  const out: Record<Category, { open: number; completed: number }> = {
    work: { open: 0, completed: 0 },
    study: { open: 0, completed: 0 },
    personal: { open: 0, completed: 0 },
  };
  for (const t of tasks) {
    if (t.status === 'completed') out[t.category].completed += 1;
    else out[t.category].open += 1;
  }
  return out;
}

const styles = StyleSheet.create({
  eyebrow: {
    color: lightPalette.textTertiary,
    letterSpacing: 1.2,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  cell: {
    flex: 1,
    gap: 2,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: lightPalette.border,
    marginHorizontal: spacing.md,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: spacing.xs,
  },
  count: {
    color: lightPalette.textPrimary,
    fontWeight: '600',
  },
  label: {
    color: lightPalette.textPrimary,
  },
  sub: {
    color: lightPalette.textTertiary,
    letterSpacing: 0.2,
    marginTop: 2,
  },
});
