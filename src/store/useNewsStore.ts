import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type {
  AnthropicUpdate,
  CryptoMover,
  FootballFixture,
  FootballHeadline,
  StockMover,
  WeatherForecast,
} from '@/types/news';
import {
  fetchAnthropicUpdates,
  fetchArsenalHeadlines,
  fetchChampionsLeagueFixtures,
  fetchCryptoMovers,
  fetchStockMovers,
  fetchWeather,
} from '@/services/news';

export interface NewsState {
  weather: WeatherForecast | null;
  football: (FootballHeadline | FootballFixture)[];
  anthropic: AnthropicUpdate[];
  crypto: CryptoMover[];
  stocks: StockMover[];
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
      crypto: [],
      stocks: [],
      lastRefreshedAt: null,
      isRefreshing: false,

      refresh: async () => {
        if (get().isRefreshing) return;
        set({ isRefreshing: true });
        const [weather, headlines, fixtures, anthropic, crypto, stocks] =
          await Promise.all([
            fetchWeather().catch(() => null),
            fetchArsenalHeadlines().catch(() => []),
            fetchChampionsLeagueFixtures().catch(() => []),
            fetchAnthropicUpdates().catch(() => []),
            fetchCryptoMovers().catch(() => []),
            fetchStockMovers().catch(() => []),
          ]);
        const football: (FootballHeadline | FootballFixture)[] = [
          ...fixtures,
          ...headlines,
        ];
        set({
          weather,
          football,
          anthropic,
          crypto,
          stocks,
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
        crypto: s.crypto,
        stocks: s.stocks,
        lastRefreshedAt: s.lastRefreshedAt,
      }),
    },
  ),
);
