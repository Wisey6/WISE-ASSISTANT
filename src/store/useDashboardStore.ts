import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type {
  JokeOfTheDay,
  Suggestion,
  UnifiedEvent,
  UnifiedTask,
} from '@/types/dashboard';
import {
  mockEvents,
  mockJoke,
  mockSuggestions,
  mockTasks,
} from '@/utils/mockDashboardData';
import { toISO } from '@/utils/date';

const USE_MOCKS = process.env.EXPO_PUBLIC_USE_MOCKS !== '0';

interface DashboardState {
  tasks: UnifiedTask[];
  events: UnifiedEvent[];
  suggestions: Suggestion[];
  joke: JokeOfTheDay | null;
  lastRefreshedAt: string | null;
  isRefreshing: boolean;

  setTasks: (tasks: UnifiedTask[]) => void;
  mergeTasks: (incoming: UnifiedTask[]) => void;
  setEvents: (events: UnifiedEvent[]) => void;
  setJoke: (joke: JokeOfTheDay) => void;

  /** Enqueue a suggestion. No-ops if the dedupeHash already exists. */
  proposeSuggestion: (s: Suggestion) => void;
  approveSuggestion: (id: string) => Suggestion | null;
  dismissSuggestion: (id: string) => void;

  setRefreshing: (flag: boolean) => void;
  markRefreshed: () => void;
  resetToMocks: () => void;
}

const hydrate = (): Pick<
  DashboardState,
  'tasks' | 'events' | 'suggestions' | 'joke'
> => {
  if (!USE_MOCKS) {
    return { tasks: [], events: [], suggestions: [], joke: null };
  }
  return {
    tasks: mockTasks(),
    events: mockEvents(),
    suggestions: mockSuggestions(),
    joke: mockJoke(),
  };
};

/**
 * The single source of truth the Dashboard reads from. Writes into
 * ClickUp / Google Calendar happen ONLY through `approveSuggestion`;
 * nothing on this screen mutates external systems without an explicit
 * user tap. That invariant is enforced at the store layer — services
 * shouldn't import each other to get around it.
 */
export const useDashboardStore = create<DashboardState>()(
  persist(
    (set, get) => ({
      ...hydrate(),
      lastRefreshedAt: null,
      isRefreshing: false,

      setTasks: (tasks) => set({ tasks }),

      mergeTasks: (incoming) =>
        set((s) => {
          const byKey = new Map<string, UnifiedTask>();
          for (const t of s.tasks) byKey.set(keyOf(t), t);
          for (const t of incoming) byKey.set(keyOf(t), t);
          return { tasks: Array.from(byKey.values()) };
        }),

      setEvents: (events) => set({ events }),

      setJoke: (joke) => set({ joke }),

      proposeSuggestion: (s) => {
        const existing = get().suggestions.find(
          (x) => x.dedupeHash === s.dedupeHash,
        );
        if (existing) return;
        set((state) => ({ suggestions: [s, ...state.suggestions] }));
      },

      approveSuggestion: (id) => {
        const target = get().suggestions.find((s) => s.id === id);
        if (!target) return null;
        set((state) => ({
          suggestions: state.suggestions.map((s) =>
            s.id === id ? { ...s, status: 'approved' } : s,
          ),
        }));
        return target;
      },

      dismissSuggestion: (id) =>
        set((state) => ({
          suggestions: state.suggestions.map((s) =>
            s.id === id ? { ...s, status: 'dismissed' } : s,
          ),
        })),

      setRefreshing: (isRefreshing) => set({ isRefreshing }),

      markRefreshed: () => set({ lastRefreshedAt: toISO(new Date()) }),

      resetToMocks: () =>
        set({
          ...hydrate(),
          lastRefreshedAt: null,
          isRefreshing: false,
        }),
    }),
    {
      name: 'wise-dashboard',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        tasks: s.tasks,
        events: s.events,
        suggestions: s.suggestions,
        joke: s.joke,
        lastRefreshedAt: s.lastRefreshedAt,
      }),
    },
  ),
);

function keyOf(t: UnifiedTask): string {
  return t.remoteId ? `${t.source}:${t.remoteId}` : `local:${t.id}`;
}
