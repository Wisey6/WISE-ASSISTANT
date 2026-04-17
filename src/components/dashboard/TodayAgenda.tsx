import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { format, isToday } from 'date-fns';

import {
  categoryColors,
  lightPalette,
  spacing,
  statusColors,
  typography,
} from '@/theme';
import { Text } from '@/components/Text';
import { useDashboardStore } from '@/store/useDashboardStore';
import type { UnifiedEvent, UnifiedTask } from '@/types/dashboard';

import { CategoryPill } from './CategoryPill';
import { DashboardCard } from './DashboardCard';

type AgendaItem =
  | { kind: 'event'; item: UnifiedEvent }
  | { kind: 'task'; item: UnifiedTask };

export const TodayAgenda: React.FC = () => {
  const tasks = useDashboardStore((s) => s.tasks);
  const events = useDashboardStore((s) => s.events);
  const items = useMemo(() => buildAgenda(tasks, events), [tasks, events]);

  return (
    <DashboardCard>
      <View style={styles.header}>
        <Text style={[typography.caption, styles.eyebrow]}>TODAY</Text>
        <Text style={[typography.footnote, styles.sub]}>
          {items.length} item{items.length === 1 ? '' : 's'}
        </Text>
      </View>
      {items.length === 0 ? (
        <Text style={[typography.body, styles.empty]}>
          Nothing scheduled. Good day to ship something.
        </Text>
      ) : (
        <View style={styles.list}>
          {items.map((a, idx) => (
            <React.Fragment key={a.item.id}>
              {idx > 0 && <View style={styles.divider} />}
              {a.kind === 'event' ? (
                <EventRow event={a.item} />
              ) : (
                <TaskRow task={a.item} />
              )}
            </React.Fragment>
          ))}
        </View>
      )}
    </DashboardCard>
  );
};

const EventRow: React.FC<{ event: UnifiedEvent }> = ({ event }) => {
  const start = new Date(event.startAt);
  const end = new Date(event.endAt);
  return (
    <View style={styles.row}>
      <View style={styles.timeCol}>
        <Text style={[typography.headline, styles.time]}>
          {format(start, 'HH:mm')}
        </Text>
        <Text style={[typography.caption, styles.timeSub]}>
          {format(end, 'HH:mm')}
        </Text>
      </View>
      <View
        style={[
          styles.rule,
          { backgroundColor: categoryColors[event.category] },
        ]}
      />
      <View style={styles.body}>
        <Text style={[typography.body, styles.title]} numberOfLines={1}>
          {event.title}
        </Text>
        <View style={styles.meta}>
          <CategoryPill category={event.category} size="xs" />
          {event.location ? (
            <Text style={[typography.caption, styles.metaText]}>
              {event.location}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
};

const TaskRow: React.FC<{ task: UnifiedTask }> = ({ task }) => {
  const due = task.dueAt ? new Date(task.dueAt) : null;
  return (
    <View style={styles.row}>
      <View style={styles.timeCol}>
        <Text style={[typography.headline, styles.time]}>
          {due ? format(due, 'HH:mm') : '—'}
        </Text>
        <Text style={[typography.caption, styles.timeSub]}>Due</Text>
      </View>
      <View
        style={[
          styles.rule,
          { backgroundColor: statusColors[task.status] },
        ]}
      />
      <View style={styles.body}>
        <Text style={[typography.body, styles.title]} numberOfLines={1}>
          {task.title}
        </Text>
        <View style={styles.meta}>
          <CategoryPill category={task.category} size="xs" />
          <Text style={[typography.caption, styles.metaText]}>
            {task.source === 'clickup' ? 'ClickUp' : 'Local'}
          </Text>
        </View>
      </View>
    </View>
  );
};

function buildAgenda(
  tasks: UnifiedTask[],
  events: UnifiedEvent[],
): AgendaItem[] {
  const eventItems: AgendaItem[] = events
    .filter((e) => isToday(new Date(e.startAt)))
    .map((item) => ({ kind: 'event', item }));
  const taskItems: AgendaItem[] = tasks
    .filter(
      (t) =>
        t.status !== 'completed' &&
        t.dueAt &&
        isToday(new Date(t.dueAt)),
    )
    .map((item) => ({ kind: 'task', item }));

  const all = [...eventItems, ...taskItems];
  all.sort((a, b) => {
    const aTime =
      a.kind === 'event' ? a.item.startAt : a.item.dueAt ?? '';
    const bTime =
      b.kind === 'event' ? b.item.startAt : b.item.dueAt ?? '';
    return aTime.localeCompare(bTime);
  });
  return all;
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
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
  list: {
    gap: 0,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: lightPalette.divider,
    marginVertical: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  timeCol: {
    width: 48,
    alignItems: 'flex-start',
  },
  time: {
    color: lightPalette.textPrimary,
    fontWeight: '600',
  },
  timeSub: {
    color: lightPalette.textTertiary,
    letterSpacing: 0.8,
  },
  rule: {
    width: 2,
    alignSelf: 'stretch',
    borderRadius: 1,
  },
  body: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    color: lightPalette.textPrimary,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  metaText: {
    color: lightPalette.textTertiary,
  },
});
