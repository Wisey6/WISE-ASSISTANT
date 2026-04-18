import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Icon, Screen, Text } from '@/components';
import { colors, radius, spacing, typography } from '@/theme';
import { useAssistantStore } from '@/store/useAssistantStore';
import { useTaskStore } from '@/store/useTaskStore';
import { useUserStore } from '@/store/useUserStore';
import { useIntegrationsStore } from '@/store/useIntegrationsStore';
import { sendWeekAheadNow } from '@/services/notifications';
import {
  deleteSecret,
  getSecret,
  SECRET_KEYS,
  setSecret,
} from '@/services/secureStorage';
import { resetClient } from '@/services/anthropic';

export const ProfileScreen: React.FC = () => {
  const user = useUserStore((s) => s.user);
  const setName = useUserStore((s) => s.setName);
  const resetAssistant = useAssistantStore((s) => s.reset);
  const tasks = useTaskStore((s) => s.tasks);
  const providers = useIntegrationsStore((s) => s.providers);

  const [draftName, setDraftName] = useState(user.name);
  const [apiKey, setApiKey] = useState('');
  const [keySet, setKeySet] = useState(false);
  const [savingKey, setSavingKey] = useState(false);

  useEffect(() => {
    getSecret(SECRET_KEYS.anthropicApiKey).then((v) => setKeySet(Boolean(v)));
  }, []);

  const handleSaveName = () => {
    if (draftName.trim() && draftName.trim() !== user.name) {
      setName(draftName.trim());
    }
  };

  const handleSaveKey = async () => {
    const value = apiKey.trim();
    if (!value) return;
    setSavingKey(true);
    await setSecret(SECRET_KEYS.anthropicApiKey, value);
    resetClient();
    setKeySet(true);
    setApiKey('');
    setSavingKey(false);
  };

  const handleClearKey = async () => {
    await deleteSecret(SECRET_KEYS.anthropicApiKey);
    resetClient();
    setKeySet(false);
  };

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

      <Text variant="caption" style={styles.sectionLabel}>
        YOUR NAME
      </Text>
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
        ANTHROPIC API KEY
      </Text>
      {keySet ? (
        <View style={styles.keyRow}>
          <View style={{ flex: 1 }}>
            <Text variant="body" weight="500">
              Key saved
            </Text>
            <Text variant="footnote" style={{ color: colors.textSecondary }}>
              Stored in the device secure store.
            </Text>
          </View>
          <Pressable onPress={handleClearKey} style={styles.clearBtn} hitSlop={6}>
            <Text variant="footnote" color={colors.danger}>
              Remove
            </Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View style={styles.field}>
            <TextInput
              value={apiKey}
              onChangeText={setApiKey}
              placeholder="sk-ant-…"
              placeholderTextColor={colors.textTertiary}
              style={[typography.body, styles.input]}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
            />
          </View>
          <Pressable
            onPress={handleSaveKey}
            disabled={savingKey || !apiKey.trim()}
            style={[
              styles.primaryBtn,
              (savingKey || !apiKey.trim()) && styles.primaryBtnDisabled,
            ]}
          >
            <Text variant="headline" color={colors.textInverse}>
              {savingKey ? 'Saving…' : 'Save key'}
            </Text>
          </Pressable>
        </>
      )}
      <Text variant="footnote" style={styles.hint}>
        Key lives only on this device. Personal use — don't share the app.
      </Text>

      <Text
        variant="caption"
        style={[styles.sectionLabel, { marginTop: spacing.xl }]}
      >
        INTEGRATIONS
      </Text>
      <View style={styles.integrationsCard}>
        {(['clickup', 'google', 'microsoft'] as const).map((id, i) => {
          const p = providers[id];
          return (
            <View
              key={id}
              style={[
                styles.integrationRow,
                i > 0 && styles.integrationDivider,
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text variant="body" weight="500">
                  {p.label}
                </Text>
                <Text
                  variant="footnote"
                  style={{ color: colors.textTertiary }}
                >
                  {p.connected ? 'Connected' : 'Not connected'}
                </Text>
              </View>
              <Text variant="footnote" style={{ color: colors.textSecondary }}>
                Coming soon
              </Text>
            </View>
          );
        })}
      </View>
      <Text variant="footnote" style={styles.hint}>
        OAuth connect flows are next. For now, drop tokens directly into the
        env or via debug.
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
  keyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  clearBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
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
  primaryBtnDisabled: {
    opacity: 0.5,
  },
  integrationsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  integrationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  integrationDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
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
