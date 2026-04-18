import { addHours, subHours } from 'date-fns';

import type { Suggestion } from '@/types/dashboard';
import { useDashboardStore } from '@/store/useDashboardStore';
import { useIntegrationsStore } from '@/store/useIntegrationsStore';

import * as graph from './microsoftGraph';
import * as google from './googleCalendar';
import * as clickup from './clickup';
import * as jokes from './jokes';
import * as notifSvc from './notifications';

const USE_MOCKS = process.env.EXPO_PUBLIC_USE_MOCKS !== '0';

/**
 * Enqueue a suggestion if a prior one with the same dedupeHash isn't
 * already present. This is the ONLY path new suggestions enter the
 * store from — chat tool calls and mail/Teams scans both funnel here.
 * Fires a push notification for background-scan suggestions.
 */
export function propose(s: Suggestion): void {
  const before = useDashboardStore.getState().suggestions.length;
  useDashboardStore.getState().proposeSuggestion(s);
  const after = useDashboardStore.getState().suggestions.length;
  if (after > before) {
    notifSvc
      .notifySuggestionArrived({ source: s.source, title: s.title })
      .catch(() => undefined);
  }
}

/**
 * Hourly scan. Pulls recent mail + Teams messages, refreshes the
 * joke, and (once Anthropic is wired) asks Claude to extract
 * schedulable intents. Everything it discovers is proposed — nothing
 * is committed to ClickUp or Calendar.
 */
export async function runHourlyScan(): Promise<void> {
  const store = useDashboardStore.getState();
  if (store.isRefreshing) return;
  store.setRefreshing(true);

  try {
    await refreshJoke();
    if (USE_MOCKS) return;
    await Promise.allSettled([
      refreshTasks(),
      refreshEvents(),
      scanOutlook(),
      scanTeams(),
    ]);
  } finally {
    useDashboardStore.getState().setRefreshing(false);
    useDashboardStore.getState().markRefreshed();
  }
}

async function refreshJoke(): Promise<void> {
  try {
    const joke = await jokes.getDailyJoke();
    useDashboardStore.getState().setJoke(joke);
  } catch {
    // Joke failures are never user-facing.
  }
}

async function refreshTasks(): Promise<void> {
  const listId = process.env.EXPO_PUBLIC_CLICKUP_LIST_ID;
  if (!listId) return;
  try {
    const tasks = await clickup.listTasks(listId);
    useDashboardStore.getState().mergeTasks(tasks);
    useIntegrationsStore.getState().markSynced('clickup');
  } catch (err) {
    useIntegrationsStore.getState().setError('clickup', errMsg(err));
  }
}

async function refreshEvents(): Promise<void> {
  try {
    const now = new Date();
    const events = await google.listEvents(subHours(now, 12), addHours(now, 72));
    useDashboardStore.getState().setEvents(events);
    useIntegrationsStore.getState().markSynced('google');
  } catch (err) {
    useIntegrationsStore.getState().setError('google', errMsg(err));
  }
}

async function scanOutlook(): Promise<void> {
  try {
    const since = new Date(
      useDashboardStore.getState().lastRefreshedAt ??
        new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    );
    const mail = await graph.listRecentMail(since);
    for (const m of mail) {
      propose({
        id: `outlook:${m.id}`,
        kind: 'create_task',
        source: 'outlook_scan',
        title: `Follow up on "${m.subject}"`,
        reason: `${m.from} emailed at ${new Date(m.receivedAt).toLocaleTimeString()}: ${m.preview.slice(0, 120)}`,
        payload: {
          task: {
            title: `Reply: ${m.subject}`,
            category: 'work',
            status: 'todo',
            source: 'manual',
          },
        },
        status: 'pending',
        createdAt: new Date().toISOString(),
        dedupeHash: `outlook:${m.id}`,
      });
    }
    useIntegrationsStore.getState().markSynced('microsoft');
  } catch (err) {
    useIntegrationsStore.getState().setError('microsoft', errMsg(err));
  }
}

async function scanTeams(): Promise<void> {
  try {
    const since = new Date(
      useDashboardStore.getState().lastRefreshedAt ??
        new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    );
    const messages = await graph.listTeamsMessages(since);
    for (const m of messages) {
      propose({
        id: `teams:${m.id}`,
        kind: 'create_task',
        source: 'teams_scan',
        title: `Reply to ${m.from} in Teams`,
        reason: m.preview.slice(0, 160),
        payload: {
          task: {
            title: `Respond to ${m.from}`,
            category: 'work',
            status: 'todo',
            source: 'manual',
          },
        },
        status: 'pending',
        createdAt: new Date().toISOString(),
        dedupeHash: `teams:${m.id}`,
      });
    }
  } catch {
    // Teams fails silently; covered by Outlook health signal.
  }
}

function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
