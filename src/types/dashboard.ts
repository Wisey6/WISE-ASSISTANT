import type { Category, Status } from '@/theme/categoryColors';

export type { Category, Status };

export type TaskSource = 'clickup' | 'local' | 'manual';
export type EventSource = 'google' | 'outlook' | 'local';

export interface UnifiedTask {
  id: string;
  source: TaskSource;
  /** Original id from the external system, if any. */
  remoteId?: string;
  title: string;
  notes?: string;
  category: Category;
  status: Status;
  dueAt: string | null;
  url?: string;
  updatedAt: string;
}

export interface UnifiedEvent {
  id: string;
  source: EventSource;
  remoteId?: string;
  title: string;
  startAt: string;
  endAt: string;
  location?: string;
  category: Category;
  attendees?: string[];
  url?: string;
}

export type SuggestionKind =
  | 'create_task'
  | 'update_status'
  | 'create_event'
  | 'prioritize'
  | 'reschedule';

export type SuggestionStatus = 'pending' | 'approved' | 'dismissed';

export type SuggestionSource =
  | 'claude_chat'
  | 'outlook_scan'
  | 'teams_scan'
  | 'deadline_scan';

export interface SuggestionPayload {
  task?: Partial<UnifiedTask>;
  event?: Partial<UnifiedEvent>;
  note?: string;
}

export interface Suggestion {
  id: string;
  kind: SuggestionKind;
  source: SuggestionSource;
  title: string;
  reason: string;
  payload: SuggestionPayload;
  status: SuggestionStatus;
  createdAt: string;
  dedupeHash: string;
}

export interface JokeOfTheDay {
  id: string;
  text: string;
  date: string;
}
