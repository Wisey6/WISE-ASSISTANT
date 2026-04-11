import * as Notifications from 'expo-notifications';

/**
 * Notification setup. We only need two things right now:
 *
 *   1. A 7 AM local notification that runs the morning briefing.
 *   2. Permission request we can fire from onboarding.
 *
 * All the scheduling logic lives here so screens don't have to
 * think about triggers.
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
