import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Icon, Screen, Text } from '@/components';
import { colors, radius, spacing, typography } from '@/theme';
import {
  FAST_MODEL,
  SMART_MODEL,
  DEEP_THINK_MODEL,
  type ModelId,
} from '@/services/anthropic';
import { useAssistantStore } from '@/store/useAssistantStore';
import { useTaskStore } from '@/store/useTaskStore';
import { useUserStore } from '@/store/useUserStore';
import { useIntegrationsStore } from '@/store/useIntegrationsStore';
import { sendWeekAheadNow } from '@/services/notifications';
import {
  connectGoogle,
  connectMicrosoft,
  disconnectGoogle,
  disconnectMicrosoft,
} from '@/services/oauth';
import {
  SECRET_KEYS,
  deleteSecret,
  getSecret,
  setSecret,
} from '@/services/secureStorage';
import type { IntegrationId } from '@/types/integrations';

/**
 * Profile & settings. The Anthropic API key is baked in via
 * .env (EXPO_PUBLIC_ANTHROPIC_API_KEY) — no runtime UI for it. This
 * screen handles your name, notifications, and OAuth connections.
 */
export const ProfileScreen: React.FC = () => {
  const user = useUserStore((s) => s.user);
  const setName = useUserStore((s) => s.setName);
  const modelPreference = useUserStore((s) => s.modelPreference);
  const setModelPreference = useUserStore((s) => s.setModelPreference);
  const resetAssistant = useAssistantStore((s) => s.reset);
  const tasks = useTaskStore((s) => s.tasks);
  const providers = useIntegrationsStore((s) => s.providers);
  const setConnected = useIntegrationsStore((s) => s.setConnected);
  const setDisconnected = useIntegrationsStore((s) => s.setDisconnected);

  const [draftName, setDraftName] = useState(user.name);
  const [clickupDraft, setClickupDraft] = useState('');
  const [clickupSet, setClickupSet] = useState(false);
  const [busy, setBusy] = useState<IntegrationId | null>(null);

  useEffect(() => {
    getSecret(SECRET_KEYS.clickupToken).then((v) => setClickupSet(Boolean(v)));
  }, []);

  const handleSaveName = () => {
    if (draftName.trim() && draftName.trim() !== user.name) {
      setName(draftName.trim());
    }
  };

  const handleConnectGoogle = useCallback(async () => {
    setBusy('google');
    try {
      const ok = await connectGoogle();
      if (ok) setConnected('google', 'Google account');
    } catch (err) {
      Alert.alert('Google connect failed', errMsg(err));
    } finally {
      setBusy(null);
    }
  }, [setConnected]);

  const handleDisconnectGoogle = useCallback(async () => {
    await disconnectGoogle();
    setDisconnected('google');
  }, [setDisconnected]);

  const handleConnectMicrosoft = useCallback(async () => {
    setBusy('microsoft');
    try {
      const ok = await connectMicrosoft();
      if (ok) setConnected('microsoft', 'Microsoft account');
    } catch (err) {
      Alert.alert('Microsoft connect failed', errMsg(err));
    } finally {
      setBusy(null);
    }
  }, [setConnected]);

  const handleDisconnectMicrosoft = useCallback(async () => {
    await disconnectMicrosoft();
    setDisconnected('microsoft');
  }, [setDisconnected]);

  const handleSaveClickUp = useCallback(async () => {
    const v = clickupDraft.trim();
    if (!v) return;
    setBusy('clickup');
    await setSecret(SECRET_KEYS.clickupToken, v);
    setConnected('clickup', 'Personal token');
    setClickupSet(true);
    setClickupDraft('');
    setBusy(null);
  }, [clickupDraft, setConnected]);

  const handleClearClickUp = useCallback(async () => {
    await deleteSecret(SECRET_KEYS.clickupToken);
    setDisconnected('clickup');
    setClickupSet(false);
  }, [setDisconnected]);

  const handleSendWeekAhead = async () => {
    const upcoming = tasks
      .filter((t) => (t.startAt ?? t.dueAt) !== null)
      .slice(0, 5)
      .map((t) => t.title);
    await sendWeekAheadNow({
      userName: user.name,
      upcomingTitles: upcoming,
    });
  };

  return (
    <Screen scroll>
      <Text variant="largeTitle">Profile</Text>
      <Text variant="subhead" style={{ marginBottom: spacing.xl }}>
        Small knobs. Nothing fussy.
      </Text>

      <Text variant="caption" style={styles.sectionLabel}>YOUR NAME</Text>
      <View style={styles.field}>
        <TextInput
          value={draftName}
          onChangeText={setDraftName}
          onBlur={handleSaveName}
          onSubmitEditing={handleSaveName}
          placeholder="Your name"
          placeholderTextColor={colors.textTertiary}
          style={[typography.headline, styles.input]}
          returnKeyType="done"
        />
      </View>
      <Text variant="footnote" style={styles.hint}>
        Ottley uses this when he talks to you.
      </Text>

      <Text
        variant="caption"
        style={[styles.sectionLabel, { marginTop: spacing.xl }]}
      >
        OTTLEY'S BRAIN
      </Text>
      <View style={styles.card}>
        <ModelRow
          label="Haiku"
          hint="Fastest, cheapest. Default."
          model={FAST_MODEL}
          selected={modelPreference}
          onSelect={setModelPreference}
          first
        />
        <ModelRow
          label="Sonnet"
          hint="Sharper reasoning, ~5× cost."
          model={SMART_MODEL}
          selected={modelPreference}
          onSelect={setModelPreference}
        />
        <ModelRow
          label="Opus"
          hint="Top-tier. Slow, expensive."
          model={DEEP_THINK_MODEL}
          selected={modelPreference}
          onSelect={setModelPreference}
        />
      </View>
      <Text variant="footnote" style={styles.hint}>
        Swap any time. Change applies to the next thing you ask.
      </Text>

      <Text
        variant="caption"
        style={[styles.sectionLabel, { marginTop: spacing.xl }]}
      >
        CONNECTIONS
      </Text>

      <View style={styles.card}>
        <ConnectionRow
          label="Google (Gmail, Calendar, Drive)"
          connected={providers.google.connected}
          busy={busy === 'google'}
          onConnect={handleConnectGoogle}
          onDisconnect={handleDisconnectGoogle}
          first
        />
        <ConnectionRow
          label="Microsoft (Outlook + Teams)"
          connected={providers.microsoft.connected}
          busy={busy === 'microsoft'}
          onConnect={handleConnectMicrosoft}
          onDisconnect={handleDisconnectMicrosoft}
        />

        <View style={[styles.connectionRow, styles.connectionRowDivider]}>
          <View style={{ flex: 1 }}>
            <Text variant="body" weight="500">ClickUp</Text>
            <Text variant="footnote" style={{ color: colors.textTertiary }}>
              {clickupSet ? 'Token saved' : 'Personal API token'}
            </Text>
          </View>
          {clickupSet ? (
            <Pressable onPress={handleClearClickUp} hitSlop={6}>
              <Text variant="footnote" color={colors.danger} weight="600">
                Remove
              </Text>
            </Pressable>
          ) : (
            <View style={styles.clickupRow}>
              <TextInput
                value={clickupDraft}
                onChangeText={setClickupDraft}
                placeholder="pk_…"
                placeholderTextColor={colors.textTertiary}
                style={[typography.footnote, styles.clickupInput]}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
              />
              <Pressable
                onPress={handleSaveClickUp}
                disabled={!clickupDraft.trim() || busy === 'clickup'}
                style={[
                  styles.saveBtn,
                  (!clickupDraft.trim() || busy === 'clickup') && styles.saveBtnDisabled,
                ]}
                hitSlop={6}
              >
                <Text variant="caption" color={colors.textInverse} weight="600">
                  SAVE
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>

      <Text variant="footnote" style={styles.hint}>
        Tokens live in your device's secure store. Revoke them in each
        provider's settings when you're done.
      </Text>

      <Pressable
        onPress={handleSendWeekAhead}
        style={[
          styles.primaryBtn,
          { marginTop: spacing.xl, backgroundColor: colors.text },
        ]}
      >
        <Icon name="sparkle" size={16} color={colors.textInverse} />
        <Text variant="headline" color={colors.textInverse}>
          Send week-ahead briefing
        </Text>
      </Pressable>

      <Pressable onPress={resetAssistant} style={styles.secondaryBtn}>
        <Icon name="close" size={16} color={colors.textSecondary} />
        <Text variant="footnote">Reset conversation with Ottley</Text>
      </Pressable>
    </Screen>
  );
};

interface ModelRowProps {
  label: string;
  hint: string;
  model: ModelId;
  selected: ModelId;
  onSelect: (m: ModelId) => void;
  first?: boolean;
}

const ModelRow: React.FC<ModelRowProps> = ({
  label,
  hint,
  model,
  selected,
  onSelect,
  first,
}) => {
  const active = selected === model;
  return (
    <Pressable
      onPress={() => onSelect(model)}
      style={[
        styles.connectionRow,
        !first && styles.connectionRowDivider,
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text variant="body" weight="500">
          {label}
        </Text>
        <Text variant="footnote" style={{ color: colors.textTertiary }}>
          {hint}
        </Text>
      </View>
      <View
        style={[
          styles.radio,
          active && styles.radioActive,
        ]}
      >
        {active ? <View style={styles.radioDot} /> : null}
      </View>
    </Pressable>
  );
};

interface ConnRowProps {
  label: string;
  connected: boolean;
  busy: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  first?: boolean;
}

const ConnectionRow: React.FC<ConnRowProps> = ({
  label,
  connected,
  busy,
  onConnect,
  onDisconnect,
  first,
}) => (
  <View
    style={[
      styles.connectionRow,
      !first && styles.connectionRowDivider,
    ]}
  >
    <View style={{ flex: 1 }}>
      <Text variant="body" weight="500">
        {label}
      </Text>
      <Text variant="footnote" style={{ color: colors.textTertiary }}>
        {connected ? 'Connected' : 'Not connected'}
      </Text>
    </View>
    <Pressable
      onPress={connected ? onDisconnect : onConnect}
      disabled={busy}
      hitSlop={6}
      style={[
        styles.connectBtn,
        connected ? styles.connectBtnSecondary : styles.connectBtnPrimary,
        busy && styles.saveBtnDisabled,
      ]}
    >
      <Text
        variant="caption"
        color={connected ? colors.text : colors.textInverse}
        weight="600"
      >
        {busy ? '…' : connected ? 'DISCONNECT' : 'CONNECT'}
      </Text>
    </Pressable>
  </View>
);

function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

const styles = StyleSheet.create({
  sectionLabel: {
    marginBottom: spacing.sm,
  },
  field: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  input: {
    color: colors.text,
  },
  hint: {
    marginTop: spacing.xs,
    color: colors.textTertiary,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: {
    borderColor: colors.text,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.text,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  connectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  connectionRowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  connectBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  connectBtnPrimary: {
    backgroundColor: colors.text,
  },
  connectBtnSecondary: {
    backgroundColor: colors.surfaceMuted,
  },
  clickupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  clickupInput: {
    width: 120,
    paddingVertical: 4,
    color: colors.text,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  saveBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.text,
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  primaryBtn: {
    marginTop: spacing.md,
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.text,
  },
  secondaryBtn: {
    marginTop: spacing.lg,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});
