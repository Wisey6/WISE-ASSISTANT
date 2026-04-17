import type { Suggestion, UnifiedEvent, UnifiedTask } from '@/types/dashboard';
import { createId } from '@/utils/id';
import { toISO } from '@/utils/date';
import { getSecret, SECRET_KEYS } from './secureStorage';

const ENDPOINT = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = 'claude-sonnet-4-6';
const DEEP_THINK_MODEL = 'claude-opus-4-7';

export interface ChatContext {
  userName: string;
  today: string;
  tasks: UnifiedTask[];
  events: UnifiedEvent[];
  pendingSuggestions: Suggestion[];
}

export interface ChatRequest {
  message: string;
  history: { role: 'user' | 'assistant'; text: string }[];
  context: ChatContext;
  /** Force opus for long tool chains or explicit deep-think asks. */
  deepThink?: boolean;
}

export interface ChatResult {
  text: string;
  proposedSuggestions: Suggestion[];
}

const TOOL_DEFINITIONS = [
  {
    name: 'propose_suggestion',
    description:
      "Record a proposal for the user to approve. NEVER used to actually commit to ClickUp or Calendar — that happens only after the user taps Approve in the dashboard.",
    input_schema: {
      type: 'object',
      properties: {
        kind: {
          type: 'string',
          enum: ['create_task', 'update_status', 'create_event', 'prioritize', 'reschedule'],
        },
        title: { type: 'string' },
        reason: { type: 'string' },
        task: { type: 'object' },
        event: { type: 'object' },
        note: { type: 'string' },
      },
      required: ['kind', 'title', 'reason'],
    },
  },
] as const;

async function apiKey(): Promise<string | null> {
  const fromSecret = await getSecret(SECRET_KEYS.anthropicApiKey);
  if (fromSecret) return fromSecret;
  return process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? null;
}

function buildSystem(ctx: ChatContext): string {
  // Compact JSON snapshot + role prompt. The Anthropic client should
  // mark this block with `cache_control: { type: 'ephemeral' }` when
  // the raw SDK lands in the deps — it barely changes between turns
  // and caching it avoids re-billing every message.
  return [
    `You are a calm, concise scheduling assistant for ${ctx.userName}.`,
    `Today is ${ctx.today}.`,
    'Never write to external systems directly. When the user asks you to schedule, prioritize, or update anything, call the `propose_suggestion` tool — the user approves proposals explicitly on the dashboard.',
    'Keep replies short. Prefer 1–2 sentences plus tool calls.',
    '',
    'Current tasks (JSON):',
    JSON.stringify(ctx.tasks.slice(0, 40)),
    '',
    'Current events (JSON):',
    JSON.stringify(ctx.events.slice(0, 40)),
    '',
    'Pending suggestions (already proposed):',
    JSON.stringify(
      ctx.pendingSuggestions.map((s) => ({
        id: s.id,
        kind: s.kind,
        title: s.title,
      })),
    ),
  ].join('\n');
}

/**
 * Sends a chat turn. Returns the assistant text + any suggestions the
 * model proposed via tool calls. The dashboard is responsible for
 * actually persisting them via `useDashboardStore.proposeSuggestion`.
 *
 * Minimal fetch-based implementation — swap for `@anthropic-ai/sdk`
 * once the dep is installed. Keeps the surface area identical.
 */
export async function chat(req: ChatRequest): Promise<ChatResult> {
  const key = await apiKey();
  if (!key) {
    return {
      text:
        "I'm not connected to Claude yet — add an API key in Settings and try again.",
      proposedSuggestions: [],
    };
  }

  const body = {
    model: req.deepThink ? DEEP_THINK_MODEL : DEFAULT_MODEL,
    max_tokens: 1024,
    system: [
      {
        type: 'text',
        text: buildSystem(req.context),
        cache_control: { type: 'ephemeral' },
      },
    ],
    tools: TOOL_DEFINITIONS,
    messages: [
      ...req.history.map((m) => ({
        role: m.role,
        content: [{ type: 'text', text: m.text }],
      })),
      { role: 'user', content: [{ type: 'text', text: req.message }] },
    ],
  };

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
  }

  const data = (await res.json()) as {
    content: {
      type: 'text' | 'tool_use';
      text?: string;
      name?: string;
      input?: Record<string, unknown>;
    }[];
  };

  const text = data.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text ?? '')
    .join('\n')
    .trim();

  const proposedSuggestions = data.content
    .filter((b) => b.type === 'tool_use' && b.name === 'propose_suggestion')
    .map((b) => toolInputToSuggestion(b.input ?? {}));

  return { text, proposedSuggestions };
}

function toolInputToSuggestion(input: Record<string, unknown>): Suggestion {
  const kind = (input.kind as Suggestion['kind']) ?? 'create_task';
  const title = String(input.title ?? 'Proposed change');
  const reason = String(input.reason ?? '');
  return {
    id: createId('sug'),
    kind,
    source: 'claude_chat',
    title,
    reason,
    payload: {
      task: input.task as Suggestion['payload']['task'],
      event: input.event as Suggestion['payload']['event'],
      note: input.note as string | undefined,
    },
    status: 'pending',
    createdAt: toISO(new Date()),
    dedupeHash: `chat:${title}:${reason}`.slice(0, 120),
  };
}
