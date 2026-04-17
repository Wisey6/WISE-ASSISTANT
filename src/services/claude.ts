/**
 * Thin Google Gemini API client. When the API key is missing we fall
 * back to the local deterministic handler in ai.ts, so the app still
 * works offline / unconfigured.
 *
 * Security note: the key ends up in the JS bundle because it's read
 * via Expo's EXPO_PUBLIC_ env prefix. Fine for a personal app — do
 * NOT publish as-is.
 */

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const MAX_TOKENS = 800;

const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_API_KEY ?? '';

export function hasApiKey(): boolean {
  return API_KEY.length > 0;
}

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ToolCall {
  name: string;
  id: string;
  input: Record<string, unknown>;
}

export interface ClaudeResult {
  text: string;
  toolCalls: ToolCall[];
}

const TOOLS = {
  type: 'function',
  function_declarations: [
    {
      name: 'create_task',
      description:
        "Create a task for the user. Call this whenever they mention something they need to do, a deadline, or an appointment. Resolve all dates/times to ISO 8601 using the user's local timezone.",
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Short, specific task title. No filler words.',
          },
          dueAt: {
            type: 'string',
            description:
              'ISO 8601 date-time the task is due by. Use this for deadlines.',
          },
          startAt: {
            type: 'string',
            description:
              'ISO 8601 start time. Use this (with endAt) when the task runs over a time block.',
          },
          endAt: {
            type: 'string',
            description: 'ISO 8601 end time. Used with startAt.',
          },
          priority: {
            type: 'string',
            enum: ['low', 'medium', 'high'],
          },
          estimatedMinutes: {
            type: 'number',
          },
          notes: {
            type: 'string',
          },
        },
        required: ['title'],
      },
    },
    {
      name: 'create_recurring_schedule',
      description:
        'Create a repeating weekly schedule — e.g. a work schedule, a gym routine, a class.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          days: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
            },
          },
          startTime: { type: 'string' },
          endTime: { type: 'string' },
          weeksAhead: { type: 'number' },
        },
        required: ['title', 'days', 'startTime', 'endTime'],
      },
    },
    {
      name: 'suggest_replies',
      description:
        "Offer 2-4 short tap-to-reply chips when there's an obvious next step.",
      parameters: {
        type: 'object',
        properties: {
          suggestions: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        required: ['suggestions'],
      },
    },
  ],
};

function buildSystemPrompt(now: Date, userName: string): string {
  const today = now.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const time = now.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });

  return `You are Ottley — ${userName}'s personal assistant. Today is ${today}, and it's ${time}.

PERSONALITY
- Warm, dry, lightly sarcastic. Like a clever friend who's great at logistics and occasionally throws in a one-liner.
- You take ${userName}'s work seriously. You take yourself significantly less seriously.
- You can be playful about the absurdity of to-do lists, deadlines, and calendar Tetris — but you never mock ${userName} for what's on their plate.
- Occasional dry jokes, bad puns, or a deadpan observation are welcome. Don't force them — if nothing lands, stay tidy.
- Mostly 1-2 sentences. Three when you're actually reacting to something. Never a wall of text.

WHAT YOU DO
- Capture tasks with create_task. Always give them a specific title (never "New task" / "Untitled").
- Recurring routines → create_recurring_schedule.
- Quietly fill obvious defaults (priority, estimate) without asking.
- Use suggest_replies for clear next steps. Skip it for small talk.

MISSING INFO
If a request is vague ("I have work this week"), ask ONE focused follow-up. Don't interrogate. Never more than one question at a time.

DATE RESOLUTION
- ISO 8601 local time (no Z if you don't know the offset).
- Resolve relative phrases yourself ("tomorrow", "friday", "in 3 days", "15 may"). If a date would be in the past, roll to next year.
- Deadline without a time → use 17:00.
- Appointment with a time range → startAt + endAt, leave dueAt empty.

STAY IN LANE
You exist for ${userName}'s tasks, schedule, and briefings. Small talk is fine. If someone asks you to write code or write their wedding vows, gently deflect: "Above my pay grade — but want me to block out time for it?"`;
}

export async function callClaude(args: {
  messages: ClaudeMessage[];
  userName: string;
  now?: Date;
}): Promise<ClaudeResult> {
  if (!API_KEY) {
    throw new Error('NO_API_KEY');
  }

  const system = buildSystemPrompt(args.now ?? new Date(), args.userName);

  const contents = args.messages.map((msg) => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }],
  }));

  const response = await fetch(`${ENDPOINT}?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: system }] },
      contents,
      tools: [TOOLS],
      generation_config: { max_output_tokens: MAX_TOKENS },
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(
      `Gemini ${response.status}: ${errText.slice(0, 200) || response.statusText}`,
    );
  }

  const data = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<
          | { text?: string }
          | { functionCall?: { name: string; args: Record<string, unknown> } }
        >;
      };
    }>;
  };

  let text = '';
  const toolCalls: ToolCall[] = [];

  const candidate = data.candidates?.[0];
  const parts = candidate?.content?.parts ?? [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if ('text' in part && part.text) {
      text += part.text;
    } else if ('functionCall' in part && part.functionCall) {
      const fc = part.functionCall;
      toolCalls.push({
        name: fc.name,
        id: `call_${i}`,
        input: fc.args,
      });
    }
  }

  return { text: text.trim(), toolCalls };
}
