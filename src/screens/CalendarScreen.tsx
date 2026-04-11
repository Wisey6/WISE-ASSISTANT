import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns';

import { Icon, Screen, TaskCard, Text } from '@/components';
import { colors, radius, spacing } from '@/theme';
import { useTaskStore } from '@/store/useTaskStore';
import { usePartnersStore } from '@/store/usePartnersStore';
import type { Task } from '@/types';

type View = 'W' | 'M';

/**
 * Calendar screen with a W/M toggle. Month view shows a grid with
 * small colored time-block bars under each day (matching the
 * reference layout). Week view shows a horizontal scroll of days
 * and a vertical list of the selected day's time blocks.
 */
export const CalendarScreen: React.FC = () => {
  const tasks = useTaskStore((s) => s.tasks);
  const toggleTask = useTaskStore((s) => s.toggleTask);
  const colorFor = usePartnersStore((s) => s.colorFor);
  const partners = usePartnersStore((s) => s.partners);

  const [view, setView] = useState<View>('M');
  const [cursor, setCursor] = useState(new Date());
  const [selected, setSelected] = useState(new Date());

  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  const tasksByDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of tasks) {
      const when = t.startAt ?? t.dueAt;
      if (!when) continue;
      const key = format(parseISO(when), 'yyyy-MM-dd');
      const list = map.get(key) ?? [];
      list.push(t);
      map.set(key, list);
    }
    // Sort tasks within each day
    for (const list of map.values()) {
      list.sort((a, b) => {
        const aw = new Date(a.startAt ?? a.dueAt ?? 0).getTime();
        const bw = new Date(b.startAt ?? b.dueAt ?? 0).getTime();
        return aw - bw;
      });
    }
    return map;
  }, [tasks]);

  const selectedTasks =
    tasksByDay.get(format(selected, 'yyyy-MM-dd')) ?? [];

  return (
    <Screen scroll>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => setCursor((c) => addMonths(c, -1))}
          style={styles.chevBtn}
        >
          <Icon name="chevronRight" size={20} color={colors.text} />
        </Pressable>
        <Text variant="largeTitle">{format(cursor, 'MMMM')}</Text>
        <ViewToggle value={view} onChange={setView} />
      </View>

      {view === 'M' ? (
        <MonthGrid
          monthDays={monthDays}
          cursor={cursor}
          selected={selected}
          onSelect={setSelected}
          tasksByDay={tasksByDay}
        />
      ) : (
        <WeekStrip
          selected={selected}
          onSelect={setSelected}
          tasksByDay={tasksByDay}
        />
      )}

      {/* Selected-day heading + list */}
      <View style={styles.selectedHead}>
        <Text variant="title3">{format(selected, 'EEEE, MMM d')}</Text>
        <Text variant="footnote">
          {selectedTasks.length === 0
            ? 'Wide open'
            : `${selectedTasks.length} ${selectedTasks.length === 1 ? 'item' : 'items'}`}
        </Text>
      </View>

      <View style={styles.selectedStack}>
        {selectedTasks.length === 0 ? (
          <View style={styles.empty}>
            <Text variant="headline">Nothing scheduled</Text>
            <Text variant="subhead" style={{ marginTop: 4 }}>
              This day is open for you.
            </Text>
          </View>
        ) : (
          selectedTasks.map((t) => (
            <TaskCard
              key={t.id}
              task={t}
              accentColor={t.color ?? colorFor(t.ownerId)}
              ownerLabel={
                t.ownerId === 'me'
                  ? 'Me'
                  : partners.find((p) => p.id === t.ownerId)?.name ?? 'Partner'
              }
              onToggle={toggleTask}
            />
          ))
        )}
      </View>
    </Screen>
  );
};

/* -------------------------------------------------------------------------
 * Sub-components
 * -------------------------------------------------------------------------
 */

const ViewToggle: React.FC<{
  value: View;
  onChange: (v: View) => void;
}> = ({ value, onChange }) => (
  <View style={styles.toggle}>
    {(['W', 'M'] as const).map((v) => {
      const active = v === value;
      return (
        <Pressable
          key={v}
          onPress={() => onChange(v)}
          style={[styles.togglePill, active && styles.togglePillActive]}
        >
          <Text
            variant="footnote"
            weight="600"
            color={active ? colors.textInverse : colors.textSecondary}
          >
            {v}
          </Text>
        </Pressable>
      );
    })}
  </View>
);

interface MonthGridProps {
  monthDays: Date[];
  cursor: Date;
  selected: Date;
  onSelect: (d: Date) => void;
  tasksByDay: Map<string, Task[]>;
}

const MonthGrid: React.FC<MonthGridProps> = ({
  monthDays,
  cursor,
  selected,
  onSelect,
  tasksByDay,
}) => (
  <View style={{ marginBottom: spacing.xl }}>
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
        const dayTasks = tasksByDay.get(format(day, 'yyyy-MM-dd')) ?? [];
        return (
          <Pressable
            key={day.toISOString()}
            onPress={() => onSelect(day)}
            style={styles.dayCell}
          >
            <View style={[styles.dayInner, active && styles.dayInnerActive]}>
              <Text
                variant="callout"
                weight="600"
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
            {/* Stacked color bars — one per task, capped at 4 */}
            <View style={styles.barStack}>
              {dayTasks.slice(0, 4).map((t, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.dayBar,
                    {
                      backgroundColor: t.color ?? colors.surfaceMuted,
                    },
                  ]}
                />
              ))}
            </View>
          </Pressable>
        );
      })}
    </View>
  </View>
);

interface WeekStripProps {
  selected: Date;
  onSelect: (d: Date) => void;
  tasksByDay: Map<string, Task[]>;
}

const WeekStrip: React.FC<WeekStripProps> = ({
  selected,
  onSelect,
  tasksByDay,
}) => {
  const weekStart = startOfWeek(selected, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <View style={{ marginBottom: spacing.xl }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.weekScroll}
      >
        {days.map((day) => {
          const active = isSameDay(day, selected);
          const count = (tasksByDay.get(format(day, 'yyyy-MM-dd')) ?? []).length;
          return (
            <Pressable
              key={day.toISOString()}
              onPress={() => onSelect(day)}
              style={[styles.weekCell, active && styles.weekCellActive]}
            >
              <Text
                variant="caption"
                color={active ? colors.textInverse : colors.textSecondary}
              >
                {format(day, 'EEE').toUpperCase()}
              </Text>
              <Text
                variant="title2"
                color={active ? colors.textInverse : colors.text}
                style={{ marginTop: spacing.xs }}
              >
                {format(day, 'd')}
              </Text>
              <View
                style={[
                  styles.weekDot,
                  {
                    backgroundColor:
                      count > 0
                        ? active
                          ? colors.textInverse
                          : colors.text
                        : 'transparent',
                  },
                ]}
              />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

const CELL_SIZE = 38;

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  chevBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '180deg' }],
  },
  toggle: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    padding: 3,
  },
  togglePill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    minWidth: 32,
    alignItems: 'center',
  },
  togglePillActive: {
    backgroundColor: colors.surfaceInverse,
  },

  // Month grid
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    paddingHorizontal: 2,
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
    backgroundColor: colors.surfaceInverse,
  },
  barStack: {
    width: '80%',
    gap: 2,
    marginTop: 4,
    minHeight: 10,
  },
  dayBar: {
    height: 3,
    borderRadius: 2,
  },

  // Week strip
  weekScroll: {
    gap: spacing.sm,
    paddingHorizontal: 2,
    paddingVertical: spacing.xs,
  },
  weekCell: {
    width: 56,
    height: 84,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  weekCellActive: {
    backgroundColor: colors.surfaceInverse,
    borderColor: colors.surfaceInverse,
  },
  weekDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: spacing.xs,
  },

  selectedHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: spacing.md,
  },
  selectedStack: {
    gap: spacing.md,
  },
  empty: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
});
