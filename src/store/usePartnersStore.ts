import { create } from 'zustand';

import { userPalettes } from '@/theme';
import type { Partner } from '@/types';

import { useUserStore } from './useUserStore';

interface PartnersState {
  /**
   * Both fixed users. Even the one on "this" phone is here — so
   * calendar views can show tasks from both sides tinted correctly.
   */
  partners: Partner[];
  /** Look up the display color for any owner ID. */
  colorFor: (ownerId: string) => string;
  /** Look up the display name for any owner ID. */
  nameFor: (ownerId: string) => string;
}

const SARAH: Partner = {
  id: 'sarah',
  name: userPalettes.sarah.name,
  color: userPalettes.sarah.accent,
};

const TYLER: Partner = {
  id: 'tyler',
  name: userPalettes.tyler.name,
  color: userPalettes.tyler.accent,
};

/**
 * Fixed 2-user directory. Sarah is always pink, Tyler is always
 * blue — the "other" person is whoever isn't logged in on this
 * phone.
 *
 * `colorFor()` and `nameFor()` also accept the legacy 'me' owner
 * string (used by old seed data) and resolve it via the current
 * user store so existing tasks don't break.
 */
export const usePartnersStore = create<PartnersState>(() => ({
  partners: [SARAH, TYLER],

  colorFor: (ownerId) => {
    if (ownerId === 'sarah') return SARAH.color;
    if (ownerId === 'tyler') return TYLER.color;
    // Legacy fallback — old seed tasks used 'me' / 'local-user'.
    const current = useUserStore.getState().currentUserId;
    if (current) return current === 'sarah' ? SARAH.color : TYLER.color;
    return SARAH.color;
  },

  nameFor: (ownerId) => {
    if (ownerId === 'sarah') return SARAH.name;
    if (ownerId === 'tyler') return TYLER.name;
    const current = useUserStore.getState().currentUserId;
    return current === 'tyler' ? TYLER.name : SARAH.name;
  },
}));
