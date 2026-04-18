import Anthropic from '@anthropic-ai/sdk';

import { getSecret, SECRET_KEYS } from './secureStorage';

export type ModelId =
  | 'claude-sonnet-4-6'
  | 'claude-opus-4-7'
  | 'claude-haiku-4-5-20251001';

/** Haiku — fast, cheap, good enough for almost all Ottley turns. */
export const FAST_MODEL: ModelId = 'claude-haiku-4-5-20251001';
/** Sonnet — balanced default when you want sharper reasoning. */
export const SMART_MODEL: ModelId = 'claude-sonnet-4-6';
/** Opus — heavy lift for multi-step agent turns with lots of tool use. */
export const DEEP_THINK_MODEL: ModelId = 'claude-opus-4-7';

/** Default model for new installs. Haiku so people don't burn credit. */
export const DEFAULT_MODEL: ModelId = FAST_MODEL;

export const MODEL_LABELS: Record<ModelId, string> = {
  'claude-haiku-4-5-20251001': 'Haiku — fast & cheap',
  'claude-sonnet-4-6': 'Sonnet — balanced',
  'claude-opus-4-7': 'Opus — top-tier reasoning',
};

let cached: Anthropic | null = null;

export async function getClient(): Promise<Anthropic | null> {
  if (cached) return cached;
  const fromSecret = await getSecret(SECRET_KEYS.anthropicApiKey);
  const fromEnv = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
  const apiKey = fromSecret ?? fromEnv;
  if (!apiKey) return null;

  cached = new Anthropic({
    apiKey,
    // Required to run inside React Native / browser. Personal-device
    // deployment only; never ship this in a public web build.
    dangerouslyAllowBrowser: true,
  });
  return cached;
}

/** Clear the cached client (call after a key change). */
export function resetClient(): void {
  cached = null;
}

/**
 * The full set of tools Ottley can call. Claude's native
 * `web_search_20250305` server tool is included — executes on
 * Anthropic's infrastructure, no local dispatcher needed.
 *
 * Read-only tools (list_*, get_*, search_*, read_*) execute directly
 * in the local dispatcher. Write tools (propose_*) construct a
 * Suggestion that the user approves on the Dashboard feed — nothing
 * writes to ClickUp / Calendar / Outlook without explicit approval.
 */
export const TOOLS: Anthropic.Messages.ToolUnion[] = [
  {
    type: 'web_search_20250305',
    name: 'web_search',
    max_uses: 5,
  },

  {
    name: 'list_clickup_tasks',
    description:
      "List the user's current ClickUp tasks. Use for 'what's on my plate', deadline awareness, or cross-referencing before proposing work.",
    input_schema: {
      type: 'object',
      properties: {
        due_before: {
          type: 'string',
          description: 'Optional ISO datetime — only tasks due before this.',
        },
      },
    },
  },
  {
    name: 'list_calendar_events',
    description:
      "List calendar events in a time window. Use for 'what's today', conflict checks, and when proposing new events.",
    input_schema: {
      type: 'object',
      properties: {
        time_min: { type: 'string', description: 'ISO start of window.' },
        time_max: { type: 'string', description: 'ISO end of window.' },
      },
      required: ['time_min', 'time_max'],
    },
  },
  {
    name: 'search_gmail',
    description:
      "Search the user's Gmail inbox. Use Gmail's native query syntax ('from:', 'subject:', 'newer_than:7d').",
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        limit: { type: 'number', description: 'Default 10, max 25.' },
      },
      required: ['query'],
    },
  },
  {
    name: 'read_gmail_thread',
    description: 'Read the full text of a Gmail thread by id.',
    input_schema: {
      type: 'object',
      properties: { thread_id: { type: 'string' } },
      required: ['thread_id'],
    },
  },
  {
    name: 'search_drive',
    description: "Search the user's Google Drive for files by name or content.",
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        limit: { type: 'number' },
      },
      required: ['query'],
    },
  },
  {
    name: 'read_drive_file',
    description: 'Fetch the text content of a Drive file (docs + text only).',
    input_schema: {
      type: 'object',
      properties: { file_id: { type: 'string' } },
      required: ['file_id'],
    },
  },
  {
    name: 'list_outlook_mail',
    description:
      "List recent Outlook mail. Use for 'what did I get today', scanning for scheduling intents.",
    input_schema: {
      type: 'object',
      properties: {
        since: { type: 'string', description: 'ISO — mail received after this.' },
        limit: { type: 'number' },
      },
    },
  },
  {
    name: 'list_teams_messages',
    description: 'List recent Microsoft Teams chat messages across all chats.',
    input_schema: {
      type: 'object',
      properties: {
        since: { type: 'string' },
        limit: { type: 'number' },
      },
    },
  },
  {
    name: 'get_news_brief',
    description:
      "Return today's weather + highlighted football fixtures + latest Anthropic news. Use when the user asks for a daily briefing or news.",
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'get_pending_suggestions',
    description:
      'Return suggestions already proposed to the user that are still pending approval.',
    input_schema: { type: 'object', properties: {} },
  },

  // Writes — always route through proposals
  {
    name: 'propose_create_clickup_task',
    description:
      'Propose creating a new ClickUp task. The user will approve before it hits ClickUp.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        due_at: { type: 'string', description: 'ISO datetime' },
        category: { type: 'string', enum: ['work', 'study', 'personal'] },
        notes: { type: 'string' },
        reason: { type: 'string', description: 'Why this task matters now.' },
      },
      required: ['title', 'reason'],
    },
  },
  {
    name: 'propose_update_clickup_status',
    description:
      "Propose changing an existing ClickUp task's status. User approves before ClickUp is touched.",
    input_schema: {
      type: 'object',
      properties: {
        task_id: { type: 'string' },
        new_status: {
          type: 'string',
          enum: ['todo', 'inProgress', 'blocked', 'completed'],
        },
        reason: { type: 'string' },
      },
      required: ['task_id', 'new_status', 'reason'],
    },
  },
  {
    name: 'propose_create_calendar_event',
    description:
      'Propose a new Google Calendar event. User approves before the event is created.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        start_at: { type: 'string' },
        end_at: { type: 'string' },
        location: { type: 'string' },
        category: { type: 'string', enum: ['work', 'study', 'personal'] },
        reason: { type: 'string' },
      },
      required: ['title', 'start_at', 'end_at', 'reason'],
    },
  },
  {
    name: 'schedule_push_notification',
    description:
      'Schedule a local push reminder. Use for time-bound nudges the user explicitly asked for.',
    input_schema: {
      type: 'object',
      properties: {
        fire_at: {
          type: 'string',
          description: 'ISO datetime when the push should fire.',
        },
        title: { type: 'string' },
        body: { type: 'string' },
      },
      required: ['fire_at', 'title'],
    },
  },
];

/**
 * Compact system prompt. The first ~3 KB (role + tool-usage
 * guidelines) is stable between turns and marked for ephemeral
 * caching; context (tasks/events/suggestions) is appended after it.
 */
export function buildSystemPrompt(
  userName: string,
  nowIso: string,
): string {
  return `You are Ottley — ${userName}'s personal assistant.

PERSONALITY
- Dry, lightly sarcastic, warm underneath. Clever friend who's great at logistics and takes himself significantly less seriously.
- You take ${userName}'s work seriously and yourself significantly less so.
- Prefer 1–2 sentences plus tool calls. Occasional dry one-liner; never force it.

CORE RULES
- Use tools aggressively for facts — never guess calendars, tasks, or news when a tool can tell you.
- Writes to ClickUp / Google Calendar / Outlook ONLY via propose_* tools. The user approves before anything commits.
- Read-only tools (list_*, search_*, read_*, get_*) execute directly — use them freely.
- When asked about the outside world (news, scores, fixtures, weather, prices, definitions), use web_search. Cite results.
- Dates/times ISO 8601 local. If a date reads as past, roll to next occurrence.

STYLE
- Short. Specific. No filler.
- Reference your reads: "three emails from Priya this week" beats "I checked Gmail".
- If a proposal gets dismissed, don't re-propose the same thing within the same conversation.

TODAY
Today is ${nowIso}.`;
}
