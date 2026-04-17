import { isToday, isTomorrow, isPast, differenceInCalendarDays } from 'date-fns';

export type DueBucket = 'overdue' | 'today' | 'tomorrow' | 'thisWeek' | 'later';

export function bucketFor(dueAt: string | null): DueBucket | null {
  if (!dueAt) return null;
  const d = new Date(dueAt);
  if (isToday(d)) return 'today';
  if (isTomorrow(d)) return 'tomorrow';
  if (isPast(d)) return 'overdue';
  const days = differenceInCalendarDays(d, new Date());
  if (days <= 7) return 'thisWeek';
  return 'later';
}

export function daysUntil(dueAt: string): number {
  return differenceInCalendarDays(new Date(dueAt), new Date());
}

export function humanDueLabel(dueAt: string | null): string {
  if (!dueAt) return 'No due date';
  const d = new Date(dueAt);
  if (isToday(d)) return 'Today';
  if (isTomorrow(d)) return 'Tomorrow';
  const days = differenceInCalendarDays(d, new Date());
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days <= 7) return `In ${days} day${days === 1 ? '' : 's'}`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
