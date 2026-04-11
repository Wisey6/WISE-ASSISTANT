export type Priority = 'low' | 'medium' | 'high';

export type TaskStatus = 'todo' | 'done';

export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

/**
 * A weekly recurrence rule — used for things like "I work Mon/Tue/Thu/Fri
 * 9-5" that we then project onto the calendar for the next few weeks.
 */
export interface Recurrence {
  days: Weekday[];
  /** "09:00" 24-hour time */
  startTime: string;
  /** "17:00" 24-hour time */
  endTime: string;
  /** How many weeks forward to project (default 4) */
  weeksAhead?: number;
}

export interface Task {
  id: string;
  title: string;
  notes?: string;

  /** Deadline — used when the task is "due by" a time. */
  dueAt: string | null;
  /** Optional scheduled time block (e.g. "work 9-5") */
  startAt?: string | null;
  endAt?: string | null;

  priority: Priority;
  status: TaskStatus;

  /** Who the task belongs to — "me" or a partner id */
  ownerId: string;

  /** Hex color (from tagColors) for this task's card / calendar block */
  color?: string;

  /** Optional rich context the assistant collects via follow-up questions */
  estimatedMinutes?: number;
  manager?: string;
  deliverables?: string;

  /** Recurrence — if present, a series of events will be materialized */
  recurrence?: Recurrence;

  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
}

export interface Partner {
  id: string;
  name: string;
  /** Hex color chosen from tagColors */
  color: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  partnerId: string | null;
}

export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt: string;
  /** Tasks that were created as a direct result of this turn */
  createdTaskIds?: string[];
  /** Suggested chips the user can tap to respond quickly */
  suggestions?: string[];
}

/**
 * The assistant runs a small state machine when it needs more info
 * to finish a task. When `kind` is set, the next user message will be
 * interpreted as an answer to `currentSlot`, not a new command.
 */
export type IntentKind = 'new-task' | 'new-schedule';

export type TaskSlot =
  | 'title'
  | 'dueAt'
  | 'estimatedMinutes'
  | 'manager'
  | 'deliverables';

export interface PendingIntent {
  kind: IntentKind;
  draft: Partial<Task>;
  /** Slots we still want to ask about, in the order we'll ask them. */
  pending: TaskSlot[];
  /** The slot the last question was about (what the user is now answering). */
  currentSlot: TaskSlot | null;
}

export interface ParsedTaskDraft {
  title: string;
  dueAt: string | null;
  priority: Priority;
  estimatedMinutes?: number;
  notes?: string;
  startAt?: string | null;
  endAt?: string | null;
  color?: string;
  recurrence?: Recurrence;
}
