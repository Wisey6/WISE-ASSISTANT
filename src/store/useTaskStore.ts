import { create } from 'zustand';

import type { ParsedTaskDraft, Task } from '@/types';
import { createId } from '@/utils/id';
import { toISO } from '@/utils/date';

interface TaskState {
  tasks: Task[];
  addTask: (draft: ParsedTaskDraft & { ownerId?: string }) => Task;
  addTasksFromDrafts: (drafts: ParsedTaskDraft[], ownerId: string) => Task[];
  toggleTask: (id: string) => void;
  removeTask: (id: string) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
}

const seed = (): Task[] => {
  const now = new Date();
  const inHours = (h: number) =>
    toISO(new Date(now.getTime() + h * 60 * 60 * 1000));
  return [
    {
      id: createId('task'),
      title: 'Send kitchen quote to the Harpers',
      dueAt: inHours(4),
      priority: 'high',
      status: 'todo',
      ownerId: 'local-user',
      sharedWith: [],
      estimatedMinutes: 30,
      createdAt: toISO(now),
      updatedAt: toISO(now),
    },
    {
      id: createId('task'),
      title: 'Order oak flooring for the Miller job',
      dueAt: inHours(28),
      priority: 'medium',
      status: 'todo',
      ownerId: 'local-user',
      sharedWith: [],
      estimatedMinutes: 20,
      createdAt: toISO(now),
      updatedAt: toISO(now),
    },
    {
      id: createId('task'),
      title: 'Book scaffolding for next week',
      dueAt: inHours(72),
      priority: 'low',
      status: 'todo',
      ownerId: 'local-user',
      sharedWith: [],
      estimatedMinutes: 15,
      createdAt: toISO(now),
      updatedAt: toISO(now),
    },
    {
      id: createId('task'),
      title: 'Follow up with tiler',
      dueAt: null,
      priority: 'low',
      status: 'done',
      ownerId: 'local-user',
      sharedWith: [],
      createdAt: toISO(now),
      updatedAt: toISO(now),
      completedAt: toISO(now),
    },
  ];
};

/**
 * Task store. We keep the update rule simple: mutation always produces
 * a new `updatedAt`, and toggling sets `completedAt` so analytics can
 * reason about it later.
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
      priority: draft.priority,
      status: 'todo',
      ownerId: draft.ownerId ?? 'local-user',
      sharedWith: [],
      estimatedMinutes: draft.estimatedMinutes,
      createdAt: now,
      updatedAt: now,
    };
    set((state) => ({ tasks: [task, ...state.tasks] }));
    return task;
  },

  addTasksFromDrafts: (drafts, ownerId) => {
    const now = toISO(new Date());
    const created: Task[] = drafts.map((d) => ({
      id: createId('task'),
      title: d.title,
      notes: d.notes,
      dueAt: d.dueAt,
      priority: d.priority,
      status: 'todo',
      ownerId,
      sharedWith: [],
      estimatedMinutes: d.estimatedMinutes,
      createdAt: now,
      updatedAt: now,
    }));
    set((state) => ({ tasks: [...created, ...state.tasks] }));
    return created;
  },

  toggleTask: (id) =>
    set((state) => ({
      tasks: state.tasks.map((t) => {
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
    set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) })),

  updateTask: (id, patch) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id ? { ...t, ...patch, updatedAt: toISO(new Date()) } : t,
      ),
    })),
}));
