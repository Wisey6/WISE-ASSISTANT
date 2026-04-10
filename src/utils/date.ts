import {
  differenceInCalendarDays,
  format,
  isThisWeek,
  isToday,
  isTomorrow,
  parseISO,
} from 'date-fns';

export const toISO = (d: Date): string => d.toISOString();

export const fromISO = (iso: string): Date => parseISO(iso);

/** "Today", "Tomorrow", "Fri 12", or "Apr 18" — Apple-style short dates. */
export const formatDueLabel = (iso: string | null): string => {
  if (!iso) return 'No date';
  const d = parseISO(iso);
  if (isToday(d)) return 'Today';
  if (isTomorrow(d)) return 'Tomorrow';
  if (isThisWeek(d, { weekStartsOn: 1 })) return format(d, 'EEE');
  return format(d, 'MMM d');
};

export const formatTimeLabel = (iso: string | null): string => {
  if (!iso) return '';
  return format(parseISO(iso), 'h:mm a');
};

export const daysUntil = (iso: string | null): number | null => {
  if (!iso) return null;
  return differenceInCalendarDays(parseISO(iso), new Date());
};

export const greetingForNow = (): string => {
  const hour = new Date().getHours();
  if (hour < 5) return 'Good night';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};
