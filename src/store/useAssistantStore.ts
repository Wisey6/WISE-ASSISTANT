import { create } from 'zustand';

import type { AssistantMessage } from '@/types';
import { createId } from '@/utils/id';
import { toISO } from '@/utils/date';

interface AssistantState {
  messages: AssistantMessage[];
  isThinking: boolean;
  appendUser: (text: string) => AssistantMessage;
  appendAssistant: (text: string, createdTaskIds?: string[]) => AssistantMessage;
  setThinking: (thinking: boolean) => void;
  reset: () => void;
}

const welcome: AssistantMessage = {
  id: createId('msg'),
  role: 'assistant',
  text: "Hi, I'm your assistant. Tell me what's on your plate and I'll sort it into tasks.",
  createdAt: toISO(new Date()),
};

export const useAssistantStore = create<AssistantState>((set) => ({
  messages: [welcome],
  isThinking: false,

  appendUser: (text) => {
    const msg: AssistantMessage = {
      id: createId('msg'),
      role: 'user',
      text,
      createdAt: toISO(new Date()),
    };
    set((state) => ({ messages: [...state.messages, msg] }));
    return msg;
  },

  appendAssistant: (text, createdTaskIds) => {
    const msg: AssistantMessage = {
      id: createId('msg'),
      role: 'assistant',
      text,
      createdAt: toISO(new Date()),
      createdTaskIds,
    };
    set((state) => ({ messages: [...state.messages, msg] }));
    return msg;
  },

  setThinking: (isThinking) => set({ isThinking }),

  reset: () => set({ messages: [welcome], isThinking: false }),
}));
