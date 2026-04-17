import { getSecret, SECRET_KEYS } from './secureStorage';

const API = 'https://www.googleapis.com/drive/v3';

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  webViewLink?: string;
}

async function token(): Promise<string | null> {
  return getSecret(SECRET_KEYS.googleAccessToken);
}

async function req<T>(path: string, init?: RequestInit): Promise<T | string> {
  const t = await token();
  if (!t) throw new Error('Google access token not available');
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${t}`,
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`Drive ${res.status}: ${await res.text()}`);
  const ct = res.headers.get('content-type') ?? '';
  if (ct.includes('application/json')) return (await res.json()) as T;
  return await res.text();
}

export async function searchFiles(query: string, limit = 10): Promise<DriveFile[]> {
  const qs = new URLSearchParams({
    q: `name contains '${query.replace(/'/g, "\\'")}' or fullText contains '${query.replace(/'/g, "\\'")}'`,
    fields: 'files(id,name,mimeType,modifiedTime,webViewLink)',
    pageSize: String(Math.min(limit, 25)),
  });
  const data = (await req(`/files?${qs}`)) as { files?: DriveFile[] };
  return data.files ?? [];
}

export async function readFile(fileId: string): Promise<string> {
  // Docs need to be exported; text/plain files can be downloaded directly.
  const meta = (await req(`/files/${fileId}?fields=mimeType,name`)) as {
    mimeType: string;
    name: string;
  };
  if (meta.mimeType === 'application/vnd.google-apps.document') {
    const text = await req(`/files/${fileId}/export?mimeType=text/plain`);
    return typeof text === 'string' ? text : '';
  }
  if (meta.mimeType.startsWith('text/') || meta.mimeType.includes('plain')) {
    const text = await req(`/files/${fileId}?alt=media`);
    return typeof text === 'string' ? text : '';
  }
  return `[Binary or unsupported file type: ${meta.mimeType}]`;
}
