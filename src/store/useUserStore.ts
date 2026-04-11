import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { userPalettes } from '@/theme';
import type { User, UserId } from '@/types';

interface UserState {
  /** Which person owns this phone. Null until onboarding picks one. */
  currentUserId: UserId | null;
  /** Convenience — the full user object for the current phone. */
  user: User | null;
  /** True once the onboarding picker has been completed. */
  hasOnboarded: boolean;

  pickUser: (id: UserId) => void;
  signOut: () => void;
}

/**
 * App identity. There are exactly two users — Sarah and Tyler —
 * and each phone is locked to one of them at onboarding. Persisted
 * to AsyncStorage so the choice sticks across launches.
 */
export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      currentUserId: null,
      user: null,
      hasOnboarded: false,

      pickUser: (id) => {
        const palette = userPalettes[id];
        const user: User = {
          id,
          name: palette.name,
          color: palette.accent,
        };
        set({
          currentUserId: id,
          user,
          hasOnboarded: true,
        });
      },

      signOut: () =>
        set({
          currentUserId: null,
          user: null,
          hasOnboarded: false,
        }),
    }),
    {
      name: 'wise-user',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        currentUserId: state.currentUserId,
        user: state.user,
        hasOnboarded: state.hasOnboarded,
      }),
    },
  ),
);

/** Returns the opposite user ID — Sarah ↔ Tyler. */
export function otherUserId(id: UserId): UserId {
  return id === 'sarah' ? 'tyler' : 'sarah';
}
