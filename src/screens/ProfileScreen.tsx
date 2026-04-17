import React, { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Icon, Screen, Text } from '@/components';
import { colors, radius, spacing, typography } from '@/theme';
import { useAssistantStore } from '@/store/useAssistantStore';
import { useTaskStore } from '@/store/useTaskStore';
import { useUserStore } from '@/store/useUserStore';
import { sendWeekAheadNow } from '@/services/notifications';

/**
 * Profile & settings. Deliberately small — your name, a rename
 * field, and a couple of utility buttons.
 */
export const ProfileScreen: React.FC = () => {
  const user = useUserStore((s) => s.user);
  const setName = useUserStore((s) => s.setName);
  const resetAssistant = useAssistantStore((s) => s.reset);
  const tasks = useTaskStore((s) => s.tasks);
  const [draftName, setDraftName] = useState(user.name);

  const handleSaveName = () => {
    if (draftName.trim() && draftName.trim() !== user.name) {
      setName(draftName.trim());
    }
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
      <View style={styles.nameRow}>
        <TextInput
          value={draftName}
          onChangeText={setDraftName}
          onBlur={handleSaveName}
          onSubmitEditing={handleSaveName}
          placeholder="Your name"
          placeholderTextColor={colors.textTertiary}
          style={[typography.headline, styles.nameInput]}
          returnKeyType="done"
        />
      </View>
      <Text variant="footnote" style={styles.hint}>
        Ottley uses this when he talks to you.
      </Text>

      <Pressable
        onPress={handleSendWeekAhead}
        style={[styles.primaryBtn, { backgroundColor: colors.text }]}
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
  nameRow: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  nameInput: {
    color: colors.text,
  },
  hint: {
    marginTop: spacing.xs,
    color: colors.textTertiary,
  },
  primaryBtn: {
    marginTop: spacing.xl,
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: radius.pill,
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
