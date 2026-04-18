import { useIntegrationsStore } from '@/store/useIntegrationsStore';

import {
  SECRET_KEYS,
  getSecret,
  setSecret,
} from './secureStorage';

/**
 * Google OAuth Web client ID for Tyler's personal project. Seeded on
 * first launch so the user doesn't have to paste it. If they ever
 * rotate it, Profile → Credentials wins (secure-store is checked
 * first by `googleClientId()` in services/oauth.ts).
 */
const GOOGLE_CLIENT_ID_FALLBACK =
  '513928185671-78sh449l0o0m6rconjf4q7ok69t5vui7.apps.googleusercontent.com';

/**
 * On every app launch, reconcile "connected?" state with what we
 * actually have tokens for. Runs once; idempotent.
 *
 * ClickUp has a bootstrap shortcut: if EXPO_PUBLIC_CLICKUP_API_TOKEN
 * is present in .env and secure-store is empty, seed it. After that
 * first run the token lives in secure-store and the env var is no
 * longer consulted at runtime.
 */
export async function reconcileIntegrations(): Promise<void> {
  const store = useIntegrationsStore.getState();

  // -- ClickUp -----------------------------------------------------------
  let clickupToken = await getSecret(SECRET_KEYS.clickupToken);
  const envClickup = process.env.EXPO_PUBLIC_CLICKUP_API_TOKEN;
  if (!clickupToken && envClickup) {
    await setSecret(SECRET_KEYS.clickupToken, envClickup);
    clickupToken = envClickup;
  }
  if (clickupToken && !store.providers.clickup.connected) {
    store.setConnected('clickup', 'Personal token');
  } else if (!clickupToken && store.providers.clickup.connected) {
    store.setDisconnected('clickup');
  }

  // -- Google ------------------------------------------------------------
  // Seed the OAuth client ID so "Connect Google" works without a paste.
  const existingGoogleClientId = await getSecret(SECRET_KEYS.googleClientId);
  const envGoogleClientId =
    process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB ??
    process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
  if (!existingGoogleClientId) {
    await setSecret(
      SECRET_KEYS.googleClientId,
      envGoogleClientId || GOOGLE_CLIENT_ID_FALLBACK,
    );
  }

  const googleAccess = await getSecret(SECRET_KEYS.googleAccessToken);
  if (googleAccess && !store.providers.google.connected) {
    store.setConnected('google', 'Google account');
  } else if (!googleAccess && store.providers.google.connected) {
    store.setDisconnected('google');
  }

  // -- Microsoft ---------------------------------------------------------
  const msAccess = await getSecret(SECRET_KEYS.microsoftAccessToken);
  if (msAccess && !store.providers.microsoft.connected) {
    store.setConnected('microsoft', 'Microsoft account');
  } else if (!msAccess && store.providers.microsoft.connected) {
    store.setDisconnected('microsoft');
  }

  // -- Anthropic ---------------------------------------------------------
  const hasAnthropic =
    Boolean(process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY) ||
    Boolean(await getSecret(SECRET_KEYS.anthropicApiKey));
  if (hasAnthropic && !store.providers.anthropic.connected) {
    store.setConnected('anthropic', 'API key');
  } else if (!hasAnthropic && store.providers.anthropic.connected) {
    store.setDisconnected('anthropic');
  }
}
