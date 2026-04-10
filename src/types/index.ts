export type Priority = 'low' | 'medium' | 'high';

export type TaskStatus = 'todo' | 'done';

export interface Task {
  id: string;
  title: string;
  notes?: string;
  /** ISO 8601. Null means no deadline yet. */
  dueAt: string | null;
  priority: Priority;
  status: TaskStatus;
  /** user id of the person who owns the task */
  ownerId: string;
  /** uids the task is shared with */
  sharedWith: string[];
  /** rough estimate in minutes — used for "energy-aware" scheduling */
  estimatedMinutes?: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
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
  /** tasks that the assistant created from this message, if any */
  createdTaskIds?: string[];
}

export interface ParsedTaskDraft {
  title: string;
  dueAt: string | null;
  priority: Priority;
  estimatedMinutes?: number;
  notes?: string;
}

export interface ParseResult {
  tasks: ParsedTaskDraft[];
  summary: string;
  /** true if the assistant thinks the user is over-committed */
  overloaded: boolean;
}
