import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * `useVoiceInput`
 *
 * Small hook that wraps expo-audio's recorder so any screen can ask:
 *
 *   const voice = useVoiceInput();
 *   voice.toggle();          // start / stop
 *   voice.isRecording
 *   voice.lastDurationMs
 *
 * It handles the permission request lazily on the first toggle so
 * we never show an iOS dialog on screen mount.
 *
 * NOTE: this records audio to a local file. Transcription to text
 * requires a backend (e.g. OpenAI Whisper). For the current build,
 * when recording stops we return the duration + file URI; screens
 * can feed a placeholder string into the parser, or wire up Whisper
 * behind an env var without changing anything here.
 */
export interface VoiceInput {
  isRecording: boolean;
  lastDurationMs: number;
  toggle: () => Promise<void>;
  stop: () => Promise<{ uri: string | null; durationMs: number } | null>;
}

export function useVoiceInput(): VoiceInput {
  const recorder = useAudioRecorder(RecordingPresets.LOW_QUALITY);
  const state = useAudioRecorderState(recorder, 200);
  const [lastDurationMs, setLastDurationMs] = useState(0);
  const permissionChecked = useRef(false);

  useEffect(() => {
    return () => {
      // Make sure we don't leave the mic hot if the screen unmounts.
      if (recorder.isRecording) {
        recorder.stop().catch(() => undefined);
      }
    };
  }, [recorder]);

  const ensurePermission = useCallback(async (): Promise<boolean> => {
    if (permissionChecked.current) return true;
    const { granted } = await requestRecordingPermissionsAsync();
    permissionChecked.current = granted;
    return granted;
  }, []);

  const toggle = useCallback(async () => {
    if (recorder.isRecording) {
      try {
        await recorder.stop();
        setLastDurationMs(state.durationMillis ?? 0);
      } catch {
        // ignore
      }
      return;
    }
    const ok = await ensurePermission();
    if (!ok) return;
    try {
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch {
      // ignore
    }
  }, [recorder, state.durationMillis, ensurePermission]);

  const stop = useCallback(async () => {
    if (!recorder.isRecording) return null;
    try {
      await recorder.stop();
      const durationMs = state.durationMillis ?? 0;
      setLastDurationMs(durationMs);
      return { uri: recorder.uri ?? null, durationMs };
    } catch {
      return null;
    }
  }, [recorder, state.durationMillis]);

  return {
    isRecording: !!state.isRecording,
    lastDurationMs,
    toggle,
    stop,
  };
}
