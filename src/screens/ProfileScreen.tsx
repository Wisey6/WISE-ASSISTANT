import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, OwlCharacter, Screen, Text } from '@/components';
import {
  colors,
  radius,
  spacing,
  useUserTheme,
  userPalettes,
} from '@/theme';
import { otherUserId, useUserStore } from '@/store/useUserStore';
import { usePartnersStore } from '@/store/usePartnersStore';
import { useAssistantStore } from '@/store/useAssistantStore';
import { useTaskStore } from '@/store/useTaskStore';
import { buildDailyBriefing } from '@/services/ai';
import { sendWeekAheadNow } from '@/services/notifications';
import type { UserId } from '@/types';

/**
 * Profile & settings. Minimal on purpose:
 *
 *   - Shows you + your partner (fixed Sarah/Tyler pair)
 *   - Morning briefing preview
 *   - Send this week's briefing now (with weather)
 *   - Reset the assistant conversation
 *   - Switch user (wipes identity back to the picker)
 */
export const ProfileScreen: React.FC = () => {
  const user = useUserStore((s) => s.user);
  const currentUserId = useUserStore((s) => s.currentUserId);
  const signOut = useUserStore((s) => s.signOut);
  const nameFor = usePartnersStore((s) => s.nameFor);
  const resetAssistant = useAssistantStore((s) => s.reset);
  const tasks = useTaskStore((s) => s.tasks);
  const palette = useUserTheme();

  const myId: UserId = (currentUserId ?? 'sarah') as UserId;
  const partnerId: UserId = otherUserId(myId);
  const partnerName = nameFor(partnerId);
  const partnerPalette = userPalettes[partnerId];

  const myTasks = tasks.filter((t) => {
    const owner = t.ownerId === 'me' || t.ownerId === 'local-user' ? myId : t.ownerId;
    return owner === myId;
  });
  const partnerTasks = tasks.filter((t) => {
    const owner = t.ownerId === 'me' || t.ownerId === 'local-user' ? myId : t.ownerId;
    return owner === partnerId;
  });

  const briefing = buildDailyBriefing({
    name: user?.name ?? 'You',
    partnerName,
    myTasks,
    partnerTasks,
  });

  const handleSendWeekAhead = async () => {
    const upcoming = myTasks
      .filter((t) => (t.startAt ?? t.dueAt) !== null)
      .slice(0, 5)
      .map((t) => t.title);
    await sendWeekAheadNow({
      userName: user?.name ?? 'you',
      upcomingTitles: upcoming,
    });
  };

  return (
    <Screen scroll>
      <Text variant="largeTitle">Profile</Text>
      <Text variant="subhead" style={{ marginBottom: spacing.xl }}>
        Small knobs. Nothing fussy.
      </Text>

      {/* Me */}
      <Text variant="caption" style={styles.sectionLabel}>
        YOU
      </Text>
      <View
        style={[
          styles.row,
          { backgroundColor: palette.accentSoft, borderColor: palette.accent },
        ]}
      >
        <View style={styles.avatarWrap}>
          <OwlCharacter size={56} variant={myId} state="idle" />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="headline" color={palette.accentDeep}>
            {user?.name ?? 'You'}
          </Text>
          <Text variant="footnote" color={palette.accentDeep}>
            {myId === 'sarah' ? 'pink theme' : 'blue theme'}
          </Text>
        </View>
      </View>

      {/* Partner */}
      <Text
        variant="caption"
        style={[styles.sectionLabel, { marginTop: spacing.xl }]}
      >
        PARTNER
      </Text>
      <View
        style={[
          styles.row,
          {
            backgroundColor: partnerPalette.accentSoft,
            borderColor: partnerPalette.accent,
          },
        ]}
      >
        <View style={styles.avatarWrap}>
          <OwlCharacter size={56} variant={partnerId} state="idle" />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="headline" color={partnerPalette.accentDeep}>
            {partnerName}
          </Text>
          <Text variant="footnote" color={partnerPalette.accentDeep}>
            Sharing tasks & calendar (read-only on this phone)
          </Text>
        </View>
      </View>

      {/* Morning briefing preview */}
      <Text
        variant="caption"
        style={[styles.sectionLabel, { marginTop: spacing.xl }]}
      >
        TOMORROW'S BRIEFING
      </Text>
      <View style={styles.briefing}>
        <Text variant="headline" color={colors.textInverse}>
          {briefing.greeting}
        </Text>
        <Text
          variant="subhead"
          color={colors.textInverseMuted}
          style={{ marginTop: 4 }}
        >
          {briefing.oneLiner}
        </Text>

        <View style={styles.briefingBlock}>
          <Text variant="caption" color={colors.textInverseMuted}>
            YOUR DAY
          </Text>
          {briefing.myLines.map((line, i) => (
            <Text
              key={`me-${i}`}
              variant="body"
              color={colors.textInverse}
              style={styles.briefingLine}
            >
              {line}
            </Text>
          ))}
        </View>

        <View style={styles.briefingBlock}>
          <Text variant="caption" color={colors.textInverseMuted}>
            {partnerName.toUpperCase()}'S DAY
          </Text>
          {briefing.partnerLines.map((line, i) => (
            <Text
              key={`p-${i}`}
              variant="body"
              color={colors.textInverse}
              style={styles.briefingLine}
            >
              {line}
            </Text>
          ))}
        </View>
      </View>

      <Pressable
        onPress={handleSendWeekAhead}
        style={[styles.primaryBtn, { backgroundColor: palette.accent }]}
      >
        <Icon name="sparkle" size={16} color="#FFFFFF" />
        <Text variant="headline" color="#FFFFFF">
          Send week-ahead briefing
        </Text>
      </Pressable>

      <Pressable onPress={resetAssistant} style={styles.secondaryBtn}>
        <Icon name="close" size={16} color={colors.textSecondary} />
        <Text variant="footnote">Reset conversation</Text>
      </Pressable>

      <Pressable onPress={signOut} style={styles.signOutBtn}>
        <Text variant="footnote" color={colors.textTertiary}>
          Switch user
        </Text>
      </Pressable>
    </Screen>
  );
};

const styles = StyleSheet.create({
  sectionLabel: {
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 2,
  },
  avatarWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  briefing: {
    backgroundColor: colors.surfaceInverse,
    borderRadius: radius.xxl,
    padding: spacing.lg,
  },
  briefingBlock: {
    marginTop: spacing.lg,
    gap: spacing.xs,
  },
  briefingLine: {
    marginTop: 2,
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
  signOutBtn: {
    marginTop: spacing.sm,
    alignSelf: 'center',
    paddingVertical: spacing.sm,
  },
});
