export type Priority = 'low' | 'medium' | 'high';

export type TaskStatus = 'todo' | 'done';

export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

/**
 * Rough category the assistant detects from a message. Drives which
 * follow-up questions the slot-filler asks — work tasks want a
 * manager + deliverables, a gym session doesn't.
 */
export type TaskContext =
  | 'work'
  | 'personal'
  | 'errands'
  | 'fitness'
  | 'social';

export interface Recurrence {
  days: Weekday[];
  startTime: string;
  endTime: string;
  weeksAhead?: number;
}

export interface Task {
  id: string;
  title: string;
  notes?: string;

  dueAt: string | null;
  startAt?: string | null;
  endAt?: string | null;

  priority: Priority;
  status: TaskStatus;
  ownerId: string;
  color?: string;

  estimatedMinutes?: number;
  manager?: string;
  deliverables?: string;
  context?: TaskContext;

  recurrence?: Recurrence;

  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
}

export interface Partner {
  id: string;
  name: string;
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
  createdTaskIds?: string[];
  suggestions?: string[];
}

export type IntentKind = 'new-task' | 'new-schedule';

export type TaskSlot =
  | 'title'
  | 'dueAt'
  | 'estimatedMinutes'
  | 'manager'
  | 'deliverables'
  | 'who';

export interface PendingIntent {
  kind: IntentKind;
  context?: TaskContext;
  draft: Partial<Task>;
  pending: TaskSlot[];
  currentSlot: TaskSlot | null;
  /** ownerId the task will go under (me or a partner id). */
  ownerId?: string;
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
  context?: TaskContext;
}
