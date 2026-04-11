import {
  addDays,
  addHours,
  endOfDay,
  nextFriday,
  nextMonday,
  nextSaturday,
  nextSunday,
  nextThursday,
  nextTuesday,
  nextWednesday,
  startOfDay,
} from 'date-fns';

import type {
  ParsedTaskDraft,
  PendingIntent,
  Priority,
  Recurrence,
  Task,
  TaskSlot,
  Weekday,
} from '@/types';
import { toISO } from '@/utils/date';

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
}

/**
 * The entry point the assistant screen calls on every user turn.
 * Pass the user's raw text plus the current pending intent (if any).
 */
export async function handleUserTurn(
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
 * Slot-filling state machine
 * -------------------------------------------------------------------------
 */

const FULL_SLOT_ORDER: TaskSlot[] = [
  'title',
  'dueAt',
  'estimatedMinutes',
  'manager',
  'deliverables',
];

function startNewTaskIntent(text: string): AssistantResponse {
  // Seed the draft with whatever we can already extract from the opener.
  const seed = extractDrafts(text)[0];
  const draft: Partial<Task> = seed
    ? {
        title: seed.title,
        dueAt: seed.dueAt,
        priority: seed.priority,
        estimatedMinutes: seed.estimatedMinutes,
      }
    : { priority: 'medium' };

  // Ask for the first missing slot.
  const pending = FULL_SLOT_ORDER.filter((s) => isSlotMissing(draft, s));
  const current = pending.shift() ?? null;

  if (!current) {
    // Everything already known — commit the task straight away.
    return commitDraft(draft);
  }

  return {
    reply: questionFor(current, draft),
    suggestions: suggestionsFor(current),
    mood: 'thinking',
    nextIntent: {
      kind: 'new-task',
      draft,
      pending,
      currentSlot: current,
    },
  };
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
      reply: questionFor(next, draft),
      suggestions: [...suggestionsFor(next), 'Skip'],
      mood: 'thinking',
      nextIntent: {
        kind: pending.kind,
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
    reply: questionFor(next, draft),
    suggestions: suggestionsFor(next),
    mood: 'thinking',
    nextIntent: {
      kind: pending.kind,
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

function questionFor(slot: TaskSlot, draft: Partial<Task>): string {
  switch (slot) {
    case 'title':
      return "What's the task — one line is fine.";
    case 'dueAt':
      return draft.title
        ? `When does "${draft.title}" need to be done?`
        : 'When does it need to be done?';
    case 'estimatedMinutes':
      return 'Roughly how long do you think it\'ll take?';
    case 'manager':
      return "Who's running it? (or skip)";
    case 'deliverables':
      return 'What are the deliverables? (or skip)';
  }
}

function suggestionsFor(slot: TaskSlot): string[] {
  switch (slot) {
    case 'title':
      return [];
    case 'dueAt':
      return ['Today', 'Tomorrow', 'Friday', 'Next week'];
    case 'estimatedMinutes':
      return ['30 min', '1 hour', 'Half day', 'Full day'];
    case 'manager':
      return [];
    case 'deliverables':
      return [];
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

function extractDueDate(raw: string): string | null {
  const lower = raw.toLowerCase();
  const now = new Date();

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

  return null;
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
