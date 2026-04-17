import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { User } from '@/types';

interface UserState {
  user: User;
  setName: (name: string) => void;
}

const DEFAULT_USER: User = { name: 'Tyler' };

/**
 * Single-user app identity. No onboarding picker, no partner. The
 * user can rename themselves on the Profile screen if they want.
 */
export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: DEFAULT_USER,
      setName: (name) =>
        set((s) => ({ user: { ...s.user, name: name.trim() || DEFAULT_USER.name } })),
    }),
    {
      name: 'wise-user',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ user: state.user }),
    },
  ),
);
