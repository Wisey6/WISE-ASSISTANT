import type { UnifiedEvent } from '@/types/dashboard';
import { getSecret, SECRET_KEYS } from './secureStorage';

const API = 'https://www.googleapis.com/calendar/v3';

type RawGoogleEvent = {
  id: string;
  summary: string;
  location?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  attendees?: { email: string; displayName?: string }[];
  htmlLink?: string;
};

async function accessToken(): Promise<string | null> {
  return getSecret(SECRET_KEYS.googleAccessToken);
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await accessToken();
  if (!token) throw new Error('Google access token not available');
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    throw new Error(`Google ${res.status}: ${await res.text()}`);
  }
  return (await res.json()) as T;
}

export async function listEvents(
  timeMin: Date,
  timeMax: Date,
  calendarId = 'primary',
): Promise<UnifiedEvent[]> {
  const qs = new URLSearchParams({
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '50',
  });
  const data = await req<{ items: RawGoogleEvent[] }>(
    `/calendars/${encodeURIComponent(calendarId)}/events?${qs}`,
  );
  return data.items.map(mapEvent);
}

export async function createEvent(payload: {
  summary: string;
  start: string;
  end: string;
  location?: string;
}): Promise<void> {
  await req('/calendars/primary/events', {
    method: 'POST',
    body: JSON.stringify({
      summary: payload.summary,
      location: payload.location,
      start: { dateTime: payload.start },
      end: { dateTime: payload.end },
    }),
  });
}

function mapEvent(e: RawGoogleEvent): UnifiedEvent {
  const start = e.start.dateTime ?? `${e.start.date}T00:00:00Z`;
  const end = e.end.dateTime ?? `${e.end.date}T00:00:00Z`;
  return {
    id: `google:${e.id}`,
    source: 'google',
    remoteId: e.id,
    title: e.summary ?? '(untitled)',
    startAt: start,
    endAt: end,
    location: e.location,
    category: 'work',
    attendees: e.attendees?.map((a) => a.displayName ?? a.email),
    url: e.htmlLink,
  };
}
