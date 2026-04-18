import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

import {
  SECRET_KEYS,
  deleteSecret,
  getSecret,
  setSecret,
} from './secureStorage';

WebBrowser.maybeCompleteAuthSession();

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

function googleClientId(): string {
  // expo-auth-session picks the right platform-specific client id via
  // the Google provider helper on native; for a single-env dev setup
  // we just use one id. Users can override per-platform via env.
  return (
    process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB ??
    process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ??
    ''
  );
}

export async function connectGoogle(): Promise<boolean> {
  const clientId = googleClientId();
  if (!clientId) {
    throw new Error(
      'Missing EXPO_PUBLIC_GOOGLE_CLIENT_ID — add one to .env from console.cloud.google.com.',
    );
  }

  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'wiseassistant',
    path: 'oauth/google',
  });

  const request = new AuthSession.AuthRequest({
    clientId,
    redirectUri,
    scopes: GOOGLE_SCOPES,
    responseType: AuthSession.ResponseType.Code,
    usePKCE: true,
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
    const tokens = await AuthSession.refreshAsync(
      { clientId: googleClientId(), refreshToken: refresh },
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

const MS_TENANT = process.env.EXPO_PUBLIC_MS_TENANT_ID ?? 'common';

const MS_DISCOVERY = {
  authorizationEndpoint: `https://login.microsoftonline.com/${MS_TENANT}/oauth2/v2.0/authorize`,
  tokenEndpoint: `https://login.microsoftonline.com/${MS_TENANT}/oauth2/v2.0/token`,
};

const MS_SCOPES = ['Mail.Read', 'Chat.Read', 'offline_access', 'openid', 'profile'];

function msClientId(): string {
  return process.env.EXPO_PUBLIC_MS_CLIENT_ID ?? '';
}

export async function connectMicrosoft(): Promise<boolean> {
  const clientId = msClientId();
  if (!clientId) {
    throw new Error(
      'Missing EXPO_PUBLIC_MS_CLIENT_ID — register an app at entra.microsoft.com.',
    );
  }

  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'wiseassistant',
    path: 'oauth/microsoft',
  });

  const request = new AuthSession.AuthRequest({
    clientId,
    redirectUri,
    scopes: MS_SCOPES,
    responseType: AuthSession.ResponseType.Code,
    usePKCE: true,
  });

  await request.makeAuthUrlAsync(MS_DISCOVERY);
  const result = await request.promptAsync(MS_DISCOVERY);

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
    MS_DISCOVERY,
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
    const tokens = await AuthSession.refreshAsync(
      { clientId: msClientId(), refreshToken: refresh, scopes: MS_SCOPES },
      MS_DISCOVERY,
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
