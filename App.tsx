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

/**
 * On boot we wire up:
 *   1. Notification permission (first launch only).
 *   2. Weekly Monday 7 AM briefing with the user's upcoming tasks.
 */
function useBootstrap() {
  const userName = useUserStore((s) => s.user.name);
  const tasks = useTaskStore((s) => s.tasks);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await requestNotificationPermission().catch(() => false);
      if (cancelled) return;

      const now = Date.now();
      const weekEnd = now + 7 * 24 * 60 * 60 * 1000;
      const upcoming = tasks
        .filter((t) => {
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

      await scheduleWeeklyBriefing({
        userName,
        upcomingTitles: upcoming,
      }).catch(() => undefined);
    })();

    return () => {
      cancelled = true;
    };
  }, [userName, tasks]);
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
