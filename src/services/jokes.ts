import AsyncStorage from '@react-native-async-storage/async-storage';

import type { JokeOfTheDay } from '@/types/dashboard';
import { createId } from '@/utils/id';

const ENDPOINT = process.env.EXPO_PUBLIC_JOKES_API ?? 'https://icanhazdadjoke.com/';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function key(date: string): string {
  return `wise.joke.${date}`;
}

export async function getDailyJoke(): Promise<JokeOfTheDay> {
  const date = today();
  const cached = await AsyncStorage.getItem(key(date));
  if (cached) {
    try {
      return JSON.parse(cached) as JokeOfTheDay;
    } catch {
      // fall through to refetch
    }
  }
  const joke = await fetchRemote();
  const value: JokeOfTheDay = { id: createId('joke'), text: joke, date };
  await AsyncStorage.setItem(key(date), JSON.stringify(value));
  return value;
}

async function fetchRemote(): Promise<string> {
  const res = await fetch(ENDPOINT, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Joke API ${res.status}`);
  const data = (await res.json()) as { joke?: string };
  return data.joke ?? 'No joke today.';
}
