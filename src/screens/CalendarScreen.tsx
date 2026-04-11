import React, { useMemo, useRef } from 'react';
import { Pressable, SectionList, StyleSheet, View } from 'react-native';
import {
  addDays,
  format,
  isSameDay,
  isToday,
  isTomorrow,
  isYesterday,
  parseISO,
  startOfDay,
} from 'date-fns';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import { Icon, Screen, Text } from '@/components';
import { colors, radius, spacing } from '@/theme';
import { useTaskStore } from '@/store/useTaskStore';
import { usePartnersStore } from '@/store/usePartnersStore';
import type { Task } from '@/types';
import type { MainTabParamList } from '@/navigation/types';

/**
 * Minimal agenda calendar.
 *
 * There is intentionally NO month grid, NO week view, NO toggle —
 * the best minimal calendars (Things 3 "Upcoming", Fantastical's
 * list view, Linear's inbox) are just a vertical scroll of days
 * with their events, and that's exactly what this is.
 *
 * Design rules:
 *   - One column, grouped by day
 *   - Empty days are skipped entirely (no "nothing here" noise)
 *   - Today gets a small accent; relative labels for ±1 day
 *   - Each row is time + title + a small color dot (whose task)
 *   - Tapping any row opens the owl — the AI is the only "add" path
 *
 * The add-flow is deliberately unified: there is no "+" or
 * in-place new-event. If you want to add something, tell the owl.
 * That's the whole point of the app.
 */
export const CalendarScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const tasks = useTaskStore((s) => s.tasks);
  const colorFor = usePartnersStore((s) => s.colorFor);
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const listRef = useRef<SectionList<Task>>(null);

  // Group dated tasks by calendar day, sorted chronologically.
  // Only days with at least one task get a section — empty days drop.
  const sections = useMemo(() => buildAgenda(tasks), [tasks]);

  const handleAskOwl = () => {
    navigation.navigate('Home' as never);
  };

  const jumpToToday = () => {
    const todayIdx = sections.findIndex((s) => isToday(parseISO(s.isoDate)));
    if (todayIdx >= 0) {
      listRef.current?.scrollToLocation({
        sectionIndex: todayIdx,
        itemIndex: 0,
        animated: true,
        viewOffset: 12,
      });
    }
  };

  return (
    <Screen scroll={false}>
      {/* Header — just the title and a small "today" pill */}
      <View style={styles.header}>
        <Text variant="largeTitle">Calendar</Text>
        <Pressable style={styles.todayPill} onPress={jumpToToday} hitSlop={8}>
          <Text variant="footnote" weight="600">
            Today
          </Text>
        </Pressable>
      </View>

      {sections.length === 0 ? (
        <EmptyState onAsk={handleAskOwl} />
      ) : (
        <SectionList
          ref={listRef}
          sections={sections}
          keyExtractor={(item) => item.id}
          renderSectionHeader={({ section }) => (
            <DayHeader date={parseISO(section.isoDate)} />
          )}
          renderItem={({ item }) => (
            <AgendaRow task={item} accentColor={item.color ?? colorFor(item.ownerId)} />
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          SectionSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={{
            paddingBottom: insets.bottom + 140,
          }}
          showsVerticalScrollIndicator={false}
          onScrollToIndexFailed={() => undefined}
        />
      )}

      {/* Persistent quick-ask bar: one tap → full owl conversation */}
      <Pressable
        onPress={handleAskOwl}
        style={[styles.askBar, { bottom: insets.bottom + 90 }]}
      >
        <Icon name="sparkle" size={16} color={colors.textInverse} />
        <Text variant="footnote" color={colors.textInverse} weight="500">
          Tell the owl what's coming up…
        </Text>
      </Pressable>
    </Screen>
  );
};

/* -------------------------------------------------------------------------
 * Day section header
 * -------------------------------------------------------------------------
 */

const DayHeader: React.FC<{ date: Date }> = ({ date }) => {
  const label = relativeDayLabel(date);
  const sub = format(date, 'EEE d MMM');
  const today = isToday(date);

  return (
    <View style={styles.dayHeader}>
      <View style={styles.dayHeaderLeft}>
        <Text variant="title3" color={today ? colors.accent : colors.text}>
          {label}
        </Text>
        <Text variant="footnote" style={{ marginLeft: spacing.sm }}>
          {sub}
        </Text>
      </View>
      {today && <View style={styles.todayDot} />}
    </View>
  );
};

/* -------------------------------------------------------------------------
 * Single agenda row
 * -------------------------------------------------------------------------
 */

interface RowProps {
  task: Task;
  accentColor: string;
}

const AgendaRow: React.FC<RowProps> = ({ task, accentColor }) => {
  const done = task.status === 'done';
  const time = rowTime(task);

  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
      <View style={styles.rowTime}>
        <Text
          variant="footnote"
          weight="600"
          color={done ? colors.textTertiary : colors.textSecondary}
        >
          {time}
        </Text>
      </View>
      <Text
        variant="callout"
        weight="500"
        color={done ? colors.textTertiary : colors.text}
        style={[styles.rowTitle, done && styles.rowTitleDone]}
        numberOfLines={1}
      >
        {task.title}
      </Text>
      <View style={[styles.rowDot, { backgroundColor: accentColor }]} />
    </Pressable>
  );
};

/* -------------------------------------------------------------------------
 * Empty state
 * -------------------------------------------------------------------------
 */

const EmptyState: React.FC<{ onAsk: () => void }> = ({ onAsk }) => (
  <View style={styles.empty}>
    <Text variant="title2">Nothing on the horizon.</Text>
    <Text variant="subhead" style={{ marginTop: spacing.xs, textAlign: 'center' }}>
      When you tell the owl about a deadline, it'll land here automatically.
    </Text>
    <Pressable onPress={onAsk} style={styles.emptyCta}>
      <Text variant="headline" color={colors.textInverse}>
        Ask the owl
      </Text>
    </Pressable>
  </View>
);

/* -------------------------------------------------------------------------
 * Helpers
 * -------------------------------------------------------------------------
 */

interface AgendaSection {
  isoDate: string;
  data: Task[];
}

function buildAgenda(tasks: Task[]): AgendaSection[] {
  const map = new Map<string, Task[]>();

  for (const t of tasks) {
    const when = t.startAt ?? t.dueAt;
    if (!when) continue;
    const key = format(startOfDay(parseISO(when)), 'yyyy-MM-dd');
    const list = map.get(key) ?? [];
    list.push(t);
    map.set(key, list);
  }

  // Sort keys ascending, then sort tasks within each day by time.
  return Array.from(map.entries())
    .map<AgendaSection>(([isoDate, list]) => ({
      isoDate: parseISO(`${isoDate}T00:00:00`).toISOString(),
      data: list.sort((a, b) => timeOf(a) - timeOf(b)),
    }))
    .sort((a, b) => a.isoDate.localeCompare(b.isoDate));
}

function timeOf(t: Task): number {
  const when = t.startAt ?? t.dueAt;
  return when ? new Date(when).getTime() : 0;
}

function rowTime(t: Task): string {
  if (t.startAt && t.endAt) {
    return `${clock(t.startAt)}–${clock(t.endAt)}`;
  }
  if (t.startAt) return clock(t.startAt);
  if (t.dueAt) return clock(t.dueAt);
  return '·';
}

function clock(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function relativeDayLabel(date: Date): string {
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  if (isYesterday(date)) return 'Yesterday';
  const sevenDays = addDays(new Date(), 7);
  if (date.getTime() < sevenDays.getTime()) {
    return format(date, 'EEEE');
  }
  return format(date, 'EEE');
}

/* -------------------------------------------------------------------------
 * Styles
 * -------------------------------------------------------------------------
 */

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  todayPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },

  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  dayHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  todayDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  rowPressed: {
    opacity: 0.6,
  },
  rowTime: {
    width: 64,
  },
  rowTitle: {
    flex: 1,
  },
  rowTitleDone: {
    textDecorationLine: 'line-through',
  },
  rowDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.divider,
  },

  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyCta: {
    marginTop: spacing.xl,
    backgroundColor: colors.surfaceInverse,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
  },

  askBar: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceInverse,
    shadowColor: '#0C0C0E',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
});
