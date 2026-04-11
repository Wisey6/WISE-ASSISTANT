import { addDays, startOfWeek } from 'date-fns';
import { create } from 'zustand';

import { tagColors } from '@/theme';
import type {
  ParsedTaskDraft,
  Recurrence,
  Task,
  Weekday,
} from '@/types';
import { createId } from '@/utils/id';
import { toISO } from '@/utils/date';

interface TaskState {
  tasks: Task[];
  addTask: (draft: ParsedTaskDraft & { ownerId?: string }) => Task;
  addTasksFromDrafts: (drafts: ParsedTaskDraft[], ownerId: string) => Task[];
  addRecurringSchedule: (
    rule: Recurrence,
    args: {
      title: string;
      ownerId: string;
      color?: string;
    },
  ) => Task[];
  toggleTask: (id: string) => void;
  removeTask: (id: string) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
}

const DAY_INDEX: Record<Weekday, number> = {
  mon: 0,
  tue: 1,
  wed: 2,
  thu: 3,
  fri: 4,
  sat: 5,
  sun: 6,
};

const seed = (): Task[] => {
  const now = new Date();
  const inHours = (h: number) =>
    toISO(new Date(now.getTime() + h * 60 * 60 * 1000));
  const mkTime = (offset: number, hour: number, mins = 0) => {
    const d = new Date(now);
    d.setDate(d.getDate() + offset);
    d.setHours(hour, mins, 0, 0);
    return toISO(d);
  };
  return [
    {
      id: createId('task'),
      title: 'Cleaning room',
      dueAt: null,
      startAt: mkTime(0, 13, 0),
      endAt: mkTime(0, 15, 0),
      priority: 'medium',
      status: 'todo',
      ownerId: 'me',
      color: tagColors[1],
      createdAt: toISO(now),
      updatedAt: toISO(now),
    },
    {
      id: createId('task'),
      title: 'User research',
      dueAt: null,
      startAt: mkTime(0, 15, 0),
      endAt: mkTime(0, 17, 0),
      priority: 'high',
      status: 'todo',
      ownerId: 'me',
      color: tagColors[0],
      createdAt: toISO(now),
      updatedAt: toISO(now),
    },
    {
      id: createId('task'),
      title: 'Send kitchen quote to the Harpers',
      dueAt: inHours(4),
      priority: 'high',
      status: 'todo',
      ownerId: 'me',
      color: tagColors[2],
      estimatedMinutes: 30,
      createdAt: toISO(now),
      updatedAt: toISO(now),
    },
    {
      id: createId('task'),
      title: 'Going to the gym',
      dueAt: null,
      startAt: mkTime(1, 18, 0),
      endAt: mkTime(1, 19, 30),
      priority: 'low',
      status: 'todo',
      ownerId: 'me',
      color: tagColors[3],
      createdAt: toISO(now),
      updatedAt: toISO(now),
    },
    {
      id: createId('task'),
      title: 'Pick up groceries',
      dueAt: inHours(28),
      priority: 'medium',
      status: 'todo',
      ownerId: 'partner-1',
      color: tagColors[0],
      createdAt: toISO(now),
      updatedAt: toISO(now),
    },
  ];
};

/**
 * Task store. `addRecurringSchedule` projects a weekly rule onto the
 * next N weeks by materializing one Task per day — the calendar then
 * renders them as time blocks automatically.
 */
export const useTaskStore = create<TaskState>((set) => ({
  tasks: seed(),

  addTask: (draft) => {
    const now = toISO(new Date());
    const task: Task = {
      id: createId('task'),
      title: draft.title,
      notes: draft.notes,
      dueAt: draft.dueAt,
      startAt: draft.startAt ?? null,
      endAt: draft.endAt ?? null,
      priority: draft.priority,
      status: 'todo',
      ownerId: draft.ownerId ?? 'me',
      color: draft.color,
      estimatedMinutes: draft.estimatedMinutes,
      createdAt: now,
      updatedAt: now,
    };
    set((s) => ({ tasks: [task, ...s.tasks] }));
    return task;
  },

  addTasksFromDrafts: (drafts, ownerId) => {
    const now = toISO(new Date());
    const created: Task[] = drafts.map((d, idx) => ({
      id: createId('task'),
      title: d.title,
      notes: d.notes,
      dueAt: d.dueAt,
      startAt: d.startAt ?? null,
      endAt: d.endAt ?? null,
      priority: d.priority,
      status: 'todo',
      ownerId,
      color: d.color ?? tagColors[idx % tagColors.length],
      estimatedMinutes: d.estimatedMinutes,
      createdAt: now,
      updatedAt: now,
    }));
    set((s) => ({ tasks: [...created, ...s.tasks] }));
    return created;
  },

  addRecurringSchedule: (rule, args) => {
    const now = new Date();
    const weeks = rule.weeksAhead ?? 4;
    const start = startOfWeek(now, { weekStartsOn: 1 });
    const created: Task[] = [];

    for (let w = 0; w < weeks; w += 1) {
      for (const day of rule.days) {
        const offset = w * 7 + DAY_INDEX[day];
        const occurrence = addDays(start, offset);
        // Skip anything already in the past.
        if (occurrence.getTime() < now.getTime() - 12 * 60 * 60 * 1000)
          continue;

        const [sh, sm] = rule.startTime.split(':').map(Number);
        const [eh, em] = rule.endTime.split(':').map(Number);

        const startAt = new Date(occurrence);
        startAt.setHours(sh, sm, 0, 0);
        const endAt = new Date(occurrence);
        endAt.setHours(eh, em, 0, 0);

        const nowIso = toISO(new Date());
        created.push({
          id: createId('task'),
          title: args.title,
          dueAt: null,
          startAt: toISO(startAt),
          endAt: toISO(endAt),
          priority: 'medium',
          status: 'todo',
          ownerId: args.ownerId,
          color: args.color ?? tagColors[0],
          createdAt: nowIso,
          updatedAt: nowIso,
          recurrence: rule,
        });
      }
    }
    set((s) => ({ tasks: [...created, ...s.tasks] }));
    return created;
  },

  toggleTask: (id) =>
    set((s) => ({
      tasks: s.tasks.map((t) => {
        if (t.id !== id) return t;
        const now = toISO(new Date());
        const nextStatus = t.status === 'done' ? 'todo' : 'done';
        return {
          ...t,
          status: nextStatus,
          updatedAt: now,
          completedAt: nextStatus === 'done' ? now : null,
        };
      }),
    })),

  removeTask: (id) =>
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),

  updateTask: (id, patch) =>
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === id ? { ...t, ...patch, updatedAt: toISO(new Date()) } : t,
      ),
    })),
}));
