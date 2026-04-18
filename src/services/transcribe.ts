import { getSecret, SECRET_KEYS } from './secureStorage';

/**
 * Transcription provider. OpenAI's Whisper endpoint works well and
 * has no Anthropic equivalent. If a key is configured, we use it;
 * otherwise voice input stays disabled gracefully.
 *
 * Key lookup order: secure-store → env var. Users can paste a key
 * into Profile → Voice setup rather than edit .env.
 */
async function openaiKey(): Promise<string | null> {
  const fromSecret = await getSecret(SECRET_KEYS.openaiApiKey);
  if (fromSecret) return fromSecret;
  return process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? null;
}

/**
 * POST the recording to Whisper. `uri` is the `file://` URI expo-audio
 * hands back when the recorder stops.
 */
export async function transcribeRecording(uri: string): Promise<string> {
  const key = await openaiKey();
  if (!key) {
    throw new Error(
      'No transcription key. Add an OpenAI key in Profile → Voice, or drop EXPO_PUBLIC_OPENAI_API_KEY into .env.',
    );
  }

  const form = new FormData();
  // React Native FormData accepts this pseudo-File shape and attaches
  // the local file without needing to read it into memory.
  form.append('file', {
    uri,
    name: 'recording.m4a',
    type: 'audio/m4a',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
  form.append('model', 'whisper-1');
  form.append('language', 'en');

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Whisper ${res.status}: ${text.slice(0, 200)}`);
  }
  const json = (await res.json()) as { text?: string };
  return (json.text ?? '').trim();
}

/** True if we can attempt transcription right now. */
export async function isTranscribeConfigured(): Promise<boolean> {
  return (await openaiKey()) != null;
}
