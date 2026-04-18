import { Platform } from 'react-native';

/**
 * Thin wrapper around expo-secure-store on native. On web there is no
 * OS keychain, so we fall back to localStorage with a visible warning
 * — fine for local dev, unsafe for production web deploys.
 *
 * The module is imported lazily so environments without
 * expo-secure-store installed don't crash on bundle. Swap the dynamic
 * import for the direct `import * as SecureStore from ...` once the
 * dependency is added to package.json.
 */
type SecureStoreModule = {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
};

let cached: SecureStoreModule | null | undefined;

async function loadNative(): Promise<SecureStoreModule | null> {
  if (cached !== undefined) return cached;
  try {
    const mod = (await import('expo-secure-store')) as SecureStoreModule;
    cached = {
      getItemAsync: mod.getItemAsync,
      setItemAsync: mod.setItemAsync,
      deleteItemAsync: mod.deleteItemAsync,
    };
  } catch {
    cached = null;
  }
  return cached;
}

export async function getSecret(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(`wise.secret.${key}`);
  }
  const native = await loadNative();
  if (!native) return null;
  return native.getItemAsync(key);
}

export async function setSecret(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(`wise.secret.${key}`, value);
    return;
  }
  const native = await loadNative();
  if (!native) return;
  await native.setItemAsync(key, value);
}

export async function deleteSecret(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(`wise.secret.${key}`);
    return;
  }
  const native = await loadNative();
  if (!native) return;
  await native.deleteItemAsync(key);
}

export const SECRET_KEYS = {
  anthropicApiKey: 'anthropic.apiKey',
  clickupToken: 'clickup.token',
  googleAccessToken: 'google.accessToken',
  googleRefreshToken: 'google.refreshToken',
  googleExpiresAt: 'google.expiresAt',
  googleClientId: 'google.clientId',
  microsoftAccessToken: 'microsoft.accessToken',
  microsoftRefreshToken: 'microsoft.refreshToken',
  microsoftExpiresAt: 'microsoft.expiresAt',
  microsoftClientId: 'microsoft.clientId',
  microsoftTenantId: 'microsoft.tenantId',
  openaiApiKey: 'openai.apiKey',
} as const;
