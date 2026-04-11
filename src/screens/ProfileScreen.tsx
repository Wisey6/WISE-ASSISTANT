import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, Screen, Text } from '@/components';
import { colors, radius, spacing, tagColors } from '@/theme';
import { useUserStore } from '@/store/useUserStore';
import { usePartnersStore } from '@/store/usePartnersStore';
import { useAssistantStore } from '@/store/useAssistantStore';
import { buildDailyBriefing } from '@/services/ai';
import { useTaskStore } from '@/store/useTaskStore';

/**
 * Profile & settings. Minimal on purpose:
 *
 *   - Your color tag
 *   - Partner color tag
 *   - Reset assistant conversation
 *   - Preview the morning briefing
 */
export const ProfileScreen: React.FC = () => {
  const user = useUserStore((s) => s.user);
  const partners = usePartnersStore((s) => s.partners);
  const meColor = usePartnersStore((s) => s.meColor);
  const setMeColor = usePartnersStore((s) => s.setMeColor);
  const setPartnerColor = usePartnersStore((s) => s.setPartnerColor);
  const resetAssistant = useAssistantStore((s) => s.reset);
  const tasks = useTaskStore((s) => s.tasks);

  const partner = partners[0];
  const briefing = buildDailyBriefing({
    name: user?.name ?? 'You',
    partnerName: partner?.name,
    myTasks: tasks.filter((t) => t.ownerId === 'me'),
    partnerTasks: tasks.filter((t) => t.ownerId !== 'me'),
  });

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
      <View style={styles.row}>
        <View style={[styles.avatar, { backgroundColor: meColor }]} />
        <View style={{ flex: 1 }}>
          <Text variant="headline">{user?.name ?? 'You'}</Text>
          <Text variant="footnote">{user?.email ?? 'not signed in'}</Text>
        </View>
      </View>
      <ColorRow value={meColor} onChange={setMeColor} />

      {/* Partner */}
      {partner && (
        <>
          <Text variant="caption" style={[styles.sectionLabel, { marginTop: spacing.xl }]}>
            PARTNER
          </Text>
          <View style={styles.row}>
            <View style={[styles.avatar, { backgroundColor: partner.color }]} />
            <View style={{ flex: 1 }}>
              <Text variant="headline">{partner.name}</Text>
              <Text variant="footnote">Sharing tasks & calendar</Text>
            </View>
          </View>
          <ColorRow
            value={partner.color}
            onChange={(c) => setPartnerColor(partner.id, c)}
          />
        </>
      )}

      {/* Morning briefing preview */}
      <Text variant="caption" style={[styles.sectionLabel, { marginTop: spacing.xl }]}>
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

        {partner && (
          <View style={styles.briefingBlock}>
            <Text variant="caption" color={colors.textInverseMuted}>
              {partner.name.toUpperCase()}'S DAY
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
        )}
      </View>

      <Pressable onPress={resetAssistant} style={styles.resetBtn}>
        <Icon name="close" size={18} color={colors.textSecondary} />
        <Text variant="footnote">Reset conversation</Text>
      </Pressable>
    </Screen>
  );
};

const ColorRow: React.FC<{
  value: string;
  onChange: (c: string) => void;
}> = ({ value, onChange }) => (
  <View style={styles.colorRow}>
    {tagColors.map((c) => {
      const active = c === value;
      return (
        <Pressable
          key={c}
          onPress={() => onChange(c)}
          style={[
            styles.swatch,
            { backgroundColor: c },
            active && styles.swatchActive,
          ]}
        />
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  sectionLabel: {
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  swatch: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchActive: {
    borderColor: colors.text,
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
  resetBtn: {
    marginTop: spacing.xl,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});
