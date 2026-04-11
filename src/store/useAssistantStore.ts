import { create } from 'zustand';

import type { AssistantMessage, PendingIntent } from '@/types';
import { createId } from '@/utils/id';
import { toISO } from '@/utils/date';
import type { OwlState } from '@/components/OwlCharacter';

interface AssistantState {
  messages: AssistantMessage[];
  isThinking: boolean;
  /** Slot-filling machine state — null means we're idle. */
  pendingIntent: PendingIntent | null;
  /** What the owl should be doing right now. */
  owlMood: OwlState;

  appendUser: (text: string) => AssistantMessage;
  appendAssistant: (
    text: string,
    opts?: { createdTaskIds?: string[]; suggestions?: string[] },
  ) => AssistantMessage;
  setThinking: (thinking: boolean) => void;
  setPendingIntent: (intent: PendingIntent | null) => void;
  setOwlMood: (mood: OwlState) => void;
  reset: () => void;
}

const welcome: AssistantMessage = {
  id: createId('msg'),
  role: 'assistant',
  text: "Morning — what's on your plate today?",
  createdAt: toISO(new Date()),
  suggestions: [
    'I have a new task at work',
    'I work weekdays 9–5 except Wednesday',
    'What do I have today?',
  ],
};

export const useAssistantStore = create<AssistantState>((set) => ({
  messages: [welcome],
  isThinking: false,
  pendingIntent: null,
  owlMood: 'idle',

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
  setOwlMood: (owlMood) => set({ owlMood }),

  reset: () =>
    set({
      messages: [welcome],
      isThinking: false,
      pendingIntent: null,
      owlMood: 'idle',
    }),
}));
