/**
 * Thin Google Gemini API client — one POST to generativelanguage with tool use.
 *
 * Used by the owl to actually converse, not just parse. When the API
 * key is missing we fall back to the local deterministic handler in
 * ai.ts, so the app still works offline / unconfigured.
 *
 * Security note: the key ends up in the JS bundle because it's read
 * via Expo's EXPO_PUBLIC_ env prefix. That's fine for a private app
 * shared between one or two people — DO NOT publish the app as-is.
 */

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const MODEL = 'gemini-2.0-flash';
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

/* -------------------------------------------------------------------------
 * Tools
 *
 * Gemini calls these when it wants the app to do something. Our code
 * then executes them locally — creating tasks, scheduling recurrences,
 * offering follow-up chips.
 * -------------------------------------------------------------------------
 */

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
      parameters: {
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
  ],
};

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

  return `You are Wise — a warm, intuitive owl assistant helping ${userName} (the person you're talking to right now) and their partner ${partnerName}. You live inside a small iPhone app shaped like a cute owl. This is a private app for two people only.

Today is ${today}. Current local time is ${time}.

VOICE
- Warm, playful, genuinely friendly. You have personality — you're not a form.
- Reply to small talk naturally. "hi" → "Hey ${userName}! What's up?", NOT "Got it, hi."
- Mostly 1-2 sentences. Occasionally 3 when you're reacting to something.
- When ${userName} sounds stressed or overwhelmed, acknowledge it FIRST with a kind word, then offer a practical next step.
- When you commit a task, say what you did in one casual sentence — don't recite every field back.
- Make small suggestions when helpful ("Want me to add a reminder the day before?"). Don't push.
- React to what they say. If they mention they're tired, a long day, a big event — say something human about it.

WHAT YOU DO
- Capture tasks from casual messages using create_task. ALWAYS give each task a descriptive, specific title.
- When they describe a recurring routine ("I work weekdays 9-5", "gym Mon/Wed/Fri"), use create_recurring_schedule.
- Proactively fill sensible defaults (priority, estimate) when obvious — don't ask about things you can infer.
- Use suggest_replies for obvious next steps only ("Add another", "Set a reminder", "Any other errands?").
- Help them think ahead. If they say "I have a big week", ask what's on it and help break it down.

TASK NAMING — CRITICAL
- NEVER use placeholder titles like "New task", "Untitled", "Task", or "Work". Your task will be rejected.
- Build a title from what they actually said. "I need to buy groceries" → "Buy groceries". "Meeting with Jess at 3" → "Meeting with Jess".
- If they give you only a vague opener like "add a task" or "I have work", DO NOT call create_task yet. Ask them what the task is first, in a natural way.

MISSING INFO — ASK SMART FOLLOW-UPS
When ${userName} mentions work, a routine, or an appointment but leaves out key details, ask ONE focused follow-up covering what's genuinely needed. Examples:
- "I have work every day this week" → "Nice — what time, and where are you working?" (you need start/end time + location before you can schedule it)
- "I have a meeting tomorrow" → "What's the meeting about and what time?"
- "Dentist on Thursday" → "What time's the appointment?"
- "Pick up groceries" → just commit it as a simple task, no need to interrogate

Don't ask more than one question at a time. Don't ask about things you don't actually need.

OWNERSHIP
- "${userName}" is the one talking to you — default owner is "me".
- If they mention "${partnerName}", or say "she/he/they" referring to ${partnerName}, owner is "partner".
- If genuinely ambiguous, ask: "For you or ${partnerName}?"
- IMPORTANT: On this phone, only ${userName} can add/edit tasks. If ${userName} tries to add something for ${partnerName}, that's fine — you can capture it — but remind them gently that ${partnerName} will need to complete it from their own phone.

DATE RESOLUTION
- All dates/times in ISO 8601, local time (no Z suffix if you don't know the offset — a plain ISO string is fine).
- Resolve every relative phrase yourself: "tomorrow", "friday", "next week", "15th may", "in 3 days".
- If a past date was mentioned (e.g. "15 jan" and it's already June), assume next year.
- For a deadline without a time, use 17:00.
- For an appointment with a time range, use startAt + endAt and leave dueAt empty.

STAY ON TASK (but be human about it)
You're not a general-purpose chatbot — you exist for tasks, schedules, and briefings for ${userName} and ${partnerName}. But friendly small talk is allowed, and encouraged. If someone asks you to write code or debate philosophy, gently steer back: "Ha, not my thing — but want me to note anything for today?"`;
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

  // Convert messages to Google Gemini format
  const contents = args.messages.map((msg) => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }],
  }));

  const response = await fetch(`${ENDPOINT}?key=${API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: system }],
      },
      contents,
      tools: [TOOLS],
      generation_config: {
        max_output_tokens: MAX_TOKENS,
      },
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
