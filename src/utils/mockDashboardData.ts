import { addDays, addHours, set, startOfDay, subDays } from 'date-fns';

import type {
  JokeOfTheDay,
  Suggestion,
  UnifiedEvent,
  UnifiedTask,
} from '@/types/dashboard';
import { createId } from '@/utils/id';
import { toISO } from '@/utils/date';

const now = () => new Date();
const at = (offsetDays: number, hour: number, mins = 0) =>
  toISO(set(addDays(startOfDay(now()), offsetDays), { hours: hour, minutes: mins }));

export function mockTasks(): UnifiedTask[] {
  const t = now();
  return [
    {
      id: createId('task'),
      source: 'clickup',
      remoteId: 'cu-8102',
      title: 'Assignment 3 — Systems Design',
      notes: 'Write 2k word case study, submit to Canvas',
      category: 'study',
      status: 'inProgress',
      dueAt: at(4, 23, 59),
      url: 'https://app.clickup.com/t/8102',
      updatedAt: toISO(t),
    },
    {
      id: createId('task'),
      source: 'clickup',
      remoteId: 'cu-8103',
      title: 'Q2 planning doc review',
      category: 'work',
      status: 'todo',
      dueAt: at(1, 17, 0),
      url: 'https://app.clickup.com/t/8103',
      updatedAt: toISO(t),
    },
    {
      id: createId('task'),
      source: 'clickup',
      remoteId: 'cu-8110',
      title: 'Ship dashboard v1',
      category: 'work',
      status: 'inProgress',
      dueAt: at(6, 18, 0),
      url: 'https://app.clickup.com/t/8110',
      updatedAt: toISO(t),
    },
    {
      id: createId('task'),
      source: 'local',
      title: 'Book dentist appt',
      category: 'personal',
      status: 'todo',
      dueAt: at(2, 9, 0),
      updatedAt: toISO(t),
    },
    {
      id: createId('task'),
      source: 'local',
      title: 'Reply to landlord email',
      category: 'personal',
      status: 'blocked',
      dueAt: at(-1, 17, 0),
      updatedAt: toISO(subDays(t, 1)),
    },
    {
      id: createId('task'),
      source: 'clickup',
      remoteId: 'cu-8099',
      title: 'Pair review with Maya',
      category: 'work',
      status: 'completed',
      dueAt: at(-1, 15, 0),
      updatedAt: toISO(subDays(t, 1)),
    },
  ];
}

export function mockEvents(): UnifiedEvent[] {
  const t = now();
  return [
    {
      id: createId('evt'),
      source: 'google',
      remoteId: 'gcal-aaaa',
      title: 'Team standup',
      startAt: at(0, 9, 30),
      endAt: at(0, 9, 45),
      category: 'work',
      attendees: ['Alex', 'Maya', 'Jin'],
    },
    {
      id: createId('evt'),
      source: 'google',
      remoteId: 'gcal-bbbb',
      title: 'Lecture — Distributed Systems',
      startAt: at(0, 14, 0),
      endAt: at(0, 15, 30),
      category: 'study',
      location: 'Bldg 4 / Rm 207',
    },
    {
      id: createId('evt'),
      source: 'outlook',
      remoteId: 'ol-cccc',
      title: 'Design review w/ Product',
      startAt: at(1, 11, 0),
      endAt: at(1, 12, 0),
      category: 'work',
    },
    {
      id: createId('evt'),
      source: 'local',
      title: 'Run',
      startAt: toISO(addHours(t, 2)),
      endAt: toISO(addHours(t, 3)),
      category: 'personal',
    },
  ];
}

export function mockSuggestions(): Suggestion[] {
  const t = now();
  return [
    {
      id: createId('sug'),
      kind: 'prioritize',
      source: 'deadline_scan',
      title: 'Prioritize "Assignment 3"',
      reason: 'Due in 4 days — no time blocked yet and status is still in-progress.',
      payload: { note: 'Block 2h tomorrow morning?' },
      status: 'pending',
      createdAt: toISO(t),
      dedupeHash: 'deadline:cu-8102',
    },
    {
      id: createId('sug'),
      kind: 'create_event',
      source: 'outlook_scan',
      title: 'Schedule "Coffee with Priya"',
      reason: 'Priya emailed suggesting Thu 2–3pm. You\'re free on your calendar.',
      payload: {
        event: {
          title: 'Coffee with Priya',
          category: 'personal',
          startAt: at(3, 14, 0),
          endAt: at(3, 15, 0),
          source: 'local',
        },
      },
      status: 'pending',
      createdAt: toISO(t),
      dedupeHash: 'outlook:msg-7712',
    },
    {
      id: createId('sug'),
      kind: 'create_task',
      source: 'teams_scan',
      title: 'Follow up: Jin\'s PR review',
      reason: 'Jin pinged you in #design — hasn\'t heard back on the review.',
      payload: {
        task: {
          title: 'Review Jin\'s PR',
          category: 'work',
          status: 'todo',
          source: 'manual',
          dueAt: at(0, 18, 0),
        },
      },
      status: 'pending',
      createdAt: toISO(t),
      dedupeHash: 'teams:msg-4421',
    },
  ];
}

export function mockJoke(): JokeOfTheDay {
  return {
    id: createId('joke'),
    text: "Why don't scientists trust atoms? Because they make up everything.",
    date: new Date().toISOString().slice(0, 10),
  };
}
