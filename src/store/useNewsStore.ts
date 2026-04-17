import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type {
  AnthropicUpdate,
  FootballFixture,
  FootballHeadline,
  WeatherForecast,
} from '@/types/news';
import {
  fetchAnthropicUpdates,
  fetchArsenalHeadlines,
  fetchChampionsLeagueFixtures,
  fetchWeather,
} from '@/services/news';

export interface NewsState {
  weather: WeatherForecast | null;
  football: (FootballHeadline | FootballFixture)[];
  anthropic: AnthropicUpdate[];
  lastRefreshedAt: string | null;
  isRefreshing: boolean;
  refresh: () => Promise<void>;
}

export const useNewsStore = create<NewsState>()(
  persist(
    (set, get) => ({
      weather: null,
      football: [],
      anthropic: [],
      lastRefreshedAt: null,
      isRefreshing: false,

      refresh: async () => {
        if (get().isRefreshing) return;
        set({ isRefreshing: true });
        const [weather, headlines, fixtures, anthropic] = await Promise.all([
          fetchWeather().catch(() => null),
          fetchArsenalHeadlines().catch(() => []),
          fetchChampionsLeagueFixtures().catch(() => []),
          fetchAnthropicUpdates().catch(() => []),
        ]);
        // Interleave headlines + fixtures with fixtures first (more timely)
        const football: (FootballHeadline | FootballFixture)[] = [
          ...fixtures,
          ...headlines,
        ];
        set({
          weather,
          football,
          anthropic,
          lastRefreshedAt: new Date().toISOString(),
          isRefreshing: false,
        });
      },
    }),
    {
      name: 'wise-news',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        weather: s.weather,
        football: s.football,
        anthropic: s.anthropic,
        lastRefreshedAt: s.lastRefreshedAt,
      }),
    },
  ),
);
