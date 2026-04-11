import { create } from 'zustand';

import { tagColors } from '@/theme';
import type { Partner } from '@/types';

interface PartnersState {
  partners: Partner[];
  /** The "me" color — rendered as a partner entry with id === 'me'. */
  meColor: string;
  addPartner: (name: string, color?: string) => Partner;
  setPartnerColor: (id: string, color: string) => void;
  setMeColor: (color: string) => void;
  removePartner: (id: string) => void;
  colorFor: (ownerId: string) => string;
}

/**
 * Partners + color tagging. The store exposes `colorFor(ownerId)` so
 * any screen that renders a task can tint it with the right color.
 */
export const usePartnersStore = create<PartnersState>((set, get) => ({
  partners: [
    { id: 'partner-1', name: 'Jamie', color: tagColors[0] }, // lavender
  ],
  meColor: tagColors[4], // sky

  addPartner: (name, color) => {
    const next: Partner = {
      id: `partner_${Date.now().toString(36)}`,
      name,
      color: color ?? tagColors[get().partners.length % tagColors.length],
    };
    set((s) => ({ partners: [...s.partners, next] }));
    return next;
  },

  setPartnerColor: (id, color) =>
    set((s) => ({
      partners: s.partners.map((p) => (p.id === id ? { ...p, color } : p)),
    })),

  setMeColor: (color) => set({ meColor: color }),

  removePartner: (id) =>
    set((s) => ({ partners: s.partners.filter((p) => p.id !== id) })),

  colorFor: (ownerId) => {
    const s = get();
    if (ownerId === 'me' || ownerId === 'local-user') return s.meColor;
    return s.partners.find((p) => p.id === ownerId)?.color ?? s.meColor;
  },
}));
