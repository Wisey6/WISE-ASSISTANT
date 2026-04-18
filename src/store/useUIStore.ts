import { create } from 'zustand';

/**
 * Ephemeral UI state that multiple screens need to toggle (e.g. the
 * Ottley modal, which is opened from the tab bar but rendered once
 * at the MainTabs level).
 */
interface UIState {
  ottleyOpen: boolean;
  setOttleyOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  ottleyOpen: false,
  setOttleyOpen: (ottleyOpen) => set({ ottleyOpen }),
}));
