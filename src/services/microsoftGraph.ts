import { getSecret, SECRET_KEYS } from './secureStorage';

const GRAPH = 'https://graph.microsoft.com/v1.0';

export interface OutlookMailSummary {
  id: string;
  from: string;
  subject: string;
  preview: string;
  receivedAt: string;
  webLink?: string;
}

export interface TeamsMessageSummary {
  id: string;
  chatId: string;
  from: string;
  preview: string;
  receivedAt: string;
}

async function token(): Promise<string | null> {
  return getSecret(SECRET_KEYS.microsoftAccessToken);
}

async function req<T>(path: string): Promise<T> {
  const t = await token();
  if (!t) throw new Error('Microsoft access token not available');
  const res = await fetch(`${GRAPH}${path}`, {
    headers: { Authorization: `Bearer ${t}` },
  });
  if (!res.ok) throw new Error(`Graph ${res.status}: ${await res.text()}`);
  return (await res.json()) as T;
}

type RawMail = {
  id: string;
  subject?: string;
  bodyPreview?: string;
  receivedDateTime: string;
  webLink?: string;
  from?: { emailAddress?: { name?: string; address?: string } };
};

type RawTeamsMsg = {
  id: string;
  chatId: string;
  createdDateTime: string;
  body?: { content?: string };
  from?: { user?: { displayName?: string } };
};

export async function listRecentMail(
  since: Date,
  top = 25,
): Promise<OutlookMailSummary[]> {
  const sinceIso = since.toISOString();
  const data = await req<{ value: RawMail[] }>(
    `/me/messages?$top=${top}&$orderby=receivedDateTime desc&$filter=receivedDateTime ge ${sinceIso}`,
  );
  return data.value.map((m) => ({
    id: m.id,
    from:
      m.from?.emailAddress?.name ?? m.from?.emailAddress?.address ?? 'Unknown',
    subject: m.subject ?? '(no subject)',
    preview: m.bodyPreview ?? '',
    receivedAt: m.receivedDateTime,
    webLink: m.webLink,
  }));
}

export async function listTeamsMessages(
  since: Date,
  top = 25,
): Promise<TeamsMessageSummary[]> {
  const sinceIso = since.toISOString();
  const data = await req<{ value: RawTeamsMsg[] }>(
    `/me/chats/getAllMessages?$top=${top}&$filter=createdDateTime ge ${sinceIso}`,
  );
  return data.value.map((m) => ({
    id: m.id,
    chatId: m.chatId,
    from: m.from?.user?.displayName ?? 'Unknown',
    preview: stripHtml(m.body?.content ?? ''),
    receivedAt: m.createdDateTime,
  }));
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}
