import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { DEFAULT_MODEL, type ModelId } from '@/services/anthropic';
import type { User } from '@/types';

interface UserState {
  user: User;
  modelPreference: ModelId;
  setName: (name: string) => void;
  setModelPreference: (model: ModelId) => void;
}

const DEFAULT_USER: User = { name: 'Tyler' };

/**
 * Single-user app identity. No onboarding picker, no partner. The
 * user can rename themselves and swap Claude models on Profile.
 */
export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: DEFAULT_USER,
      modelPreference: DEFAULT_MODEL,
      setName: (name) =>
        set((s) => ({ user: { ...s.user, name: name.trim() || DEFAULT_USER.name } })),
      setModelPreference: (modelPreference) => set({ modelPreference }),
    }),
    {
      name: 'wise-user',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        modelPreference: state.modelPreference,
      }),
    },
  ),
);
