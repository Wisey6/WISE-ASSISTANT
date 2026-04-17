export type Priority = 'low' | 'medium' | 'high';

export type TaskStatus = 'todo' | 'done';

export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

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

export interface User {
  name: string;
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
  | 'deliverables';

export interface PendingIntent {
  kind: IntentKind;
  context?: TaskContext;
  draft: Partial<Task>;
  pending: TaskSlot[];
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
  context?: TaskContext;
}
