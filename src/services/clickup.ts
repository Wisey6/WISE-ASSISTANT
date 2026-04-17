import type { UnifiedTask } from '@/types/dashboard';
import { getSecret, SECRET_KEYS } from './secureStorage';

const API = 'https://api.clickup.com/api/v2';

type RawClickUpTask = {
  id: string;
  name: string;
  description?: string;
  status?: { status: string; type: string };
  due_date?: string | null;
  date_updated?: string;
  url?: string;
  tags?: { name: string }[];
};

async function token(): Promise<string | null> {
  const fromSecret = await getSecret(SECRET_KEYS.clickupToken);
  if (fromSecret) return fromSecret;
  return process.env.EXPO_PUBLIC_CLICKUP_API_TOKEN ?? null;
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const key = await token();
  if (!key) throw new Error('ClickUp token not configured');
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: key,
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    throw new Error(`ClickUp ${res.status}: ${await res.text()}`);
  }
  return (await res.json()) as T;
}

export async function listTasks(listId: string): Promise<UnifiedTask[]> {
  const data = await req<{ tasks: RawClickUpTask[] }>(
    `/list/${listId}/task?archived=false&subtasks=true`,
  );
  return data.tasks.map(mapTask);
}

export async function updateStatus(
  taskId: string,
  status: string,
): Promise<void> {
  await req(`/task/${taskId}`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
}

export async function createTask(
  listId: string,
  payload: { name: string; description?: string; due_date?: number },
): Promise<void> {
  await req(`/list/${listId}/task`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

function mapTask(t: RawClickUpTask): UnifiedTask {
  return {
    id: `clickup:${t.id}`,
    source: 'clickup',
    remoteId: t.id,
    title: t.name,
    notes: t.description,
    category: inferCategory(t),
    status: mapStatus(t.status?.type, t.status?.status),
    dueAt: t.due_date ? new Date(Number(t.due_date)).toISOString() : null,
    url: t.url,
    updatedAt: t.date_updated
      ? new Date(Number(t.date_updated)).toISOString()
      : new Date().toISOString(),
  };
}

function inferCategory(t: RawClickUpTask): UnifiedTask['category'] {
  const tags = (t.tags ?? []).map((tag) => tag.name.toLowerCase());
  if (tags.some((x) => x.includes('study') || x.includes('uni'))) return 'study';
  if (tags.some((x) => x.includes('personal') || x.includes('home'))) return 'personal';
  return 'work';
}

function mapStatus(
  type: string | undefined,
  label: string | undefined,
): UnifiedTask['status'] {
  if (type === 'closed') return 'completed';
  const l = (label ?? '').toLowerCase();
  if (l.includes('block')) return 'blocked';
  if (l.includes('progress') || l.includes('doing')) return 'inProgress';
  return 'todo';
}
