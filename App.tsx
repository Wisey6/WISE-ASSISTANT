import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { RootNavigator } from '@/navigation/RootNavigator';
import {
  requestNotificationPermission,
  scheduleWeeklyBriefing,
} from '@/services/notifications';
import { useTaskStore } from '@/store/useTaskStore';
import { useUserStore } from '@/store/useUserStore';
import type { UserId } from '@/types';

/**
 * On boot we wire up two things:
 *
 *   1. Ask for notification permission (only fires the first time).
 *   2. Schedule the weekly Monday 7 AM briefing with the current
 *      user's name and their upcoming tasks for the next 7 days.
 *
 * The weekly briefing is re-scheduled each time the app launches so
 * the task list + weather stay fresh.
 */
function useBootstrap() {
  const currentUserId = useUserStore((s) => s.currentUserId);
  const tasks = useTaskStore((s) => s.tasks);

  useEffect(() => {
    if (!currentUserId) return;

    let cancelled = false;
    (async () => {
      await requestNotificationPermission().catch(() => false);
      if (cancelled) return;

      const myId = currentUserId as UserId;
      const now = Date.now();
      const weekEnd = now + 7 * 24 * 60 * 60 * 1000;
      const upcoming = tasks
        .filter((t) => {
          const owner = t.ownerId === 'me' || t.ownerId === 'local-user' ? myId : t.ownerId;
          if (owner !== myId) return false;
          const when = t.startAt ?? t.dueAt;
          if (!when) return false;
          const ts = new Date(when).getTime();
          return ts >= now && ts <= weekEnd;
        })
        .sort((a, b) => {
          const aw = new Date(a.startAt ?? a.dueAt ?? 0).getTime();
          const bw = new Date(b.startAt ?? b.dueAt ?? 0).getTime();
          return aw - bw;
        })
        .slice(0, 5)
        .map((t) => t.title);

      const { user } = useUserStore.getState();
      await scheduleWeeklyBriefing({
        userName: user?.name ?? 'you',
        upcomingTitles: upcoming,
      }).catch(() => undefined);
    })();

    return () => {
      cancelled = true;
    };
  }, [currentUserId, tasks]);
}

function BootstrapGate() {
  useBootstrap();
  return null;
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <BootstrapGate />
        <RootNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
