import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  Card,
  Icon,
  Screen,
  SwipeableTaskRow,
  Text,
} from '@/components';
import { colors, radius, spacing } from '@/theme';
import { useTaskStore } from '@/store/useTaskStore';
import { useTaskInsights } from '@/hooks/useTaskInsights';
import type { Task } from '@/types';

type Filter = 'today' | 'upcoming' | 'done';

/**
 * Full task list. Three segmented filters, grouped rows, swipe to
 * complete or delete. The insights card at the top surfaces the same
 * overload warning the AI uses so the user sees it in context.
 */
export const TasksScreen: React.FC = () => {
  const tasks = useTaskStore((s) => s.tasks);
  const toggleTask = useTaskStore((s) => s.toggleTask);
  const removeTask = useTaskStore((s) => s.removeTask);
  const insights = useTaskInsights();

  const [filter, setFilter] = useState<Filter>('today');

  const visible = useMemo(() => {
    const today = new Date();
    const isSameDay = (iso: string | null) =>
      iso !== null && new Date(iso).toDateString() === today.toDateString();

    switch (filter) {
      case 'today':
        return tasks.filter(
          (t) => t.status === 'todo' && (isSameDay(t.dueAt) || !t.dueAt),
        );
      case 'upcoming':
        return tasks.filter(
          (t) =>
            t.status === 'todo' &&
            t.dueAt !== null &&
            !isSameDay(t.dueAt) &&
            new Date(t.dueAt).getTime() > today.getTime(),
        );
      case 'done':
        return tasks.filter((t) => t.status === 'done');
    }
  }, [tasks, filter]);

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text variant="largeTitle">Tasks</Text>
        <Text variant="subhead">
          {insights.remaining} open · {insights.completed} done
        </Text>
      </View>

      {insights.overloaded && (
        <Card style={styles.warningCard}>
          <View style={styles.warningIcon}>
            <Icon name="flame" size={18} color={colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="headline">Heavy day ahead</Text>
            <Text variant="subhead" style={{ marginTop: 2 }}>
              Consider moving lower-priority items to later this week.
            </Text>
          </View>
        </Card>
      )}

      <Segmented
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'today', label: 'Today' },
          { value: 'upcoming', label: 'Upcoming' },
          { value: 'done', label: 'Done' },
        ]}
      />

      <Card padded={false} style={styles.listCard}>
        {visible.length === 0 ? (
          <View style={styles.empty}>
            <Text variant="headline">Nothing here</Text>
            <Text variant="subhead" style={{ marginTop: 4 }}>
              {filter === 'done'
                ? "You haven't completed anything yet."
                : 'Enjoy the breathing room.'}
            </Text>
          </View>
        ) : (
          visible.map((task, idx) => (
            <View
              key={task.id}
              style={[
                idx > 0 && {
                  borderTopWidth: StyleSheet.hairlineWidth,
                  borderTopColor: colors.divider,
                },
              ]}
            >
              <SwipeableTaskRow
                task={task}
                onToggle={toggleTask}
                onRemove={removeTask}
              />
            </View>
          ))
        )}
      </Card>
    </Screen>
  );
};

interface SegmentedProps<T extends string> {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
}: SegmentedProps<T>) {
  return (
    <View style={styles.segmented}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            style={[styles.segment, active && styles.segmentActive]}
            onPress={() => onChange(opt.value)}
          >
            <Text
              variant="footnote"
              weight={active ? '600' : '500'}
              color={active ? colors.text : colors.textSecondary}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// Exported so tests or other screens can sort/filter with the same type.
export type { Task };

const styles = StyleSheet.create({
  header: {
    gap: 4,
    marginBottom: spacing.lg,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.accentSoft,
    borderColor: 'transparent',
  },
  warningIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    padding: 4,
    marginBottom: spacing.md,
  },
  segment: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: colors.surface,
    shadowColor: '#111113',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  listCard: {
    paddingHorizontal: 0,
    overflow: 'hidden',
  },
  empty: {
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
    alignItems: 'flex-start',
  },
});
