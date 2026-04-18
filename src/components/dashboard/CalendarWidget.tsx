import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import {
  addDays,
  format,
  isSameDay,
  isToday,
  startOfDay,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  addMonths,
} from 'date-fns';

import {
  categoryColors,
  colors,
  radius,
  spacing,
  statusColors,
  typography,
} from '@/theme';
import { Text } from '@/components/Text';
import { useDashboardStore } from '@/store/useDashboardStore';
import type {
  Category,
  UnifiedEvent,
  UnifiedTask,
} from '@/types/dashboard';

type ViewMode = 'daily' | 'weekly' | 'monthly';

interface AgendaItem {
  id: string;
  title: string;
  startAt: string;
  endAt?: string;
  dueAt?: string | null;
  category: Category;
  kind: 'event' | 'task';
  status?: UnifiedTask['status'];
}

export const CalendarWidget: React.FC = () => {
  const tasks = useDashboardStore((s) => s.tasks);
  const events = useDashboardStore((s) => s.events);
  const [mode, setMode] = useState<ViewMode>('daily');
  const [focused, setFocused] = useState<Date>(() => new Date());

  const items = useMemo(() => toAgenda(tasks, events), [tasks, events]);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={[typography.caption, styles.eyebrow]}>CALENDAR</Text>
          <Text style={[typography.title2, styles.headline]}>
            {format(focused, 'MMMM yyyy')}
          </Text>
        </View>
        <ModeSwitch mode={mode} onChange={setMode} />
      </View>

      {mode === 'daily' && (
        <DailyView items={items} date={focused} onChangeDate={setFocused} />
      )}
      {mode === 'weekly' && (
        <WeeklyView
          items={items}
          anchor={focused}
          onPickDay={(d) => {
            setFocused(d);
            setMode('daily');
          }}
        />
      )}
      {mode === 'monthly' && (
        <MonthlyView
          items={items}
          anchor={focused}
          onPickDay={(d) => {
            setFocused(d);
            setMode('daily');
          }}
          onShiftMonth={(dir) => setFocused(addMonths(focused, dir))}
        />
      )}
    </View>
  );
};

const MODES: { id: ViewMode; label: string }[] = [
  { id: 'daily', label: 'Day' },
  { id: 'weekly', label: 'Week' },
  { id: 'monthly', label: 'Month' },
];

const ModeSwitch: React.FC<{ mode: ViewMode; onChange: (m: ViewMode) => void }> = ({
  mode,
  onChange,
}) => (
  <View style={styles.switch}>
    {MODES.map((m) => {
      const active = m.id === mode;
      return (
        <Pressable
          key={m.id}
          onPress={() => onChange(m.id)}
          style={[styles.switchBtn, active && styles.switchBtnActive]}
          hitSlop={4}
        >
          <Text
            style={[
              typography.caption,
              {
                color: active ? colors.text : colors.textInverseMuted,
                letterSpacing: 0.6,
              },
            ]}
            weight="600"
          >
            {m.label.toUpperCase()}
          </Text>
        </Pressable>
      );
    })}
  </View>
);

/* ------------------------------ Daily view ------------------------------ */

const DailyView: React.FC<{
  items: AgendaItem[];
  date: Date;
  onChangeDate: (d: Date) => void;
}> = ({ items, date, onChangeDate }) => {
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(startOfDay(new Date()), i - 3 + 3)),
    [],
  );
  const dayItems = items
    .filter((it) => isSameDay(new Date(it.startAt), date))
    .sort((a, b) => a.startAt.localeCompare(b.startAt));

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dayStrip}
      >
        {days.map((d) => {
          const active = isSameDay(d, date);
          return (
            <Pressable
              key={d.toISOString()}
              onPress={() => onChangeDate(d)}
              style={[styles.dayPill, active && styles.dayPillActive]}
              hitSlop={4}
            >
              <Text
                style={[
                  typography.caption,
                  { color: active ? colors.text : colors.textInverseMuted },
                ]}
              >
                {format(d, 'EEE').toUpperCase()}
              </Text>
              <Text
                style={[
                  typography.title3,
                  {
                    color: active ? colors.text : colors.textInverse,
                    marginTop: 2,
                  },
                ]}
                weight="600"
              >
                {format(d, 'd')}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.list}>
        {dayItems.length === 0 ? (
          <Text
            style={[typography.body, { color: colors.textInverseMuted, padding: spacing.lg }]}
          >
            Nothing on {isToday(date) ? 'today' : format(date, 'EEEE')}. Rare.
          </Text>
        ) : (
          dayItems.map((it) => <EventRow key={it.id} item={it} />)
        )}
      </View>
    </>
  );
};

const EventRow: React.FC<{ item: AgendaItem }> = ({ item }) => {
  const start = new Date(item.startAt);
  const end = item.endAt ? new Date(item.endAt) : null;
  const color = categoryColors[item.category];

  return (
    <Pressable style={styles.row}>
      <View style={styles.rowTime}>
        <Text style={[typography.footnote, { color: colors.textInverse }]} weight="600">
          {format(start, 'HH:mm')}
        </Text>
        {end && (
          <Text
            style={[typography.caption, { color: colors.textInverseMuted }]}
          >
            {format(end, 'HH:mm')}
          </Text>
        )}
      </View>
      <View style={[styles.block, { backgroundColor: color }]}>
        <Text style={[typography.body, { color: colors.textInverse }]} weight="500" numberOfLines={2}>
          {item.title}
        </Text>
        {item.kind === 'task' && item.status && (
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: statusColors[item.status] },
              ]}
            />
            <Text
              style={[typography.caption, { color: colors.textInverseMuted }]}
            >
              {labelForStatus(item.status)}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
};

/* ------------------------------ Weekly view ----------------------------- */

const WeeklyView: React.FC<{
  items: AgendaItem[];
  anchor: Date;
  onPickDay: (d: Date) => void;
}> = ({ items, anchor, onPickDay }) => {
  const weekDays = useMemo(() => {
    const start = startOfWeek(anchor, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [anchor]);

  return (
    <View style={styles.weekGrid}>
      {weekDays.map((d) => {
        const dayItems = items.filter((it) => isSameDay(new Date(it.startAt), d));
        const today = isToday(d);
        return (
          <Pressable
            key={d.toISOString()}
            onPress={() => onPickDay(d)}
            style={[styles.weekCol, today && styles.weekColToday]}
          >
            <Text
              style={[
                typography.caption,
                { color: today ? colors.text : colors.textInverseMuted },
              ]}
            >
              {format(d, 'EEE').toUpperCase()}
            </Text>
            <Text
              style={[
                typography.title3,
                { color: today ? colors.text : colors.textInverse },
              ]}
              weight="600"
            >
              {format(d, 'd')}
            </Text>
            <View style={styles.weekBlocks}>
              {dayItems.slice(0, 4).map((it) => (
                <View
                  key={it.id}
                  style={[
                    styles.weekBlock,
                    { backgroundColor: categoryColors[it.category] },
                  ]}
                >
                  <Text
                    style={[typography.caption, { color: colors.textInverse }]}
                    numberOfLines={1}
                  >
                    {format(new Date(it.startAt), 'HH:mm')} {it.title}
                  </Text>
                </View>
              ))}
              {dayItems.length > 4 && (
                <Text
                  style={[typography.caption, { color: colors.textInverseMuted }]}
                >
                  +{dayItems.length - 4} more
                </Text>
              )}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
};

/* ----------------------------- Monthly view ----------------------------- */

const MonthlyView: React.FC<{
  items: AgendaItem[];
  anchor: Date;
  onPickDay: (d: Date) => void;
  onShiftMonth: (dir: 1 | -1) => void;
}> = ({ items, anchor, onPickDay, onShiftMonth }) => {
  const grid = useMemo(() => {
    const start = startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(anchor), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [anchor]);

  const byDay = useMemo(() => {
    const map = new Map<string, AgendaItem[]>();
    for (const it of items) {
      const key = format(new Date(it.startAt), 'yyyy-MM-dd');
      map.set(key, [...(map.get(key) ?? []), it]);
    }
    return map;
  }, [items]);

  return (
    <View>
      <View style={styles.monthHeader}>
        <Pressable onPress={() => onShiftMonth(-1)} hitSlop={8}>
          <Text style={[typography.footnote, { color: colors.textInverseMuted }]}>
            ‹ prev
          </Text>
        </Pressable>
        <Pressable onPress={() => onShiftMonth(1)} hitSlop={8}>
          <Text style={[typography.footnote, { color: colors.textInverseMuted }]}>
            next ›
          </Text>
        </Pressable>
      </View>
      <View style={styles.monthRow}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <Text
            key={i}
            style={[
              typography.caption,
              { color: colors.textInverseMuted, flex: 1, textAlign: 'center' },
            ]}
          >
            {d}
          </Text>
        ))}
      </View>
      <View style={styles.monthGrid}>
        {grid.map((d) => {
          const key = format(d, 'yyyy-MM-dd');
          const dayItems = byDay.get(key) ?? [];
          const inMonth = d.getMonth() === anchor.getMonth();
          const today = isToday(d);
          const cats = Array.from(new Set(dayItems.map((it) => it.category)));
          return (
            <Pressable
              key={key}
              onPress={() => onPickDay(d)}
              style={[styles.monthCell, today && styles.monthCellToday]}
            >
              <Text
                style={[
                  typography.footnote,
                  {
                    color: today
                      ? colors.text
                      : inMonth
                      ? colors.textInverse
                      : colors.textInverseMuted,
                  },
                ]}
                weight={today ? '600' : '400'}
              >
                {format(d, 'd')}
              </Text>
              <View style={styles.monthDots}>
                {cats.slice(0, 3).map((c) => (
                  <View
                    key={c}
                    style={[styles.monthDot, { backgroundColor: categoryColors[c] }]}
                  />
                ))}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

/* -------------------------------- Helpers ------------------------------- */

function toAgenda(tasks: UnifiedTask[], events: UnifiedEvent[]): AgendaItem[] {
  const out: AgendaItem[] = [];
  for (const e of events) {
    out.push({
      id: e.id,
      title: e.title,
      startAt: e.startAt,
      endAt: e.endAt,
      category: e.category,
      kind: 'event',
    });
  }
  for (const t of tasks) {
    if (!t.dueAt) continue;
    out.push({
      id: t.id,
      title: t.title,
      startAt: t.dueAt,
      dueAt: t.dueAt,
      category: t.category,
      kind: 'task',
      status: t.status,
    });
  }
  return out;
}

function labelForStatus(status: UnifiedTask['status']): string {
  if (status === 'inProgress') return 'In progress';
  if (status === 'blocked') return 'Blocked';
  if (status === 'completed') return 'Done';
  return 'To do';
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceInverse,
    borderRadius: radius.lg,
    padding: spacing.lg,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  eyebrow: {
    color: colors.textInverseMuted,
    letterSpacing: 1.2,
  },
  headline: {
    color: colors.textInverse,
    marginTop: 2,
  },
  switch: {
    flexDirection: 'row',
    backgroundColor: 'rgba(246, 244, 236, 0.08)',
    borderRadius: radius.pill,
    padding: 3,
    gap: 2,
  },
  switchBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  switchBtnActive: {
    backgroundColor: colors.textInverse,
  },
  dayStrip: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  dayPill: {
    width: 52,
    height: 64,
    borderRadius: radius.md,
    backgroundColor: 'rgba(246, 244, 236, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayPillActive: {
    backgroundColor: colors.textInverse,
  },
  list: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  rowTime: {
    width: 44,
    paddingTop: spacing.xs,
  },
  block: {
    flex: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  weekGrid: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  weekCol: {
    flex: 1,
    padding: spacing.xs,
    borderRadius: radius.sm,
    minHeight: 160,
    gap: 4,
    alignItems: 'center',
  },
  weekColToday: {
    backgroundColor: 'rgba(246, 244, 236, 0.08)',
  },
  weekBlocks: {
    alignSelf: 'stretch',
    gap: 3,
    marginTop: spacing.xs,
  },
  weekBlock: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  monthRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  monthCell: {
    width: `${100 / 7}%` as `${number}%`,
    aspectRatio: 1,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  monthCellToday: {
    backgroundColor: colors.textInverse,
    borderRadius: radius.sm,
  },
  monthDots: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 2,
  },
  monthDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
