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
    shouldShowAlert: true,
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
    // Daily 7 AM repeat — simplest trigger shape that works across
    // recent expo-notifications versions.
    trigger: {
      hour: 7,
      minute: 0,
      repeats: true,
    } as Notifications.NotificationTriggerInput,
  });
}

export async function scheduleTaskReminder(args: {
  id: string;
  title: string;
  dueAt: string;
}): Promise<void> {
  const trigger = new Date(args.dueAt);
  // Remind 30 minutes before the deadline.
  trigger.setMinutes(trigger.getMinutes() - 30);
  if (trigger.getTime() < Date.now()) return;

  await Notifications.scheduleNotificationAsync({
    identifier: args.id,
    content: { title: 'Heads up', body: args.title },
    trigger: { date: trigger } as Notifications.NotificationTriggerInput,
  });
}
