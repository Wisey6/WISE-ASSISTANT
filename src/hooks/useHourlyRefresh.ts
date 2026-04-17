import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';

const HOUR_MS = 60 * 60 * 1000;

function intervalMs(): number {
  const raw = process.env.EXPO_PUBLIC_SCAN_INTERVAL_MS;
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : HOUR_MS;
}

/**
 * Fires `onTick` once on mount, then every hour while the app is open.
 * Native background execution is registered separately via
 * expo-task-manager / expo-background-fetch once those deps land.
 */
export function useHourlyRefresh(onTick: () => void | Promise<void>): void {
  const tickRef = useRef(onTick);
  tickRef.current = onTick;

  useEffect(() => {
    let cancelled = false;

    const run = () => {
      if (cancelled) return;
      Promise.resolve(tickRef.current()).catch(() => undefined);
    };

    run();
    const id = setInterval(run, intervalMs());

    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') run();
    });

    // Web: re-run when the tab becomes visible again.
    let onVis: (() => void) | null = null;
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      onVis = () => {
        if (document.visibilityState === 'visible') run();
      };
      document.addEventListener('visibilitychange', onVis);
    }

    return () => {
      cancelled = true;
      clearInterval(id);
      sub.remove();
      if (onVis && typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVis);
      }
    };
  }, []);
}
