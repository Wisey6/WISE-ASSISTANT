import {
  addDays,
  addHours,
  addYears,
  endOfDay,
  nextFriday,
  nextMonday,
  nextSaturday,
  nextSunday,
  nextThursday,
  nextTuesday,
  nextWednesday,
  setDate,
  setMonth,
  startOfDay,
} from 'date-fns';

import type {
  AssistantMessage,
  ParsedTaskDraft,
  PendingIntent,
  Priority,
  Recurrence,
  Task,
  TaskContext,
  TaskSlot,
  UserId,
  Weekday,
} from '@/types';
import { toISO } from '@/utils/date';
import { userPalettes } from '@/theme';
import { useUserStore, otherUserId } from '@/store/useUserStore';
import { callClaude, hasApiKey, type ClaudeMessage } from './claude';

/**
 * -----------------------------------------------------------------------
 * The assistant is a local, deterministic state machine that can:
 *
 *   1. Parse a casual message into one or more task drafts
 *      (with dates, priority, and time estimates).
 *
 *   2. Recognize "new task at work"–style openers that don't yet
 *      contain enough info, and ask a focused follow-up for exactly
 *      ONE missing slot at a time (title → due date → length →
 *      manager → deliverables).
 *
 *   3. Parse recurring schedules like "I work Mon/Tue/Thu/Fri 9-5"
 *      into a Recurrence rule so the calendar can materialize events.
 *
 *   4. Return natural assistant messages + tap-to-reply suggestion
 *      chips instead of raw errors.
 *
 * The shape is deliberately stable so we can swap the innards for a
 * real model call later without touching any caller.
 * -----------------------------------------------------------------------
 */

export interface AssistantResponse {
  /** The human-facing reply to show in the chat. */
  reply: string;
  /** Suggested chips the user can tap. */
  suggestions?: string[];
  /** Draft tasks that should be added to the store immediately. */
  tasks?: ParsedTaskDraft[];
  /** A recurrence rule the caller should project onto the calendar. */
  recurrence?: Recurrence;
  /** State machine instruction — set/clear pending intent. */
  nextIntent?: PendingIntent | null;
  /** Whether the assistant thinks the user is overcommitted. */
  overloaded?: boolean;
  /** How the owl should feel while "speaking". */
  mood?: 'idle' | 'talking' | 'thinking' | 'happy';
  /** Which owner the new tasks/recurrence should be attributed to. */
  ownerHint?: 'me' | 'partner';
}

/**
 * The entry point the assistant screen calls on every user turn.
 *
 * When EXPO_PUBLIC_ANTHROPIC_API_KEY is set we route through Claude
 * (real conversation, real reasoning, tool calls for task/schedule
 * creation). Otherwise we fall back to the local deterministic
 * slot-filler so the app still works offline / unconfigured.
 *
 * @param input     The new user turn.
 * @param history   Full prior conversation from the assistant store
 *                  — used as context for Claude. Can be empty for
 *                  offline-only mode.
 * @param pending   Local slot-fill state. Only used by the fallback
 *                  path; Claude handles its own follow-ups.
 */
export async function handleUserTurn(
  input: string,
  history: AssistantMessage[],
  pending: PendingIntent | null,
): Promise<AssistantResponse> {
  if (hasApiKey()) {
    try {
      return await handleTurnWithClaude(input, history);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('[ai] Gemini call failed, falling back:', msg);
      const local = await handleTurnLocally(input, pending);
      return {
        ...local,
        reply:
          local.reply ||
          "I'm having trouble reaching my brain — falling back to my simpler parser for this one.",
        mood: local.mood ?? 'idle',
      };
    }
  }
  return handleTurnLocally(input, pending);
}

/**
 * Local, deterministic, regex-based fallback. This used to be the
 * main handler — it still is when no API key is configured.
 */
async function handleTurnLocally(
  input: string,
  pending: PendingIntent | null,
): Promise<AssistantResponse> {
  const text = input.trim();
  if (!text) {
    return {
      reply: "I didn't catch that — try again?",
      mood: 'idle',
    };
  }

  // If the assistant is in the middle of filling a task's slots, route
  // this turn into the slot-filler first.
  if (pending) {
    return continuePendingIntent(text, pending);
  }

  // Recurring schedule? ("I work mon/tue/thu/fri 9-5")
  const recurrence = parseRecurrence(text);
  if (recurrence) {
    return {
      reply: buildRecurrenceConfirmation(text, recurrence),
      recurrence,
      mood: 'happy',
      suggestions: ['Add lunch break', 'Mark Wednesdays as free', 'Thanks'],
    };
  }

  // Does the opener read like "I have a new task at work" but lacks
  // the specifics? Start a slot-fill conversation.
  if (looksLikeNewTaskOpener(text)) {
    return startNewTaskIntent(text);
  }

  // Otherwise: try to parse one-or-more concrete tasks.
  const drafts = extractDrafts(text);
  if (drafts.length === 0) {
    // Instead of "couldn't find a task" — treat this like a new-task
    // opener and pull the user into the slot-filler.
    return startNewTaskIntent(text);
  }

  const overloaded = isOverloaded(drafts);
  return {
    reply: buildDraftSummary(drafts, overloaded),
    tasks: drafts,
    overloaded,
    mood: overloaded ? 'thinking' : 'happy',
    suggestions: overloaded
      ? ['Move low-priority to next week', 'Leave it', 'Anything else?']
      : ['Add another', 'Set a reminder', 'Thanks'],
  };
}

/* -------------------------------------------------------------------------
 * Remote (Claude) turn handler
 *
 * Sends the full conversation to Claude with a system prompt and a
 * small set of tools (create_task, create_recurring_schedule,
 * suggest_replies). Claude does its own conversation + follow-ups,
 * and the tool calls are translated into the same AssistantResponse
 * shape the rest of the app already speaks.
 * -------------------------------------------------------------------------
 */

async function handleTurnWithClaude(
  input: string,
  history: AssistantMessage[],
): Promise<AssistantResponse> {
  const text = input.trim();
  if (!text) {
    return { reply: "I didn't catch that — try again?", mood: 'idle' };
  }

  // Build the message list Claude expects. Keep the last ~20 turns
  // for context — beyond that the cost climbs and the owl starts
  // repeating itself.
  const recent = history.slice(-20);
  const messages: ClaudeMessage[] = recent
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({ role: m.role, content: m.text }));

  // If the last message in history isn't already this turn (edge
  // case: caller forgot to append), add it so Claude sees the input.
  if (
    messages.length === 0 ||
    messages[messages.length - 1].role !== 'user' ||
    messages[messages.length - 1].content !== text
  ) {
    messages.push({ role: 'user', content: text });
  }

  // Pull the current user identity so Claude knows who it's talking to
  // and which one of the pair is the "partner" for ownership decisions.
  const currentUserId = useUserStore.getState().currentUserId ?? 'sarah';
  const partnerId = otherUserId(currentUserId);
  const userName = userPalettes[currentUserId].name;
  const partnerName = userPalettes[partnerId].name;

  const result = await callClaude({
    messages,
    userName,
    partnerName,
  });

  const tasks: ParsedTaskDraft[] = [];
  let recurrence: Recurrence | undefined;
  let suggestions: string[] | undefined;
  let partnerOwned = false;

  for (const call of result.toolCalls) {
    if (call.name === 'create_task') {
      const t = call.input as {
        title?: string;
        dueAt?: string;
        startAt?: string;
        endAt?: string;
        priority?: Priority;
        estimatedMinutes?: number;
        notes?: string;
        owner?: 'me' | 'partner';
      };
      // Reject nameless tasks — the owl is instructed to always name
      // them. If the model slips and sends "New task" / "Untitled" /
      // empty, skip the tool call entirely so the user is forced to
      // describe it in words.
      const rawTitle = (t.title ?? '').trim();
      if (!rawTitle || /^(new task|untitled|task)$/i.test(rawTitle)) {
        continue;
      }
      tasks.push({
        title: rawTitle,
        dueAt: t.dueAt ?? null,
        startAt: t.startAt ?? null,
        endAt: t.endAt ?? null,
        priority: t.priority ?? 'medium',
        estimatedMinutes: t.estimatedMinutes,
        notes: t.notes,
      });
      if (t.owner === 'partner') partnerOwned = true;
    } else if (call.name === 'create_recurring_schedule') {
      const r = call.input as {
        title?: string;
        days?: Weekday[];
        startTime?: string;
        endTime?: string;
        weeksAhead?: number;
      };
      if (r.days && r.startTime && r.endTime) {
        recurrence = {
          days: r.days,
          startTime: r.startTime,
          endTime: r.endTime,
          weeksAhead: r.weeksAhead ?? 4,
        };
      }
    } else if (call.name === 'suggest_replies') {
      const s = call.input as { suggestions?: string[] };
      if (Array.isArray(s.suggestions) && s.suggestions.length > 0) {
        suggestions = s.suggestions.slice(0, 5);
      }
    }
  }

  const createdSomething = tasks.length > 0 || !!recurrence;

  return {
    reply: result.text || (createdSomething ? 'Done.' : 'Hm, say that again?'),
    tasks: tasks.length > 0 ? tasks : undefined,
    recurrence,
    suggestions,
    mood: createdSomething ? 'happy' : 'idle',
    nextIntent: null, // Claude handles follow-ups naturally in conversation
    // Partner ownership is surfaced via a flag for the caller to use;
    // the store's addTasksFromDrafts takes an explicit ownerId so the
    // screen picks between 'me' and the partner id based on this.
    ownerHint: partnerOwned ? 'partner' : 'me',
  };
}

/* -------------------------------------------------------------------------
 * Context detection — different kinds of tasks need different questions
 * -------------------------------------------------------------------------
 */

function detectContext(text: string): TaskContext {
  const lower = text.toLowerCase();
  if (
    /\b(work|job|project|client|brief|office|boss|manager|deadline|site|quote|invoice|meeting|contract|stakeholder|deliverable)\b/.test(
      lower,
    )
  ) {
    return 'work';
  }
  if (/\b(gym|workout|run|yoga|swim|cycle|bike|lift|pilates|training)\b/.test(lower)) {
    return 'fitness';
  }
  if (
    /\b(grocer|shopping|store|pick up|errand|dry clean|post office|bank)\b/.test(
      lower,
    )
  ) {
    return 'errands';
  }
  if (
    /\b(dinner|drinks|party|date night|birthday|brunch|lunch with|see the)\b/.test(
      lower,
    )
  ) {
    return 'social';
  }
  return 'personal';
}

/**
 * Which slots to ask about, in order, for a given context. Work gets
 * the full interrogation (manager, deliverables, estimate); a gym
 * session just needs title + when.
 */
function slotsForContext(context: TaskContext): TaskSlot[] {
  switch (context) {
    case 'work':
      return ['title', 'dueAt', 'estimatedMinutes', 'manager', 'deliverables'];
    case 'fitness':
      return ['title', 'dueAt', 'estimatedMinutes'];
    case 'errands':
      return ['title', 'dueAt'];
    case 'social':
      return ['title', 'dueAt', 'manager']; // "who with?"
    default:
      return ['title', 'dueAt'];
  }
}

/* -------------------------------------------------------------------------
 * Slot-filling state machine
 * -------------------------------------------------------------------------
 */

function startNewTaskIntent(text: string): AssistantResponse {
  const context = detectContext(text);
  // Seed the draft with whatever we can already extract from the opener.
  const seed = extractDrafts(text)[0];
  const draft: Partial<Task> = seed
    ? {
        title: seed.title,
        dueAt: seed.dueAt,
        priority: seed.priority,
        estimatedMinutes: seed.estimatedMinutes,
        context,
      }
    : { priority: 'medium', context };

  // If the "title" we inferred is just the opener ("new job work") —
  // drop it so we ask the user for a real name.
  if (draft.title && isJunkTitle(draft.title)) {
    delete draft.title;
  }

  // Context-aware slot order — e.g. fitness skips manager/deliverables.
  const pending = slotsForContext(context).filter((s) => isSlotMissing(draft, s));
  const current = pending.shift() ?? null;

  if (!current) {
    // Everything already known — commit the task straight away.
    return commitDraft(draft);
  }

  return {
    reply: questionFor(current, draft, context),
    suggestions: suggestionsFor(current, context),
    mood: 'thinking',
    nextIntent: {
      kind: 'new-task',
      context,
      draft,
      pending,
      currentSlot: current,
    },
  };
}

// "new job work", "new task", "gotta do a thing" — these read like openers,
// not task names. When the parser picks them up we discard them so the
// slot-filler prompts for a real name.
function isJunkTitle(title: string): boolean {
  const lower = title.toLowerCase().trim();
  return (
    /^(new )?(job|task|project|thing|brief|work|item)s?$/.test(lower) ||
    /^(a|an|some) (new )?(job|task|project|thing|brief|work|item)s?$/.test(lower) ||
    lower.length < 4
  );
}

function continuePendingIntent(
  text: string,
  pending: PendingIntent,
): AssistantResponse {
  // The user can always bail out.
  if (/\b(cancel|stop|never ?mind|forget it)\b/i.test(text)) {
    return {
      reply: "No problem — I've dropped it.",
      nextIntent: null,
      mood: 'idle',
    };
  }

  const context: TaskContext = pending.context ?? 'personal';
  const draft = { ...pending.draft };

  // Fill the current slot with whatever the user said.
  if (pending.currentSlot) {
    applySlotAnswer(draft, pending.currentSlot, text);
  }

  // Find the next slot we still need. We stop asking once the
  // required-for-commit slots (title + dueAt) are filled — the rest
  // become optional and we offer to skip them.
  const remaining = pending.pending.filter((s) => isSlotMissing(draft, s));
  const hasRequired = !!draft.title && !!draft.dueAt;

  if (hasRequired && (remaining.length === 0 || isSkipResponse(text))) {
    return commitDraft(draft);
  }

  const next = remaining.shift() ?? null;

  // If we're into the optional slots, let the user know they can skip.
  if (next && isOptional(next)) {
    return {
      reply: questionFor(next, draft, context),
      suggestions: [...suggestionsFor(next, context), 'Skip'],
      mood: 'thinking',
      nextIntent: {
        kind: pending.kind,
        context,
        draft,
        pending: remaining,
        currentSlot: next,
      },
    };
  }

  if (!next) {
    return commitDraft(draft);
  }

  return {
    reply: questionFor(next, draft, context),
    suggestions: suggestionsFor(next, context),
    mood: 'thinking',
    nextIntent: {
      kind: pending.kind,
      context,
      draft,
      pending: remaining,
      currentSlot: next,
    },
  };
}

function commitDraft(draft: Partial<Task>): AssistantResponse {
  const finalDraft: ParsedTaskDraft = {
    title: draft.title ?? 'New task',
    dueAt: draft.dueAt ?? null,
    priority: draft.priority ?? 'medium',
    estimatedMinutes: draft.estimatedMinutes,
    notes: buildNotes(draft),
  };
  return {
    reply: buildCommitMessage(finalDraft, draft),
    tasks: [finalDraft],
    nextIntent: null,
    mood: 'happy',
    suggestions: ['Add another', "That's it", 'Anything urgent?'],
  };
}

function isSlotMissing(draft: Partial<Task>, slot: TaskSlot): boolean {
  switch (slot) {
    case 'title':
      return !draft.title || draft.title.length < 3;
    case 'dueAt':
      return !draft.dueAt;
    case 'estimatedMinutes':
      return draft.estimatedMinutes == null;
    case 'manager':
      return !draft.manager;
    case 'deliverables':
      return !draft.deliverables;
    case 'who':
      return false; // handled separately — not asked in the main flow
  }
}

function isOptional(slot: TaskSlot): boolean {
  return slot === 'manager' || slot === 'deliverables' || slot === 'estimatedMinutes';
}

function isSkipResponse(text: string): boolean {
  return /^(skip|no|none|nah|n\/a|not sure|dunno|don't know)\b/i.test(text.trim());
}

function applySlotAnswer(
  draft: Partial<Task>,
  slot: TaskSlot,
  answer: string,
): void {
  const clean = answer.trim();

  switch (slot) {
    case 'title':
      draft.title = capitalize(clean);
      return;

    case 'dueAt': {
      const iso = extractDueDate(clean);
      if (iso) draft.dueAt = iso;
      return;
    }

    case 'estimatedMinutes': {
      const mins = extractEstimate(clean);
      if (mins != null) draft.estimatedMinutes = mins;
      return;
    }

    case 'manager':
      if (!isSkipResponse(clean)) draft.manager = clean;
      return;

    case 'deliverables':
      if (!isSkipResponse(clean)) draft.deliverables = clean;
      return;
  }
}

/**
 * Question phrasing adapts to the context — a work task gets asked
 * differently to a gym session. The goal is to sound like a
 * colleague who's paying attention, not a form.
 */
function questionFor(
  slot: TaskSlot,
  draft: Partial<Task>,
  context: TaskContext,
): string {
  switch (slot) {
    case 'title':
      switch (context) {
        case 'work':
          return draft.dueAt
            ? `What's the name of the task that's due for work?`
            : `What's the name of the task? (so I know what to call it in your work list)`;
        case 'fitness':
          return 'What kind of workout?';
        case 'errands':
          return 'What do you need to pick up?';
        case 'social':
          return "What's the plan?";
        default:
          return "What would you like to call it?";
      }

    case 'dueAt':
      switch (context) {
        case 'work':
          return draft.title
            ? `When's "${draft.title}" due?`
            : "What's the deadline?";
        case 'fitness':
          return 'When are you planning to do it?';
        case 'errands':
          return 'When do you need it done by?';
        case 'social':
          return "When is it?";
        default:
          return draft.title
            ? `When does "${draft.title}" need to be done?`
            : 'When does it need to be done?';
      }

    case 'estimatedMinutes':
      switch (context) {
        case 'work':
          return 'Roughly how many hours of work is it?';
        case 'fitness':
          return 'How long will you spend on it?';
        default:
          return "Roughly how long do you think it'll take?";
      }

    case 'manager':
      return context === 'social'
        ? 'Who are you going with? (or skip)'
        : "Who's running it? (or skip)";

    case 'deliverables':
      return 'What do you need to hand over at the end? (or skip)';

    case 'who':
      return 'Whose task is this — yours or your partner\'s?';
  }
}

function suggestionsFor(slot: TaskSlot, context: TaskContext): string[] {
  switch (slot) {
    case 'title':
      return [];
    case 'dueAt':
      return context === 'work'
        ? ['Today', 'Tomorrow', 'This Friday', 'Next week']
        : ['Today', 'Tomorrow', 'This weekend', 'Next week'];
    case 'estimatedMinutes':
      return context === 'work'
        ? ['1 hour', 'Half day', 'Full day', '2 days']
        : ['30 min', '1 hour', 'Half day', 'Full day'];
    case 'manager':
      return [];
    case 'deliverables':
      return [];
    case 'who':
      return ['Mine', "Partner's"];
  }
}

function buildNotes(draft: Partial<Task>): string | undefined {
  const parts: string[] = [];
  if (draft.manager) parts.push(`Manager: ${draft.manager}`);
  if (draft.deliverables) parts.push(`Deliverables: ${draft.deliverables}`);
  return parts.length > 0 ? parts.join(' · ') : undefined;
}

function buildCommitMessage(draft: ParsedTaskDraft, rich: Partial<Task>): string {
  const bits: string[] = [`Got it — "${draft.title}"`];
  if (draft.dueAt) bits.push(`due ${formatDueRelative(draft.dueAt)}`);
  if (draft.estimatedMinutes) bits.push(`~${formatMinutes(draft.estimatedMinutes)}`);
  const base = bits.join(', ') + '.';
  if (rich.manager || rich.deliverables) {
    return `${base} I saved the details too.`;
  }
  return base;
}

/* -------------------------------------------------------------------------
 * Direct-parse path (fast path — full message in one go)
 * -------------------------------------------------------------------------
 */

function looksLikeNewTaskOpener(text: string): boolean {
  // Match things like: "I have a new task", "got a new job at work",
  // "new project", "got some work", "need help with..."
  const lower = text.toLowerCase();
  return (
    /\b(new|another)\b.*\b(task|job|project|thing|brief)\b/.test(lower) ||
    /\b(i (have|got|have got)|gotta|need to remember)\b.*\b(task|job|project|brief|thing|work)\b/.test(
      lower,
    ) ||
    /^(remind me|can you|help me)\b/.test(lower)
  );
}

function extractDrafts(text: string): ParsedTaskDraft[] {
  const segments = text
    .split(/\n|,|;| and | also | plus /i)
    .map((s) => s.trim())
    .filter((s) => s.length > 2);

  return segments.map(extractOneDraft).filter((d) => d.title.length >= 3);
}

function extractOneDraft(raw: string): ParsedTaskDraft {
  const text = raw
    .replace(
      /^(i|i've|i have|ive|i need to|need to|gotta|got to|must|please|can you|help me)\s+/i,
      '',
    )
    .trim();
  const title = capitalize(text.replace(/\s+/g, ' '));

  return {
    title,
    dueAt: extractDueDate(raw),
    priority: extractPriority(raw),
    estimatedMinutes: extractEstimate(raw),
  };
}

const MONTH_NAMES: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

function extractDueDate(raw: string): string | null {
  const lower = raw.toLowerCase();
  const now = new Date();

  // Relative words — fastest path.
  if (/\btonight\b/.test(lower)) return toISO(endOfDay(now));
  if (/\btoday\b/.test(lower)) return toISO(addHours(startOfDay(now), 17));
  if (/\btomorrow\b/.test(lower))
    return toISO(addHours(startOfDay(addDays(now, 1)), 9));
  if (/\bnext week\b/.test(lower)) return toISO(nextMonday(now));
  if (/\bmonday\b/.test(lower)) return toISO(nextMonday(now));
  if (/\btuesday\b/.test(lower)) return toISO(nextTuesday(now));
  if (/\bwednesday\b/.test(lower)) return toISO(nextWednesday(now));
  if (/\bthursday\b/.test(lower)) return toISO(nextThursday(now));
  if (/\bfriday\b/.test(lower)) return toISO(nextFriday(now));
  if (/\bsaturday\b/.test(lower)) return toISO(nextSaturday(now));
  if (/\bsunday\b/.test(lower)) return toISO(nextSunday(now));

  const inDays = lower.match(/in (\d+) days?/);
  if (inDays) return toISO(addDays(now, parseInt(inDays[1], 10)));

  // Ordinal + month name: "15th may" / "15 may"
  const dayMonth = lower.match(
    /\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/,
  );
  if (dayMonth) {
    const day = parseInt(dayMonth[1], 10);
    const monthIdx = MONTH_NAMES[dayMonth[2]];
    if (monthIdx != null) return toISO(dateOn(now, monthIdx, day, 9, 0));
  }

  // Month first: "may 15" / "may 15th"
  const monthDay = lower.match(
    /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?\b/,
  );
  if (monthDay) {
    const monthIdx = MONTH_NAMES[monthDay[1]];
    const day = parseInt(monthDay[2], 10);
    if (monthIdx != null) return toISO(dateOn(now, monthIdx, day, 9, 0));
  }

  // Numeric DD/MM or DD-MM (UK default). Accepts optional year.
  const numeric = lower.match(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/);
  if (numeric) {
    const day = parseInt(numeric[1], 10);
    const month = parseInt(numeric[2], 10) - 1;
    const yearStr = numeric[3];
    if (day >= 1 && day <= 31 && month >= 0 && month <= 11) {
      let target = dateOn(now, month, day, 9, 0);
      if (yearStr) {
        const year = yearStr.length === 2 ? 2000 + parseInt(yearStr, 10) : parseInt(yearStr, 10);
        target = new Date(target);
        target.setFullYear(year);
      }
      return toISO(target);
    }
  }

  return null;
}

/**
 * Builds a Date on the given month/day with time set, rolling forward
 * to next year if the target would otherwise be in the past.
 */
function dateOn(now: Date, month: number, day: number, hour: number, minute: number): Date {
  let d = setMonth(now, month);
  d = setDate(d, day);
  d.setHours(hour, minute, 0, 0);
  if (d.getTime() < now.getTime() - 12 * 60 * 60 * 1000) {
    d = addYears(d, 1);
  }
  return d;
}

function extractPriority(raw: string): Priority {
  const lower = raw.toLowerCase();
  if (/urgent|asap|tight|overdue|now|critical|deadline/.test(lower)) return 'high';
  if (/later|someday|eventually|next month|whenever/.test(lower)) return 'low';
  return 'medium';
}

function extractEstimate(raw: string): number | undefined {
  const lower = raw.toLowerCase();

  if (/half ?day/.test(lower)) return 4 * 60;
  if (/full ?day|whole day|all day/.test(lower)) return 8 * 60;

  const match = lower.match(/(\d+(?:\.\d+)?)\s*(min|minute|mins|hour|hr|hours|hrs)/);
  if (!match) return undefined;
  const n = parseFloat(match[1]);
  const unit = match[2];
  return unit.startsWith('h') ? Math.round(n * 60) : Math.round(n);
}

/* -------------------------------------------------------------------------
 * Recurring schedule parsing
 * -------------------------------------------------------------------------
 */

const DAY_TOKENS: Record<string, Weekday> = {
  mon: 'mon', monday: 'mon',
  tue: 'tue', tues: 'tue', tuesday: 'tue',
  wed: 'wed', weds: 'wed', wednesday: 'wed',
  thu: 'thu', thur: 'thu', thurs: 'thu', thursday: 'thu',
  fri: 'fri', friday: 'fri',
  sat: 'sat', saturday: 'sat',
  sun: 'sun', sunday: 'sun',
};

const WEEKDAYS: Weekday[] = ['mon', 'tue', 'wed', 'thu', 'fri'];
const ALL_DAYS: Weekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

function parseRecurrence(raw: string): Recurrence | null {
  const lower = raw.toLowerCase();

  // Must read like a recurring schedule.
  if (
    !/\b(every|each|weekly|work(ing|s)?|from)\b/.test(lower) &&
    !/\bmon|tue|wed|thu|fri|sat|sun/.test(lower)
  ) {
    return null;
  }

  // Time range: "9-5", "9am to 5pm", "09:00 - 17:00"
  const timeMatch = lower.match(
    /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:-|to|until|till)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/,
  );
  if (!timeMatch) return null;

  const startHour = to24h(parseInt(timeMatch[1], 10), timeMatch[3], false);
  const startMin = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
  const endHour = to24h(parseInt(timeMatch[4], 10), timeMatch[6], true);
  const endMin = timeMatch[5] ? parseInt(timeMatch[5], 10) : 0;

  // Days: weekdays, every day, mon/tue/thu/fri, etc.
  let days: Weekday[] = [];
  if (/\bweekdays?\b/.test(lower) || /\bweek days\b/.test(lower)) {
    days = [...WEEKDAYS];
  } else if (/\bevery ?day|daily|each day\b/.test(lower)) {
    days = [...ALL_DAYS];
  } else if (/\bweekends?\b/.test(lower)) {
    days = ['sat', 'sun'];
  } else {
    // Pick individual day tokens.
    const tokens = lower.match(
      /\b(mon|tue|tues|wed|weds|thu|thur|thurs|fri|sat|sun|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/g,
    );
    if (tokens) {
      days = Array.from(new Set(tokens.map((t) => DAY_TOKENS[t]))).filter(Boolean);
    }
  }

  // Exclusions: "except wednesday", "not on friday"
  const excluded = lower.match(
    /(?:except|not on|apart from|without|excluding)\s+([a-z/, ]+)/,
  );
  if (excluded && days.length > 0) {
    const exTokens =
      excluded[1].match(
        /\b(mon|tue|tues|wed|weds|thu|thur|thurs|fri|sat|sun|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/g,
      ) ?? [];
    const exSet = new Set(exTokens.map((t) => DAY_TOKENS[t]));
    days = days.filter((d) => !exSet.has(d));
  }

  if (days.length === 0) return null;

  return {
    days,
    startTime: `${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`,
    endTime: `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`,
    weeksAhead: 4,
  };
}

function to24h(hour: number, ampm: string | undefined, isEnd: boolean): number {
  if (ampm === 'pm' && hour < 12) return hour + 12;
  if (ampm === 'am' && hour === 12) return 0;
  if (!ampm) {
    // Heuristic — "9-5" almost always means 9am-5pm.
    if (isEnd && hour < 8) return hour + 12;
  }
  return hour;
}

function buildRecurrenceConfirmation(raw: string, rec: Recurrence): string {
  const dayLabel = formatDays(rec.days);
  const timeLabel = `${rec.startTime}–${rec.endTime}`;
  return `Blocked out ${timeLabel} on ${dayLabel} for the next ${rec.weeksAhead ?? 4} weeks. Anything else you want me to schedule around it?`;
}

function formatDays(days: Weekday[]): string {
  const short: Record<Weekday, string> = {
    mon: 'Mon',
    tue: 'Tue',
    wed: 'Wed',
    thu: 'Thu',
    fri: 'Fri',
    sat: 'Sat',
    sun: 'Sun',
  };
  if (
    days.length === 5 &&
    days.every((d) => WEEKDAYS.includes(d)) &&
    WEEKDAYS.every((d) => days.includes(d))
  ) {
    return 'weekdays';
  }
  if (days.length === 7) return 'every day';
  return days.map((d) => short[d]).join(', ');
}

/* -------------------------------------------------------------------------
 * Small helpers
 * -------------------------------------------------------------------------
 */

function capitalize(s: string): string {
  if (s.length === 0) return s;
  return s[0].toUpperCase() + s.slice(1);
}

function formatMinutes(mins: number): string {
  if (mins >= 60) {
    const h = Math.round((mins / 60) * 10) / 10;
    return `${h}h`;
  }
  return `${mins}m`;
}

function formatDueRelative(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.round(
    (startOfDay(d).getTime() - startOfDay(now).getTime()) / (24 * 60 * 60 * 1000),
  );
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'tomorrow';
  if (diffDays > 1 && diffDays < 7)
    return d.toLocaleDateString(undefined, { weekday: 'long' });
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function isOverloaded(drafts: ParsedTaskDraft[]): boolean {
  const minutes = drafts.reduce((sum, d) => sum + (d.estimatedMinutes ?? 25), 0);
  return drafts.length > 5 || minutes > 6 * 60;
}

function buildDraftSummary(
  drafts: ParsedTaskDraft[],
  overloaded: boolean,
): string {
  if (drafts.length === 1) {
    const d = drafts[0];
    const parts: string[] = [`Got it — "${d.title}"`];
    if (d.dueAt) parts.push(`for ${formatDueRelative(d.dueAt)}`);
    return parts.join(' ') + '.';
  }
  const base = `Got it — I added ${drafts.length} tasks.`;
  if (overloaded)
    return `${base} Heads up: that's a heavy stretch. I'd move the lower-priority ones to later in the week.`;
  return `${base} Your week still looks manageable.`;
}

/* -------------------------------------------------------------------------
 * Daily briefing — used by the 7 AM notification and the home screen.
 * -------------------------------------------------------------------------
 */

export interface BriefingArgs {
  name: string;
  partnerName?: string | null;
  myTasks: Task[];
  partnerTasks: Task[];
  now?: Date;
}

export interface DailyBriefing {
  greeting: string;
  myLines: string[];
  partnerLines: string[];
  oneLiner: string;
}

export function buildDailyBriefing(args: BriefingArgs): DailyBriefing {
  const now = args.now ?? new Date();
  const today = startOfDay(now);

  const myToday = filterForToday(args.myTasks, today);
  const partnerToday = filterForToday(args.partnerTasks, today);

  const myLines = myToday.length === 0
    ? ['Nothing on the books — enjoy the breathing room.']
    : myToday.map((t) => lineFor(t));

  const partnerLines = partnerToday.length === 0
    ? [args.partnerName
        ? `${args.partnerName} is clear today.`
        : 'Your partner is clear today.']
    : partnerToday.map((t) => lineFor(t));

  const greeting = `Morning, ${args.name}.`;
  const summary: string[] = [];
  if (myToday.length > 0)
    summary.push(`${myToday.length} on your plate`);
  if (partnerToday.length > 0 && args.partnerName)
    summary.push(`${partnerToday.length} on ${args.partnerName}'s`);
  const oneLiner =
    summary.length > 0 ? `${summary.join(' · ')}.` : 'Today is wide open.';

  return { greeting, myLines, partnerLines, oneLiner };
}

function filterForToday(tasks: Task[], today: Date): Task[] {
  return tasks
    .filter((t) => {
      if (t.status === 'done') return false;
      const when = t.startAt ?? t.dueAt;
      if (!when) return false;
      const d = startOfDay(new Date(when));
      return d.getTime() === today.getTime();
    })
    .sort((a, b) => {
      const aw = new Date(a.startAt ?? a.dueAt ?? 0).getTime();
      const bw = new Date(b.startAt ?? b.dueAt ?? 0).getTime();
      return aw - bw;
    });
}

function lineFor(t: Task): string {
  if (t.startAt && t.endAt) {
    const s = formatClock(new Date(t.startAt));
    const e = formatClock(new Date(t.endAt));
    return `${s}–${e}  ${t.title}`;
  }
  if (t.dueAt) {
    return `${formatClock(new Date(t.dueAt))}  ${t.title}`;
  }
  return t.title;
}

function formatClock(d: Date): string {
  const h = d.getHours();
  const m = d.getMinutes();
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
