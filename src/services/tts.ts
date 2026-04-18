import * as Speech from 'expo-speech';
import { Platform } from 'react-native';

/**
 * Preference order for "elegant upper-class British" TTS. iOS's
 * post-iOS-16 Siri voices sound actually human; the old Daniel
 * compact is the robot. We pick the best available at call time.
 *
 * The user can unlock the Premium / Enhanced voices (Oliver, Serena,
 * Arthur) manually in Settings → Accessibility → Spoken Content →
 * Voices → English → English (UK). Once downloaded they appear in
 * `getAvailableVoicesAsync` and we prefer them automatically.
 */
const IOS_PREFERRED_VOICE_IDS = [
  'com.apple.voice.premium.en-GB.Oliver',
  'com.apple.voice.enhanced.en-GB.Oliver',
  'com.apple.voice.premium.en-GB.Serena',
  'com.apple.voice.enhanced.en-GB.Serena',
  'com.apple.voice.enhanced.en-GB.Daniel',
  'com.apple.ttsbundle.siri_Arthur_en-GB_compact',
  'com.apple.ttsbundle.siri_Aaron_en-GB_compact',
  'com.apple.ttsbundle.siri_Martha_en-GB_compact',
  'com.apple.voice.compact.en-GB.Daniel',
];

let cachedVoiceId: string | null | undefined;

async function pickVoice(): Promise<string | null> {
  if (cachedVoiceId !== undefined) return cachedVoiceId;
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    if (Platform.OS === 'ios') {
      for (const id of IOS_PREFERRED_VOICE_IDS) {
        if (voices.some((v) => v.identifier === id)) {
          cachedVoiceId = id;
          return id;
        }
      }
    }
    // Android / fallback: first en-GB voice we can find.
    const gb = voices.find((v) => v.language?.toLowerCase().startsWith('en-gb'));
    cachedVoiceId = gb?.identifier ?? null;
  } catch {
    cachedVoiceId = null;
  }
  return cachedVoiceId;
}

/**
 * Speak `text` in the most elegant en-GB voice available. Stops any
 * in-flight speech first so back-to-back calls never overlap.
 */
export async function speakBritish(text: string): Promise<void> {
  if (!text.trim()) return;
  await Speech.stop().catch(() => undefined);
  const voice = await pickVoice();
  Speech.speak(text, {
    language: 'en-GB',
    voice: voice ?? undefined,
    pitch: 1.0,
    rate: 0.95,
  });
}

export async function stopBritish(): Promise<void> {
  await Speech.stop().catch(() => undefined);
}

/** Force re-pick on next speak — useful after voice downloads land. */
export function resetVoiceCache(): void {
  cachedVoiceId = undefined;
}
