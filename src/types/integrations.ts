export type IntegrationId = 'clickup' | 'google' | 'microsoft' | 'anthropic';

export interface IntegrationConnection {
  connected: boolean;
  label: string;
  /** Non-sensitive display metadata. Tokens themselves never live here. */
  account?: string;
  /** Epoch ms, 0 if never. */
  lastSyncedAt: number;
  /** Populated only for OAuth providers. Epoch ms; 0 when unknown. */
  tokenExpiresAt?: number;
  error?: string;
}
