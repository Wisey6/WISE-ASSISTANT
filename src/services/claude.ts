/**
 * Thin Claude API client — one POST to /v1/messages with tool use.
 *
 * Used by the owl to actually converse, not just parse. When the API
 * key is missing we fall back to the local deterministic handler in
 * ai.ts, so the app still works offline / unconfigured.
 *
 * Security note: the key ends up in the JS bundle because it's read
 * via Expo's EXPO_PUBLIC_ env prefix. That's fine for a private app
 * shared between one or two people — DO NOT publish the app as-is.
 */

const ENDPOINT = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-5';
const MAX_TOKENS = 800;

const API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '';

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

/* -------------------------------------------------------------------------
 * Tools
 *
 * Claude calls these when it wants the app to do something. Our code
 * then executes them locally — creating tasks, scheduling recurrences,
 * offering follow-up chips.
 * -------------------------------------------------------------------------
 */

const TOOLS = [
  {
    name: 'create_task',
    description:
      "Create a task for the user. Call this whenever they mention something they need to do, a deadline, or an appointment. Resolve all dates/times to ISO 8601 using the user's local timezone.",
    input_schema: {
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
            'ISO 8601 start time. Use this (with endAt) when the task runs over a time block, like an appointment or meeting.',
        },
        endAt: {
          type: 'string',
          description: 'ISO 8601 end time. Used with startAt.',
        },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high'],
          description: 'Default medium. Use high when the user sounds stressed or says urgent/ASAP/tight.',
        },
        estimatedMinutes: {
          type: 'number',
          description: 'Rough guess of how long it will take, in minutes.',
        },
        notes: {
          type: 'string',
          description:
            "Extra context you've collected — manager name, deliverables, who's joining, etc.",
        },
        owner: {
          type: 'string',
          enum: ['me', 'partner'],
          description:
            "Whose task this is. Default 'me'. Switch to 'partner' if the user says their partner's name or 'she'/'he'/'they'.",
        },
      },
      required: ['title'],
    },
  },
  {
    name: 'create_recurring_schedule',
    description:
      'Create a repeating weekly schedule — e.g. a work schedule, a gym routine, a class. Materializes as time-blocks on the calendar.',
    input_schema: {
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
        startTime: {
          type: 'string',
          description: '24-hour HH:MM start time, e.g. "09:00".',
        },
        endTime: {
          type: 'string',
          description: '24-hour HH:MM end time, e.g. "17:00".',
        },
        weeksAhead: {
          type: 'number',
          description: 'How many weeks forward to project. Default 4.',
        },
        owner: {
          type: 'string',
          enum: ['me', 'partner'],
        },
      },
      required: ['title', 'days', 'startTime', 'endTime'],
    },
  },
  {
    name: 'suggest_replies',
    description:
      "Offer 2-4 short tap-to-reply chips. Use only when there's an obvious next step the user might want — skip it on routine acknowledgements.",
    input_schema: {
      type: 'object',
      properties: {
        suggestions: {
          type: 'array',
          items: { type: 'string' },
          description: 'Short phrases, ideally <4 words each.',
        },
      },
      required: ['suggestions'],
    },
  },
];

/* -------------------------------------------------------------------------
 * System prompt
 * -------------------------------------------------------------------------
 */

function buildSystemPrompt(
  now: Date,
  userName: string,
  partnerName: string,
): string {
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

  return `You are Wise — a calm, minimal task and calendar assistant for ${userName} and her partner ${partnerName}. You live inside a small iPhone app shaped like a pixel-art owl.

Today is ${today}. Current local time is ${time}.

VOICE
- Warm, brief, conversational. Friendly but never chatty.
- Almost all replies are 1-2 sentences. 3 is the outside limit.
- Reply to small talk naturally. "hi" deserves something like "Hey — what's going on?", NOT "Got it, hi".
- Never dump forms. If you need more info to make a task, ask one focused question.
- When the user sounds overwhelmed, offer a small practical suggestion before listing tasks.
- When you commit a task, say what you did in one sentence — don't recite every field back.

WHAT YOU DO
- Capture tasks from the user's casual messages using the create_task tool.
- When they describe a recurring routine ("I work weekdays 9-5", "gym Mon/Wed/Fri"), use create_recurring_schedule.
- Proactively fill in sensible defaults (priority, estimate) when obvious — don't ask the user about things you can infer.
- Use suggest_replies sparingly — only for obvious next steps (e.g. "Add another", "Anything urgent?", "Same time next week?").

FOLLOW-UP RULES
- Missing the task title? Ask: "What's the task?" (or similar, adapted to context).
- Missing the due date on a clearly urgent task? Ask: "When by?"
- Missing the due date on a casual errand? Just create it with dueAt undefined — don't pester.
- For work context, if they give a title + due, that's enough to commit. Don't ask about estimates/managers unless they volunteered partial info.

OWNERSHIP
- Default owner is "me" (${userName}).
- If the user says "${partnerName}", "she", "her", "hers" → owner is "partner".
- If ambiguous, ask quickly.

DATE RESOLUTION
- All dates/times in ISO 8601, local time (no Z suffix if you don't know the offset — a plain ISO string is fine).
- Resolve every relative phrase yourself: "tomorrow", "friday", "next week", "15th may", "in 3 days", etc.
- If a past date was mentioned (e.g. "15 jan" and it's already June), assume they mean next year.
- For a deadline without a time, use 17:00.
- For an appointment with time range, use startAt + endAt and leave dueAt empty.

STAY ON TASK
You are not a general-purpose chatbot. Stay on task: tasks, schedules, briefings, light conversation. If asked to write code, tell stories, or debate philosophy, politely steer back to what you're for.`;
}

/* -------------------------------------------------------------------------
 * The call itself
 * -------------------------------------------------------------------------
 */

export async function callClaude(args: {
  messages: ClaudeMessage[];
  userName: string;
  partnerName: string;
  now?: Date;
}): Promise<ClaudeResult> {
  if (!API_KEY) {
    throw new Error('NO_API_KEY');
  }

  const system = buildSystemPrompt(
    args.now ?? new Date(),
    args.userName,
    args.partnerName,
  );

  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system,
      messages: args.messages,
      tools: TOOLS,
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(
      `Claude ${response.status}: ${errText.slice(0, 200) || response.statusText}`,
    );
  }

  const data = (await response.json()) as {
    content?: Array<
      | { type: 'text'; text: string }
      | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
    >;
  };

  let text = '';
  const toolCalls: ToolCall[] = [];

  for (const block of data.content ?? []) {
    if (block.type === 'text') {
      text += block.text;
    } else if (block.type === 'tool_use') {
      toolCalls.push({ name: block.name, id: block.id, input: block.input });
    }
  }

  return { text: text.trim(), toolCalls };
}
