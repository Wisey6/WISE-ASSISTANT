import { useMemo } from 'react';
import { isToday, parseISO, isBefore } from 'date-fns';

import { useTaskStore } from '@/store/useTaskStore';
import type { Task } from '@/types';

export interface TaskInsights {
  total: number;
  completed: number;
  remaining: number;
  dueToday: number;
  overdue: number;
  highPriority: number;
  /** 0..1 completion ratio over the full list */
  completionRatio: number;
  /** A short, friendly headline like "You're on track" */
  headline: string;
  /** Totals of estimated work in minutes for today */
  estimatedMinutesToday: number;
  overloaded: boolean;
  openTasks: Task[];
  completedTasks: Task[];
}

/**
 * Derived insights over the current task list. Anything the dashboard
 * or briefing needs should flow through here so the rules stay in one
 * place and each screen renders the same numbers.
 */
export const useTaskInsights = (): TaskInsights => {
  const tasks = useTaskStore((s) => s.tasks);

  return useMemo(() => {
    const now = new Date();
    let completed = 0;
    let dueToday = 0;
    let overdue = 0;
    let highPriority = 0;
    let estimatedMinutesToday = 0;
    const openTasks: Task[] = [];
    const completedTasks: Task[] = [];

    for (const t of tasks) {
      if (t.status === 'done') {
        completed += 1;
        completedTasks.push(t);
        continue;
      }
      openTasks.push(t);
      if (t.priority === 'high') highPriority += 1;

      if (t.dueAt) {
        const due = parseISO(t.dueAt);
        if (isToday(due)) {
          dueToday += 1;
          estimatedMinutesToday += t.estimatedMinutes ?? 25;
        } else if (isBefore(due, now)) {
          overdue += 1;
        }
      }
    }

    const total = tasks.length;
    const remaining = total - completed;
    const completionRatio = total === 0 ? 0 : completed / total;

    // "Energy-aware" overload rule.
    const overloaded = dueToday > 4 || estimatedMinutesToday > 5 * 60;

    const headline = (() => {
      if (overdue > 0) return `${overdue} overdue — let's tackle them`;
      if (overloaded) return 'Busy day ahead';
      if (dueToday === 0) return "You're clear for today";
      if (dueToday <= 2) return "You're on track";
      return 'Steady day ahead';
    })();

    return {
      total,
      completed,
      remaining,
      dueToday,
      overdue,
      highPriority,
      completionRatio,
      headline,
      estimatedMinutesToday,
      overloaded,
      openTasks,
      completedTasks,
    };
  }, [tasks]);
};
