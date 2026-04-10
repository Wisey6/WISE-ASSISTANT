import {
  addDays,
  addHours,
  endOfDay,
  nextFriday,
  nextMonday,
  startOfDay,
} from 'date-fns';

import type { ParsedTaskDraft, ParseResult, Priority } from '@/types';
import { toISO } from '@/utils/date';

/**
 * `parseUserInputToTasks`
 *
 * Turns a messy, conversational message into structured task drafts.
 *
 * This implementation is deliberately local-first and deterministic so
 * the app works offline and during development without a backend.
 * When an OpenAI key is available we can swap the body of this function
 * for a real model call — the return shape stays the same so every
 * caller (store, screens) keeps working unchanged.
 */
export async function parseUserInputToTasks(
  input: string,
): Promise<ParseResult> {
  const trimmed = input.trim();
  if (!trimmed) {
    return { tasks: [], summary: "I didn't catch that — try again?", overloaded: false };
  }

  // Split the sentence into task candidates. We look for common
  // separators people actually use when they dictate: commas,
  // semicolons, "and", "also", "plus", and newlines.
  const segments = trimmed
    .split(/\n|,|;| and | also | plus /i)
    .map((s) => s.trim())
    .filter((s) => s.length > 2);

  const drafts: ParsedTaskDraft[] = segments.map(extractDraft);

  // Simple overload heuristic — matches the "Overload detection" spec.
  const totalMinutes = drafts.reduce(
    (acc, d) => acc + (d.estimatedMinutes ?? 25),
    0,
  );
  const overloaded = drafts.length > 5 || totalMinutes > 6 * 60;

  const summary = buildSummary(drafts, overloaded);
  return { tasks: drafts, summary, overloaded };
}

/** Extracts a single task draft from a natural-language fragment. */
function extractDraft(raw: string): ParsedTaskDraft {
  const text = raw.replace(/^(i|i've|i have|ive|i need to|need to|gotta|got to|must)\s+/i, '');
  const title = capitalize(text.replace(/\s+/g, ' ').trim());

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
  if (/\btomorrow\b/.test(lower)) return toISO(addHours(startOfDay(addDays(now, 1)), 9));
  if (/\bnext week\b/.test(lower)) return toISO(nextMonday(now));
  if (/\bfriday\b/.test(lower)) return toISO(nextFriday(now));
  if (/\bmonday\b/.test(lower)) return toISO(nextMonday(now));

  const inDays = lower.match(/in (\d+) days?/);
  if (inDays) return toISO(addDays(now, parseInt(inDays[1], 10)));

  return null;
}

function extractPriority(raw: string): Priority {
  const lower = raw.toLowerCase();
  if (/urgent|asap|today|tight|overdue|now|critical/.test(lower)) return 'high';
  if (/later|someday|eventually|next month/.test(lower)) return 'low';
  return 'medium';
}

function extractEstimate(raw: string): number | undefined {
  const match = raw.toLowerCase().match(/(\d+)\s*(min|minute|hour|hr)/);
  if (!match) return undefined;
  const n = parseInt(match[1], 10);
  const unit = match[2];
  return unit.startsWith('h') ? n * 60 : n;
}

function capitalize(s: string): string {
  return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1);
}

function buildSummary(drafts: ParsedTaskDraft[], overloaded: boolean): string {
  if (drafts.length === 0) {
    return "I couldn't find a task in that. Could you rephrase?";
  }
  if (drafts.length === 1) {
    return `Got it — I added “${drafts[0].title}”. You're good.`;
  }
  const head = `Got it — I added ${drafts.length} tasks.`;
  if (overloaded) {
    return `${head} Heads up: that's a heavy day. I'd move the lower-priority ones to later in the week.`;
  }
  return `${head} Your day still looks manageable.`;
}

/**
 * Generates a short, friendly morning briefing.
 * Used by the 7 AM notification and the dashboard summary card.
 */
export function buildDailyBriefing(args: {
  name: string;
  dueToday: number;
  duePartner: number;
  overdue: number;
}): string {
  const { name, dueToday, duePartner, overdue } = args;
  const parts: string[] = [`Morning, ${name}.`];
  if (overdue > 0) parts.push(`${overdue} task${overdue > 1 ? 's are' : ' is'} overdue.`);
  if (dueToday === 0) parts.push('Nothing due today — enjoy the breathing room.');
  else parts.push(`${dueToday} due today.`);
  if (duePartner > 0) parts.push(`Your partner has ${duePartner} on their plate.`);
  return parts.join(' ');
}
