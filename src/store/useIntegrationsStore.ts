import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type {
  IntegrationConnection,
  IntegrationId,
} from '@/types/integrations';

const empty = (label: string): IntegrationConnection => ({
  connected: false,
  label,
  lastSyncedAt: 0,
});

interface IntegrationsState {
  providers: Record<IntegrationId, IntegrationConnection>;
  setConnected: (id: IntegrationId, account?: string) => void;
  setDisconnected: (id: IntegrationId) => void;
  markSynced: (id: IntegrationId) => void;
  setError: (id: IntegrationId, error: string | undefined) => void;
}

/**
 * Non-sensitive connection metadata. Actual OAuth tokens + API keys
 * live in expo-secure-store (see services/secureStorage.ts) — do NOT
 * add token fields to this store.
 */
export const useIntegrationsStore = create<IntegrationsState>()(
  persist(
    (set) => ({
      providers: {
        clickup: empty('ClickUp'),
        google: empty('Google Calendar'),
        microsoft: empty('Outlook + Teams'),
        anthropic: empty('Claude'),
      },

      setConnected: (id, account) =>
        set((s) => ({
          providers: {
            ...s.providers,
            [id]: {
              ...s.providers[id],
              connected: true,
              account,
              error: undefined,
            },
          },
        })),

      setDisconnected: (id) =>
        set((s) => ({
          providers: {
            ...s.providers,
            [id]: {
              ...empty(s.providers[id].label),
            },
          },
        })),

      markSynced: (id) =>
        set((s) => ({
          providers: {
            ...s.providers,
            [id]: { ...s.providers[id], lastSyncedAt: Date.now() },
          },
        })),

      setError: (id, error) =>
        set((s) => ({
          providers: {
            ...s.providers,
            [id]: { ...s.providers[id], error },
          },
        })),
    }),
    {
      name: 'wise-integrations',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ providers: s.providers }),
    },
  ),
);
