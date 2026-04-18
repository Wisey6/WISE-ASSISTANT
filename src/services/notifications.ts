import * as Notifications from 'expo-notifications';

import { fetchWeekForecast, summariseWeek } from './weather';

/**
 * Notification layer. Everything the app can schedule or fire
 * immediately lives here so screens and stores only call named
 * helpers — no expo-notifications imports anywhere else.
 *
 * We handle:
 *
 *   1. Permission request (fire from onboarding or Profile).
 *   2. Daily 7 AM briefing (task roll-up).
 *   3. Weekly Monday 7 AM briefing with weather + upcoming tasks.
 *   4. Task-due reminders 30 minutes before the deadline.
 *   5. Instant "social" pings: new task, task completed.
 */

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/* -------------------------------------------------------------------------
 * Daily morning briefing
 * -------------------------------------------------------------------------
 */

const MORNING_ID = 'morning-briefing';

export async function scheduleMorningBriefing(body: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(MORNING_ID).catch(
    () => undefined,
  );
  await Notifications.scheduleNotificationAsync({
    identifier: MORNING_ID,
    content: {
      title: 'Your morning briefing',
      body,
      sound: false,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 7,
      minute: 0,
    },
  });
}

/* -------------------------------------------------------------------------
 * Weekly briefing — fires Monday 7 AM with weather + week ahead
 * -------------------------------------------------------------------------
 */

const WEEKLY_ID = 'weekly-briefing';

export async function scheduleWeeklyBriefing(args: {
  userName: string;
  upcomingTitles: string[];
}): Promise<void> {
  // Cancel any previous weekly briefing before rescheduling.
  await Notifications.cancelScheduledNotificationAsync(WEEKLY_ID).catch(
    () => undefined,
  );

  const forecast = await fetchWeekForecast();
  const lines: string[] = [];

  if (forecast) {
    lines.push(summariseWeek(forecast));
  }

  if (args.upcomingTitles.length > 0) {
    lines.push('');
    lines.push('Coming up:');
    for (const title of args.upcomingTitles.slice(0, 4)) {
      lines.push(`• ${title}`);
    }
  }

  const body =
    lines.length > 0
      ? lines.join('\n')
      : 'Your week is wide open — tell me what\'s coming up.';

  await Notifications.scheduleNotificationAsync({
    identifier: WEEKLY_ID,
    content: {
      title: `${args.userName}'s week ahead`,
      body,
      sound: false,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: 2, // Monday (1=Sunday in expo-notifications)
      hour: 7,
      minute: 0,
    },
  });
}

/**
 * Fire an immediate "this is what your week looks like" push. Used
 * when the user asks for it on demand from the owl.
 */
export async function sendWeekAheadNow(args: {
  userName: string;
  upcomingTitles: string[];
}): Promise<void> {
  const forecast = await fetchWeekForecast();
  const lines: string[] = [];

  if (forecast) {
    lines.push(summariseWeek(forecast));
  }

  if (args.upcomingTitles.length > 0) {
    lines.push('');
    lines.push('Coming up:');
    for (const title of args.upcomingTitles.slice(0, 5)) {
      lines.push(`• ${title}`);
    }
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `${args.userName}'s week ahead`,
      body: lines.join('\n') || 'Nothing on the horizon yet.',
      sound: false,
    },
    trigger: null, // fire immediately
  });
}

/* -------------------------------------------------------------------------
 * Task-level scheduling
 * -------------------------------------------------------------------------
 */

export async function scheduleTaskReminder(args: {
  id: string;
  title: string;
  dueAt: string;
}): Promise<void> {
  const fireAt = new Date(args.dueAt);
  // Remind 30 minutes before the deadline.
  fireAt.setMinutes(fireAt.getMinutes() - 30);
  if (fireAt.getTime() < Date.now()) return;

  await Notifications.scheduleNotificationAsync({
    identifier: args.id,
    content: { title: 'Heads up', body: args.title },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: fireAt,
    },
  });
}

/* -------------------------------------------------------------------------
 * Instant "social" pings — fired when Sarah or Tyler does something
 * on their own phone so the partner sees it live-ish on theirs.
 *
 * NOTE: these are LOCAL notifications that fire on the device that
 * performed the action. For a true cross-device push we'd need a
 * backend (Firebase, Supabase, etc). For now the partner sees it
 * as a reassuring confirmation on the doer's own phone.
 * -------------------------------------------------------------------------
 */

export async function notifyTaskCreated(args: {
  byName: string;
  title: string;
}): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `${args.byName} added a task`,
      body: args.title,
      sound: false,
    },
    trigger: null,
  });
}

export async function notifyTaskCompleted(args: {
  byName: string;
  title: string;
}): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `${args.byName} finished a task`,
      body: args.title,
      sound: false,
    },
    trigger: null,
  });
}

const SOURCE_LABELS: Record<string, string> = {
  outlook_scan: 'from Outlook',
  teams_scan: 'from Teams',
  deadline_scan: 'from deadline watch',
  claude_chat: 'from Ottley',
};

/**
 * Fire a push when a new background-scan suggestion arrives. Chat-
 * initiated proposals are skipped — they already show up live while
 * the user is looking at the Ottley modal.
 */
export async function notifySuggestionArrived(args: {
  source: string;
  title: string;
}): Promise<void> {
  if (args.source === 'claude_chat') return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `Ottley — new suggestion ${SOURCE_LABELS[args.source] ?? ''}`.trim(),
      body: args.title,
      sound: false,
    },
    trigger: null,
  }).catch(() => undefined);
}
