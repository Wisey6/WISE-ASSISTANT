import { create } from 'zustand';

import type { AssistantMessage, PendingIntent } from '@/types';
import { createId } from '@/utils/id';
import { toISO } from '@/utils/date';

interface AssistantState {
  messages: AssistantMessage[];
  isThinking: boolean;
  /** Slot-filling machine state — null means we're idle. */
  pendingIntent: PendingIntent | null;

  appendUser: (text: string) => AssistantMessage;
  appendAssistant: (
    text: string,
    opts?: { createdTaskIds?: string[]; suggestions?: string[] },
  ) => AssistantMessage;
  setThinking: (thinking: boolean) => void;
  setPendingIntent: (intent: PendingIntent | null) => void;
  reset: () => void;
}

const welcome: AssistantMessage = {
  id: createId('msg'),
  role: 'assistant',
  text:
    "Ottley here. Professional chaos-wrangler, amateur joke-teller. What are we pretending to have under control today?",
  createdAt: toISO(new Date()),
  suggestions: [
    "Plan my week",
    "What's due this week?",
    "Tell me a joke",
    "Add a task",
  ],
};

export const useAssistantStore = create<AssistantState>((set) => ({
  messages: [welcome],
  isThinking: false,
  pendingIntent: null,

  appendUser: (text) => {
    const msg: AssistantMessage = {
      id: createId('msg'),
      role: 'user',
      text,
      createdAt: toISO(new Date()),
    };
    set((s) => ({ messages: [...s.messages, msg] }));
    return msg;
  },

  appendAssistant: (text, opts) => {
    const msg: AssistantMessage = {
      id: createId('msg'),
      role: 'assistant',
      text,
      createdAt: toISO(new Date()),
      createdTaskIds: opts?.createdTaskIds,
      suggestions: opts?.suggestions,
    };
    set((s) => ({ messages: [...s.messages, msg] }));
    return msg;
  },

  setThinking: (isThinking) => set({ isThinking }),
  setPendingIntent: (pendingIntent) => set({ pendingIntent }),

  reset: () =>
    set({
      messages: [welcome],
      isThinking: false,
      pendingIntent: null,
    }),
}));
