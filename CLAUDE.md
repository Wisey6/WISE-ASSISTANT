# Wise Assistant — notes for future Claude sessions

## User environment (Tyler, Windows)

- Works in **Windows PowerShell**, default starting in `C:\Users\tyler`.
- Project root is **`C:\Users\tyler\WISE-ASSISTANT`**. Expo / npm / git
  commands must run from there.
- Known repeat trap: user runs `npx expo start --clear` or `git pull`
  from `C:\Users\tyler` (home dir) instead of the project folder,
  which fails with "package.json path does not exist" or "not a git
  repository".

**When walking the user through commands, either:**
- Always prefix with `cd WISE-ASSISTANT` (if you're sure they're at
  home), **or**
- Tell them to double-click **`start-wise.bat`** in the project
  folder — that launcher handles `cd` + `git pull` + `expo start
  --clear` in one go, **or**
- Tell them to run `npm run go` (pulls + starts with cache clear)
  from the project folder.

## Secrets

The `.env` file lives at the project root (`C:\Users\tyler\WISE-ASSISTANT\.env`).
An empty `.env` at `C:\Users\tyler\.env` previously masked the real
one — that's been cleaned up. The user is on **Anthropic API credits
(pay-as-you-go)**, not Max subscription — Max doesn't apply to
`/v1/messages` calls.

## Ottley (the assistant)

- Default model: **Haiku 4.5** (`claude-haiku-4-5-20251001`) for
  cost. Tunable on Profile → OTTLEY'S BRAIN.
- `deepThink: true` swaps to Opus + `RESEARCH_TOOLS` (which adds
  `web_search` — $0.01 per search, kept off the chat path).
- System prompt is frozen (no timestamps) so prompt cache works.
  Today's date is injected as a `<context>` tag on the user turn.
- Tool + system cache breakpoints are on the last tool and last
  system block — verify via `usage.cache_read_input_tokens` in the
  `[Ottley] iter N` dev log.

## Voice

- TTS: `services/tts.ts` picks the best available en-GB voice;
  user needs to download Oliver Premium (or similar) in iOS
  Accessibility settings to get a non-robotic voice.
- STT: `services/transcribe.ts` uses OpenAI Whisper via
  `EXPO_PUBLIC_OPENAI_API_KEY` or a key pasted on Profile →
  Credentials. Anthropic has no STT endpoint.

## Integrations

- ClickUp: token from `.env` or Profile → Credentials. Auto-seeded
  into secure-store on boot by `bootstrapIntegrations.ts`.
- Google / Microsoft: OAuth 2.0 + PKCE via `expo-auth-session`.
  Client IDs live in secure-store (paste on Profile) or env vars.
  Redirect URI scheme is **`wiseassistant://`** (set in `app.json`).
