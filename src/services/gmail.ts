import { getSecret, SECRET_KEYS } from './secureStorage';

const API = 'https://gmail.googleapis.com/gmail/v1/users/me';

export interface GmailThreadSummary {
  id: string;
  subject: string;
  snippet: string;
  from: string;
  date: string;
}

export interface GmailThread {
  id: string;
  subject: string;
  messages: { from: string; date: string; body: string }[];
}

async function token(): Promise<string | null> {
  return getSecret(SECRET_KEYS.googleAccessToken);
}

async function req<T>(path: string): Promise<T> {
  const t = await token();
  if (!t) throw new Error('Google access token not available');
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${t}` },
  });
  if (!res.ok) throw new Error(`Gmail ${res.status}: ${await res.text()}`);
  return (await res.json()) as T;
}

interface RawList {
  threads?: { id: string }[];
}

interface RawThread {
  id: string;
  messages?: {
    payload?: {
      headers?: { name: string; value: string }[];
      body?: { data?: string };
      parts?: { body?: { data?: string } }[];
    };
    snippet?: string;
    internalDate?: string;
  }[];
}

export async function searchThreads(
  query: string,
  limit = 10,
): Promise<GmailThreadSummary[]> {
  const qs = new URLSearchParams({
    q: query,
    maxResults: String(Math.min(limit, 25)),
  });
  const list = await req<RawList>(`/threads?${qs}`);
  const ids = (list.threads ?? []).slice(0, limit).map((t) => t.id);
  const details = await Promise.all(ids.map((id) => summary(id)));
  return details.filter((x): x is GmailThreadSummary => x !== null);
}

async function summary(id: string): Promise<GmailThreadSummary | null> {
  const t = await req<RawThread>(`/threads/${id}?format=metadata`);
  const first = t.messages?.[0];
  if (!first) return null;
  const headers = first.payload?.headers ?? [];
  const find = (name: string) =>
    headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? '';
  return {
    id,
    subject: find('Subject') || '(no subject)',
    from: find('From'),
    date: first.internalDate
      ? new Date(Number(first.internalDate)).toISOString()
      : '',
    snippet: first.snippet ?? '',
  };
}

export async function readThread(id: string): Promise<GmailThread | null> {
  const t = await req<RawThread>(`/threads/${id}?format=full`);
  if (!t.messages) return null;
  const msgs = t.messages.map((m) => {
    const headers = m.payload?.headers ?? [];
    const find = (name: string) =>
      headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ??
      '';
    const raw =
      m.payload?.body?.data ??
      m.payload?.parts?.[0]?.body?.data ??
      '';
    const body = raw ? decodeBase64Url(raw) : m.snippet ?? '';
    return { from: find('From'), date: find('Date'), body };
  });
  const subject =
    t.messages[0].payload?.headers?.find(
      (h) => h.name.toLowerCase() === 'subject',
    )?.value ?? '(no subject)';
  return { id, subject, messages: msgs };
}

function decodeBase64Url(s: string): string {
  try {
    const base64 = s.replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4 === 0 ? '' : '='.repeat(4 - (base64.length % 4));
    if (typeof atob === 'function') return atob(base64 + pad);
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return Buffer.from(base64 + pad, 'base64').toString('utf-8');
  } catch {
    return '';
  }
}
