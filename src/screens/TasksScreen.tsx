import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import {
  addDays,
  format,
  isSameDay,
  isToday,
  startOfDay,
} from 'date-fns';

import { Icon, Screen, TaskCard, Text } from '@/components';
import { colors, radius, spacing } from '@/theme';
import { useTaskStore } from '@/store/useTaskStore';
import { usePartnersStore } from '@/store/usePartnersStore';
import { useUserStore } from '@/store/useUserStore';
import type { Task } from '@/types';

type Filter = 'mine' | 'partner' | 'all';

/**
 * Tasks — the list-of-cards view. Header shows a scrollable week
 * strip (the reference style), then a filter row (mine / partner /
 * all), then the stacked black task cards.
 */
export const TasksScreen: React.FC = () => {
  const tasks = useTaskStore((s) => s.tasks);
  const toggleTask = useTaskStore((s) => s.toggleTask);
  const partners = usePartnersStore((s) => s.partners);
  const colorFor = usePartnersStore((s) => s.colorFor);
  const user = useUserStore((s) => s.user);

  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [filter, setFilter] = useState<Filter>('all');

  const weekStrip = useMemo(() => {
    const today = startOfDay(new Date());
    return Array.from({ length: 7 }, (_, i) => addDays(today, i));
  }, []);

  const dayTasks = useMemo(() => {
    const relevant = tasks.filter((t) => {
      const when = t.startAt ?? t.dueAt;
      if (!when) return false;
      return isSameDay(new Date(when), selectedDate);
    });

    const filtered = relevant.filter((t) => {
      if (filter === 'mine') return t.ownerId === 'me';
      if (filter === 'partner') return t.ownerId !== 'me';
      return true;
    });

    return filtered.sort((a, b) => {
      const aw = new Date(a.startAt ?? a.dueAt ?? 0).getTime();
      const bw = new Date(b.startAt ?? b.dueAt ?? 0).getTime();
      return aw - bw;
    });
  }, [tasks, selectedDate, filter]);

  const partnerName = partners[0]?.name;

  return (
    <Screen scroll>
      {/* Large "Monday, 5" header */}
      <View style={styles.header}>
        <View>
          <Text variant="largeTitle">{format(selectedDate, 'EEEE, d')}</Text>
          <Text variant="subhead" style={{ marginTop: 2 }}>
            {dayTasks.length === 0
              ? 'Nothing scheduled'
              : `${dayTasks.length} ${dayTasks.length === 1 ? 'thing' : 'things'} today`}
          </Text>
        </View>
        <View style={styles.headerChevron}>
          <Icon name="chevronRight" size={22} color={colors.text} />
        </View>
      </View>

      {/* Week strip */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.weekStrip}
      >
        {weekStrip.map((day) => {
          const active = isSameDay(day, selectedDate);
          return (
            <Pressable
              key={day.toISOString()}
              onPress={() => setSelectedDate(day)}
              style={[styles.dayPill, active && styles.dayPillActive]}
            >
              <Text
                variant="caption"
                color={active ? colors.textInverse : colors.textSecondary}
              >
                {format(day, 'EEE').toUpperCase()}
              </Text>
              <Text
                variant="title3"
                color={active ? colors.textInverse : colors.text}
                style={{ marginTop: 2 }}
              >
                {format(day, 'd')}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Filter row */}
      <View style={styles.filters}>
        {([
          { value: 'all' as const, label: 'Everyone' },
          { value: 'mine' as const, label: user?.name ?? 'Me' },
          { value: 'partner' as const, label: partnerName ?? 'Partner' },
        ]).map((opt) => {
          const active = opt.value === filter;
          return (
            <Pressable
              key={opt.value}
              onPress={() => setFilter(opt.value)}
              style={[styles.filterChip, active && styles.filterChipActive]}
            >
              <Text
                variant="footnote"
                weight={active ? '600' : '500'}
                color={active ? colors.textInverse : colors.textSecondary}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Task cards */}
      <View style={styles.cardStack}>
        {dayTasks.length === 0 ? (
          <EmptyCard isToday={isToday(selectedDate)} />
        ) : (
          dayTasks.map((t) => (
            <TaskCard
              key={t.id}
              task={t}
              accentColor={t.color ?? colorFor(t.ownerId)}
              ownerLabel={
                t.ownerId === 'me'
                  ? user?.name ?? 'Me'
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

const EmptyCard: React.FC<{ isToday: boolean }> = ({ isToday }) => (
  <View style={styles.empty}>
    <Text variant="headline">
      {isToday ? "You're clear today" : 'Nothing scheduled'}
    </Text>
    <Text variant="subhead" style={{ marginTop: 4 }}>
      Tell the owl what you've got — it'll sort the rest.
    </Text>
  </View>
);

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  headerChevron: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekStrip: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: 2,
    marginBottom: spacing.lg,
  },
  dayPill: {
    width: 52,
    height: 64,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayPillActive: {
    backgroundColor: colors.surfaceInverse,
    borderColor: colors.surfaceInverse,
  },
  filters: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.surfaceInverse,
    borderColor: colors.surfaceInverse,
  },
  cardStack: {
    gap: spacing.md,
  },
  empty: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
});
