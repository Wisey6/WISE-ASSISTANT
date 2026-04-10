import { create } from 'zustand';

import type { User } from '@/types';

interface UserState {
  user: User | null;
  hasOnboarded: boolean;
  setUser: (user: User | null) => void;
  completeOnboarding: () => void;
  linkPartner: (partnerId: string) => void;
}

/**
 * Auth + onboarding state. Real auth will come from Firebase, but
 * the rest of the app only depends on this shape — so swapping in
 * the real backend later is a one-file change.
 */
export const useUserStore = create<UserState>((set) => ({
  user: {
    id: 'local-user',
    name: 'Alex',
    email: 'alex@example.com',
    partnerId: null,
  },
  hasOnboarded: false,
  setUser: (user) => set({ user }),
  completeOnboarding: () => set({ hasOnboarded: true }),
  linkPartner: (partnerId) =>
    set((state) => ({
      user: state.user ? { ...state.user, partnerId } : state.user,
    })),
}));
