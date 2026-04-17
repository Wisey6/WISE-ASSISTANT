import { addDays, startOfWeek } from 'date-fns';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  notifyTaskCompleted,
  notifyTaskCreated,
} from '@/services/notifications';
import type {
  ParsedTaskDraft,
  Recurrence,
  Task,
  Weekday,
} from '@/types';
import { createId } from '@/utils/id';
import { toISO } from '@/utils/date';

import { useUserStore } from './useUserStore';

interface TaskState {
  tasks: Task[];
  addTask: (draft: ParsedTaskDraft) => Task;
  addTasksFromDrafts: (drafts: ParsedTaskDraft[]) => Task[];
  addRecurringSchedule: (
    rule: Recurrence,
    args: { title: string; color?: string },
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
  const mkTime = (offset: number, hour: number, mins = 0) => {
    const d = new Date(now);
    d.setDate(d.getDate() + offset);
    d.setHours(hour, mins, 0, 0);
    return toISO(d);
  };
  return [
    {
      id: createId('task'),
      title: 'Welcome to Wise',
      dueAt: null,
      startAt: mkTime(0, 9, 0),
      endAt: mkTime(0, 9, 30),
      priority: 'low',
      status: 'todo',
      createdAt: toISO(now),
      updatedAt: toISO(now),
    },
  ];
};

/**
 * Single-user task store. `addRecurringSchedule` projects a weekly
 * rule onto the next N weeks by materializing one Task per day — the
 * calendar then renders them as time blocks.
 */
export const useTaskStore = create<TaskState>()(
  persist(
    (set) => ({
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
          color: draft.color,
          estimatedMinutes: draft.estimatedMinutes,
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({ tasks: [task, ...s.tasks] }));
        const name = useUserStore.getState().user.name;
        notifyTaskCreated({ byName: name, title: task.title }).catch(
          () => undefined,
        );
        return task;
      },

      addTasksFromDrafts: (drafts) => {
        const now = toISO(new Date());
        const created: Task[] = drafts.map((d) => ({
          id: createId('task'),
          title: d.title,
          notes: d.notes,
          dueAt: d.dueAt,
          startAt: d.startAt ?? null,
          endAt: d.endAt ?? null,
          priority: d.priority,
          status: 'todo',
          color: d.color,
          estimatedMinutes: d.estimatedMinutes,
          createdAt: now,
          updatedAt: now,
        }));
        set((s) => ({ tasks: [...created, ...s.tasks] }));
        if (created.length > 0) {
          const name = useUserStore.getState().user.name;
          const summary =
            created.length === 1
              ? created[0].title
              : `${created[0].title} (+${created.length - 1} more)`;
          notifyTaskCreated({ byName: name, title: summary }).catch(
            () => undefined,
          );
        }
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
              color: args.color,
              createdAt: nowIso,
              updatedAt: nowIso,
              recurrence: rule,
            });
          }
        }
        set((s) => ({ tasks: [...created, ...s.tasks] }));
        return created;
      },

      toggleTask: (id) => {
        let finishedTitle: string | null = null;
        set((s) => ({
          tasks: s.tasks.map((t) => {
            if (t.id !== id) return t;
            const now = toISO(new Date());
            const nextStatus = t.status === 'done' ? 'todo' : 'done';
            if (nextStatus === 'done') finishedTitle = t.title;
            return {
              ...t,
              status: nextStatus,
              updatedAt: now,
              completedAt: nextStatus === 'done' ? now : null,
            };
          }),
        }));
        if (finishedTitle) {
          const name = useUserStore.getState().user.name;
          notifyTaskCompleted({ byName: name, title: finishedTitle }).catch(
            () => undefined,
          );
        }
      },

      removeTask: (id) =>
        set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),

      updateTask: (id, patch) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id ? { ...t, ...patch, updatedAt: toISO(new Date()) } : t,
          ),
        })),
    }),
    {
      name: 'wise-tasks',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ tasks: state.tasks }),
    },
  ),
);
