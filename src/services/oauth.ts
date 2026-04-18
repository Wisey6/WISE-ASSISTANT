import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

import {
  SECRET_KEYS,
  deleteSecret,
  getSecret,
  setSecret,
} from './secureStorage';

WebBrowser.maybeCompleteAuthSession();

/**
 * Google / Microsoft refuse `exp://…` as a redirect URI. In Expo Go
 * we bounce through a static HTML page on GitHub Pages that reads
 * `state` (which we populate with the real exp:// URL) and then
 * deep-links back into Expo Go with the ?code= query preserved.
 *
 * Set EXPO_PUBLIC_OAUTH_PROXY_URL to something like
 *   https://<user>.github.io/wise-assistant/oauth-callback.html
 * to enable. Leave blank to fall back to the raw Expo URL — fine for
 * development builds with a custom scheme registered natively.
 */
const PROXY_URL = process.env.EXPO_PUBLIC_OAUTH_PROXY_URL?.trim() || null;

function b64urlEncode(value: string): string {
  // btoa works on ASCII only; our value is already an ASCII URL.
  // eslint-disable-next-line no-undef
  const b64 =
    typeof btoa === 'function'
      ? btoa(value)
      : Buffer.from(value, 'utf-8').toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * When a proxy is configured we return the proxy URL as the redirect
 * and pack the real Expo callback into `state` so the HTML page can
 * forward the ?code back. Returns both the URI to hand to Google and
 * the state payload to thread through the request/exchange pair.
 */
function proxyOrDirect(directUri: string): {
  redirectUri: string;
  state?: string;
} {
  if (!PROXY_URL) return { redirectUri: directUri };
  return {
    redirectUri: PROXY_URL,
    state: b64urlEncode(directUri),
  };
}

/** --------------------------- Google OAuth --------------------------- */

const GOOGLE_DISCOVERY = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/drive.readonly',
  'openid',
  'email',
  'profile',
];

async function googleClientId(): Promise<string> {
  const fromSecret = await getSecret(SECRET_KEYS.googleClientId);
  if (fromSecret) return fromSecret;
  return (
    process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB ??
    process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ??
    ''
  );
}

export async function connectGoogle(): Promise<boolean> {
  const clientId = await googleClientId();
  if (!clientId) {
    throw new Error(
      'No Google Client ID. Paste one in Profile → Credentials (or set EXPO_PUBLIC_GOOGLE_CLIENT_ID).',
    );
  }

  const directUri = AuthSession.makeRedirectUri({
    scheme: 'wiseassistant',
    path: 'oauth/google',
  });
  const { redirectUri, state } = proxyOrDirect(directUri);

  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log(
      `[OAuth] Google — register this URI in Google Cloud:\n  ${redirectUri}\n(inner exp target: ${directUri})`,
    );
  }

  const request = new AuthSession.AuthRequest({
    clientId,
    redirectUri,
    scopes: GOOGLE_SCOPES,
    responseType: AuthSession.ResponseType.Code,
    usePKCE: true,
    state,
    extraParams: { access_type: 'offline', prompt: 'consent' },
  });

  await request.makeAuthUrlAsync(GOOGLE_DISCOVERY);
  const result = await request.promptAsync(GOOGLE_DISCOVERY);

  if (result.type !== 'success' || !result.params.code) return false;

  const tokens = await AuthSession.exchangeCodeAsync(
    {
      clientId,
      code: result.params.code,
      redirectUri,
      extraParams: request.codeVerifier
        ? { code_verifier: request.codeVerifier }
        : undefined,
    },
    GOOGLE_DISCOVERY,
  );

  await setSecret(SECRET_KEYS.googleAccessToken, tokens.accessToken);
  if (tokens.refreshToken) {
    await setSecret(SECRET_KEYS.googleRefreshToken, tokens.refreshToken);
  }
  if (tokens.expiresIn) {
    await setSecret(
      SECRET_KEYS.googleExpiresAt,
      String(Date.now() + tokens.expiresIn * 1000),
    );
  }
  return true;
}

export async function disconnectGoogle(): Promise<void> {
  const token = await getSecret(SECRET_KEYS.googleAccessToken);
  if (token) {
    await fetch(
      `${GOOGLE_DISCOVERY.revocationEndpoint}?token=${encodeURIComponent(token)}`,
      { method: 'POST' },
    ).catch(() => undefined);
  }
  await deleteSecret(SECRET_KEYS.googleAccessToken);
  await deleteSecret(SECRET_KEYS.googleRefreshToken);
  await deleteSecret(SECRET_KEYS.googleExpiresAt);
}

export async function ensureFreshGoogleToken(): Promise<string | null> {
  const token = await getSecret(SECRET_KEYS.googleAccessToken);
  const refresh = await getSecret(SECRET_KEYS.googleRefreshToken);
  const expiresAt = await getSecret(SECRET_KEYS.googleExpiresAt);
  if (!token) return null;

  const safeWindow = 60 * 1000;
  if (
    refresh &&
    expiresAt &&
    Date.now() + safeWindow >= Number(expiresAt)
  ) {
    const clientId = await googleClientId();
    const tokens = await AuthSession.refreshAsync(
      { clientId, refreshToken: refresh },
      GOOGLE_DISCOVERY,
    ).catch(() => null);
    if (tokens?.accessToken) {
      await setSecret(SECRET_KEYS.googleAccessToken, tokens.accessToken);
      if (tokens.expiresIn) {
        await setSecret(
          SECRET_KEYS.googleExpiresAt,
          String(Date.now() + tokens.expiresIn * 1000),
        );
      }
      return tokens.accessToken;
    }
  }
  return token;
}

/** -------------------------- Microsoft OAuth -------------------------- */

const MS_SCOPES = [
  'Mail.Read',
  'Calendars.ReadWrite',
  'Chat.Read',
  'offline_access',
  'openid',
  'profile',
];

async function msTenant(): Promise<string> {
  const fromSecret = await getSecret(SECRET_KEYS.microsoftTenantId);
  return fromSecret ?? process.env.EXPO_PUBLIC_MS_TENANT_ID ?? 'common';
}

async function msDiscovery(): Promise<{
  authorizationEndpoint: string;
  tokenEndpoint: string;
}> {
  const tenant = await msTenant();
  return {
    authorizationEndpoint: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`,
    tokenEndpoint: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
  };
}

async function msClientId(): Promise<string> {
  const fromSecret = await getSecret(SECRET_KEYS.microsoftClientId);
  if (fromSecret) return fromSecret;
  return process.env.EXPO_PUBLIC_MS_CLIENT_ID ?? '';
}

export async function connectMicrosoft(): Promise<boolean> {
  const clientId = await msClientId();
  if (!clientId) {
    throw new Error(
      'No Microsoft Client ID. Paste one in Profile → Credentials (or set EXPO_PUBLIC_MS_CLIENT_ID).',
    );
  }

  const directUri = AuthSession.makeRedirectUri({
    scheme: 'wiseassistant',
    path: 'oauth/microsoft',
  });
  const { redirectUri, state } = proxyOrDirect(directUri);

  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log(
      `[OAuth] Microsoft — register this URI in entra.microsoft.com:\n  ${redirectUri}\n(inner exp target: ${directUri})`,
    );
  }

  const discovery = await msDiscovery();
  const request = new AuthSession.AuthRequest({
    clientId,
    redirectUri,
    scopes: MS_SCOPES,
    responseType: AuthSession.ResponseType.Code,
    usePKCE: true,
    state,
  });

  await request.makeAuthUrlAsync(discovery);
  const result = await request.promptAsync(discovery);

  if (result.type !== 'success' || !result.params.code) return false;

  const tokens = await AuthSession.exchangeCodeAsync(
    {
      clientId,
      code: result.params.code,
      redirectUri,
      extraParams: request.codeVerifier
        ? { code_verifier: request.codeVerifier }
        : undefined,
    },
    discovery,
  );

  await setSecret(SECRET_KEYS.microsoftAccessToken, tokens.accessToken);
  if (tokens.refreshToken) {
    await setSecret(SECRET_KEYS.microsoftRefreshToken, tokens.refreshToken);
  }
  if (tokens.expiresIn) {
    await setSecret(
      SECRET_KEYS.microsoftExpiresAt,
      String(Date.now() + tokens.expiresIn * 1000),
    );
  }
  return true;
}

export async function disconnectMicrosoft(): Promise<void> {
  await deleteSecret(SECRET_KEYS.microsoftAccessToken);
  await deleteSecret(SECRET_KEYS.microsoftRefreshToken);
  await deleteSecret(SECRET_KEYS.microsoftExpiresAt);
}

export async function ensureFreshMicrosoftToken(): Promise<string | null> {
  const token = await getSecret(SECRET_KEYS.microsoftAccessToken);
  const refresh = await getSecret(SECRET_KEYS.microsoftRefreshToken);
  const expiresAt = await getSecret(SECRET_KEYS.microsoftExpiresAt);
  if (!token) return null;

  const safeWindow = 60 * 1000;
  if (
    refresh &&
    expiresAt &&
    Date.now() + safeWindow >= Number(expiresAt)
  ) {
    const clientId = await msClientId();
    const discovery = await msDiscovery();
    const tokens = await AuthSession.refreshAsync(
      { clientId, refreshToken: refresh, scopes: MS_SCOPES },
      discovery,
    ).catch(() => null);
    if (tokens?.accessToken) {
      await setSecret(SECRET_KEYS.microsoftAccessToken, tokens.accessToken);
      if (tokens.expiresIn) {
        await setSecret(
          SECRET_KEYS.microsoftExpiresAt,
          String(Date.now() + tokens.expiresIn * 1000),
        );
      }
      return tokens.accessToken;
    }
  }
  return token;
}
