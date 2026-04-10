import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  endOfWeek,
  parseISO,
} from 'date-fns';

import {
  Card,
  Icon,
  Screen,
  SectionHeader,
  TaskRow,
  Text,
} from '@/components';
import { colors, radius, spacing } from '@/theme';
import { useTaskStore } from '@/store/useTaskStore';

/**
 * Minimal calendar. A 6-row month grid up top, a tap target per day
 * with a dot for days that have tasks, and a simple task list below
 * for the currently-selected day.
 *
 * We avoid using a 3rd-party calendar kit — they all bring heavy
 * styling that fights the rest of the design.
 */
export const CalendarScreen: React.FC = () => {
  const tasks = useTaskStore((s) => s.tasks);
  const toggleTask = useTaskStore((s) => s.toggleTask);
  const [cursor, setCursor] = useState(new Date());
  const [selected, setSelected] = useState(new Date());

  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  const tasksByDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of tasks) {
      if (!t.dueAt) continue;
      const key = format(parseISO(t.dueAt), 'yyyy-MM-dd');
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [tasks]);

  const selectedTasks = useMemo(
    () =>
      tasks.filter((t) => {
        if (!t.dueAt) return false;
        return isSameDay(parseISO(t.dueAt), selected);
      }),
    [tasks, selected],
  );

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text variant="largeTitle">Calendar</Text>
      </View>

      <Card style={styles.monthCard}>
        <View style={styles.monthHeader}>
          <Pressable
            hitSlop={12}
            onPress={() => setCursor((c) => addMonths(c, -1))}
          >
            <Icon name="chevronRight" size={20} color={colors.textSecondary} />
          </Pressable>
          <Text variant="title3">{format(cursor, 'MMMM yyyy')}</Text>
          <Pressable
            hitSlop={12}
            onPress={() => setCursor((c) => addMonths(c, 1))}
          >
            <Icon name="chevronRight" size={20} color={colors.text} />
          </Pressable>
        </View>

        <View style={styles.weekRow}>
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
            <Text key={d} variant="caption" style={styles.weekday}>
              {d}
            </Text>
          ))}
        </View>

        <View style={styles.grid}>
          {monthDays.map((day) => {
            const inMonth = isSameMonth(day, cursor);
            const active = isSameDay(day, selected);
            const count = tasksByDay.get(format(day, 'yyyy-MM-dd')) ?? 0;
            return (
              <Pressable
                key={day.toISOString()}
                onPress={() => setSelected(day)}
                style={styles.dayCell}
              >
                <View style={[styles.dayInner, active && styles.dayInnerActive]}>
                  <Text
                    variant="callout"
                    color={
                      active
                        ? colors.textInverse
                        : inMonth
                        ? colors.text
                        : colors.textTertiary
                    }
                  >
                    {format(day, 'd')}
                  </Text>
                </View>
                {count > 0 && (
                  <View
                    style={[
                      styles.dot,
                      {
                        backgroundColor: active
                          ? colors.accent
                          : colors.textTertiary,
                      },
                    ]}
                  />
                )}
              </Pressable>
            );
          })}
        </View>
      </Card>

      <View style={{ marginTop: spacing.xl }}>
        <SectionHeader title={format(selected, 'EEEE, MMM d')} />
        <Card padded={false} style={{ paddingHorizontal: spacing.lg }}>
          {selectedTasks.length === 0 ? (
            <View style={styles.empty}>
              <Text variant="headline">Nothing scheduled</Text>
              <Text variant="subhead" style={{ marginTop: 4 }}>
                This day is wide open.
              </Text>
            </View>
          ) : (
            selectedTasks.map((t, idx) => (
              <View
                key={t.id}
                style={[
                  idx > 0 && {
                    borderTopWidth: StyleSheet.hairlineWidth,
                    borderTopColor: colors.divider,
                  },
                ]}
              >
                <TaskRow task={t} onToggle={toggleTask} />
              </View>
            ))
          )}
        </Card>
      </View>
    </Screen>
  );
};

const CELL_SIZE = 36;

const styles = StyleSheet.create({
  header: {
    marginBottom: spacing.lg,
  },
  monthCard: {
    paddingVertical: spacing.lg,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  weekday: {
    width: `${100 / 7}%`,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    alignItems: 'center',
    paddingVertical: 6,
  },
  dayInner: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: CELL_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayInnerActive: {
    backgroundColor: colors.text,
  },
  dot: {
    marginTop: 3,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  empty: {
    paddingVertical: spacing.xxl,
    alignItems: 'flex-start',
  },
});
