import type Anthropic from '@anthropic-ai/sdk';

import { useDashboardStore } from '@/store/useDashboardStore';
import { useNewsStore } from '@/store/useNewsStore';
import { useUserStore } from '@/store/useUserStore';
import type { Suggestion, UnifiedTask, UnifiedEvent } from '@/types/dashboard';
import { createId } from '@/utils/id';
import { toISO } from '@/utils/date';

import {
  buildSystemPrompt,
  DEEP_THINK_MODEL,
  getClient,
  TOOLS,
  type ModelId,
} from './anthropic';
import * as clickup from './clickup';
import * as gcal from './googleCalendar';
import * as gmail from './gmail';
import * as drive from './googleDrive';
import * as graph from './microsoftGraph';
import * as notif from './notifications';

const MAX_TOOL_ITERATIONS = 8;

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface ToolCallRecord {
  name: string;
  input: Record<string, unknown>;
  result?: string;
  error?: string;
}

export interface AgentResult {
  text: string;
  toolCalls: ToolCallRecord[];
  modelUsed: ModelId;
}

export interface AgentOptions {
  /** Force opus. Defaults to sonnet; escalates after 3 tool hops. */
  deepThink?: boolean;
  /** Called once per tool use for UI status chips. */
  onToolStart?: (name: string, input: Record<string, unknown>) => void;
  /** Called when streamed text chunks arrive (final text per iteration). */
  onText?: (chunk: string) => void;
}

/**
 * Ottley's agent loop. Sends message → Anthropic → dispatches tool
 * calls locally → feeds `tool_result` back → repeats until Claude
 * replies with pure text (no more tool_use blocks) or the iteration
 * cap is hit.
 *
 * The local dispatcher either executes a read directly or constructs
 * a Suggestion for the user to approve — `useDashboardStore` is the
 * only mutation path for external systems.
 */
export async function runOttleyTurn(
  userName: string,
  history: ChatTurn[],
  userMessage: string,
  opts: AgentOptions = {},
): Promise<AgentResult> {
  const client = await getClient();
  if (!client) {
    return {
      text:
        "I don't have a Claude API key yet — drop EXPO_PUBLIC_ANTHROPIC_API_KEY into your .env and restart Metro.",
      toolCalls: [],
      modelUsed: useUserStore.getState().modelPreference,
    };
  }

  const preferred = useUserStore.getState().modelPreference;
  const model: ModelId = opts.deepThink ? DEEP_THINK_MODEL : preferred;
  const system = buildSystemPrompt(userName, new Date().toISOString());

  const messages: Anthropic.Messages.MessageParam[] = [
    ...history.map((h) => ({
      role: h.role,
      content: h.content,
    })),
    { role: 'user', content: userMessage },
  ];

  const toolCalls: ToolCallRecord[] = [];
  let combinedText = '';

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i += 1) {
    const response = await client.messages.create({
      model,
      max_tokens: 2048,
      system: [
        {
          type: 'text',
          text: system,
          cache_control: { type: 'ephemeral' },
        },
      ],
      tools: TOOLS,
      messages,
    });

    const assistantBlocks = response.content;
    messages.push({ role: 'assistant', content: assistantBlocks });

    const toolUses = assistantBlocks.filter(
      (b): b is Anthropic.Messages.ToolUseBlock => b.type === 'tool_use',
    );

    for (const block of assistantBlocks) {
      if (block.type === 'text' && block.text) {
        combinedText += (combinedText ? '\n' : '') + block.text;
        opts.onText?.(block.text);
      }
    }

    if (toolUses.length === 0) break;

    const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];
    for (const use of toolUses) {
      opts.onToolStart?.(use.name, use.input as Record<string, unknown>);
      const rec: ToolCallRecord = {
        name: use.name,
        input: use.input as Record<string, unknown>,
      };
      try {
        const output = await dispatchTool(use.name, use.input as Record<string, unknown>);
        rec.result = output;
        toolResults.push({
          type: 'tool_result',
          tool_use_id: use.id,
          content: output,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        rec.error = msg;
        toolResults.push({
          type: 'tool_result',
          tool_use_id: use.id,
          is_error: true,
          content: `Error: ${msg}`,
        });
      }
      toolCalls.push(rec);
    }

    messages.push({ role: 'user', content: toolResults });
  }

  return {
    text: combinedText.trim() || "Done — nothing more to say.",
    toolCalls,
    modelUsed: model,
  };
}

async function dispatchTool(
  name: string,
  input: Record<string, unknown>,
): Promise<string> {
  switch (name) {
    // web_search is server-side; never reaches here

    case 'list_clickup_tasks': {
      const due = input.due_before as string | undefined;
      const tasks = useDashboardStore
        .getState()
        .tasks.filter((t) => !due || (t.dueAt && t.dueAt <= due));
      return JSON.stringify(tasks.slice(0, 25));
    }

    case 'list_calendar_events': {
      const min = input.time_min as string;
      const max = input.time_max as string;
      const events = useDashboardStore
        .getState()
        .events.filter((e) => e.startAt >= min && e.endAt <= max);
      return JSON.stringify(events.slice(0, 25));
    }

    case 'search_gmail': {
      const q = String(input.query ?? '');
      const limit = Number(input.limit ?? 10);
      const results = await gmail.searchThreads(q, limit).catch(() => []);
      return JSON.stringify(results);
    }

    case 'read_gmail_thread': {
      const id = String(input.thread_id ?? '');
      const thread = await gmail.readThread(id).catch(() => null);
      return JSON.stringify(thread ?? { error: 'not_found' });
    }

    case 'search_drive': {
      const q = String(input.query ?? '');
      const limit = Number(input.limit ?? 10);
      const results = await drive.searchFiles(q, limit).catch(() => []);
      return JSON.stringify(results);
    }

    case 'read_drive_file': {
      const id = String(input.file_id ?? '');
      const content = await drive.readFile(id).catch(() => '');
      return content.slice(0, 8000);
    }

    case 'list_outlook_mail': {
      const since = (input.since as string) ?? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const limit = Number(input.limit ?? 15);
      const mail = await graph.listRecentMail(new Date(since), limit).catch(() => []);
      return JSON.stringify(mail);
    }

    case 'list_teams_messages': {
      const since = (input.since as string) ?? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const limit = Number(input.limit ?? 15);
      const msgs = await graph.listTeamsMessages(new Date(since), limit).catch(() => []);
      return JSON.stringify(msgs);
    }

    case 'get_news_brief': {
      const news = useNewsStore.getState();
      return JSON.stringify({
        weather: news.weather?.days.slice(0, 3) ?? null,
        football: news.football.slice(0, 3),
        anthropic: news.anthropic.slice(0, 3),
      });
    }

    case 'get_pending_suggestions': {
      const pending = useDashboardStore
        .getState()
        .suggestions.filter((s) => s.status === 'pending');
      return JSON.stringify(pending);
    }

    case 'propose_create_clickup_task': {
      const s = taskProposal(input);
      useDashboardStore.getState().proposeSuggestion(s);
      return JSON.stringify({ proposed: true, id: s.id, title: s.title });
    }

    case 'propose_update_clickup_status': {
      const s = statusProposal(input);
      useDashboardStore.getState().proposeSuggestion(s);
      return JSON.stringify({ proposed: true, id: s.id });
    }

    case 'propose_create_calendar_event': {
      const s = eventProposal(input);
      useDashboardStore.getState().proposeSuggestion(s);
      return JSON.stringify({ proposed: true, id: s.id, title: s.title });
    }

    case 'schedule_push_notification': {
      const fireAt = String(input.fire_at ?? '');
      const title = String(input.title ?? 'Heads up');
      const body = String(input.body ?? '');
      await notif.scheduleTaskReminder({ id: `ottley-${Date.now()}`, title: `${title}${body ? ' — ' + body : ''}`, dueAt: fireAt });
      return JSON.stringify({ scheduled: true, fireAt });
    }

    default:
      return JSON.stringify({ error: `unknown tool: ${name}` });
  }
}

function taskProposal(input: Record<string, unknown>): Suggestion {
  const title = String(input.title ?? 'New task');
  const reason = String(input.reason ?? '');
  const task: Partial<UnifiedTask> = {
    title,
    category: (input.category as UnifiedTask['category']) ?? 'work',
    status: 'todo',
    dueAt: (input.due_at as string) ?? null,
    source: 'manual',
    notes: input.notes as string | undefined,
  };
  return {
    id: createId('sug'),
    kind: 'create_task',
    source: 'claude_chat',
    title: `Create task: ${title}`,
    reason,
    payload: { task },
    status: 'pending',
    createdAt: toISO(new Date()),
    dedupeHash: `task:${title}:${task.dueAt ?? ''}`,
  };
}

function statusProposal(input: Record<string, unknown>): Suggestion {
  const taskId = String(input.task_id ?? '');
  const newStatus = String(input.new_status ?? 'todo');
  return {
    id: createId('sug'),
    kind: 'update_status',
    source: 'claude_chat',
    title: `Move to ${newStatus}`,
    reason: String(input.reason ?? ''),
    payload: { task: { id: taskId, status: newStatus as UnifiedTask['status'] } },
    status: 'pending',
    createdAt: toISO(new Date()),
    dedupeHash: `status:${taskId}:${newStatus}`,
  };
}

function eventProposal(input: Record<string, unknown>): Suggestion {
  const title = String(input.title ?? 'New event');
  const startAt = String(input.start_at ?? '');
  const endAt = String(input.end_at ?? '');
  const event: Partial<UnifiedEvent> = {
    title,
    startAt,
    endAt,
    location: input.location as string | undefined,
    category: (input.category as UnifiedEvent['category']) ?? 'personal',
    source: 'local',
  };
  return {
    id: createId('sug'),
    kind: 'create_event',
    source: 'claude_chat',
    title: `Schedule "${title}"`,
    reason: String(input.reason ?? ''),
    payload: { event },
    status: 'pending',
    createdAt: toISO(new Date()),
    dedupeHash: `event:${title}:${startAt}`,
  };
}
