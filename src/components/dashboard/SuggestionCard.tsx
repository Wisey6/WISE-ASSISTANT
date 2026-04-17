import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  lightPalette,
  radius,
  spacing,
  typography,
} from '@/theme';
import { Text } from '@/components/Text';
import type { Suggestion } from '@/types/dashboard';

interface Props {
  suggestion: Suggestion;
  onApprove: (id: string) => void;
  onDismiss: (id: string) => void;
}

const sourceLabel: Record<Suggestion['source'], string> = {
  claude_chat: 'From chat',
  outlook_scan: 'From Outlook',
  teams_scan: 'From Teams',
  deadline_scan: 'Deadline watch',
};

export const SuggestionCard: React.FC<Props> = ({
  suggestion,
  onApprove,
  onDismiss,
}) => (
  <View style={styles.card}>
    <Text style={[typography.caption, styles.source]}>
      {sourceLabel[suggestion.source].toUpperCase()}
    </Text>
    <Text style={[typography.headline, styles.title]}>{suggestion.title}</Text>
    <Text style={[typography.subhead, styles.reason]}>
      {suggestion.reason}
    </Text>
    <View style={styles.actions}>
      <Pressable
        onPress={() => onDismiss(suggestion.id)}
        hitSlop={8}
        style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
      >
        <Text style={[typography.footnote, styles.btnLabel]}>Dismiss</Text>
      </Pressable>
      <Pressable
        onPress={() => onApprove(suggestion.id)}
        hitSlop={8}
        style={({ pressed }) => [
          styles.btn,
          styles.btnPrimary,
          pressed && styles.pressedPrimary,
        ]}
      >
        <Text
          style={[typography.footnote, styles.btnPrimaryLabel]}
          weight="600"
        >
          Approve
        </Text>
      </Pressable>
    </View>
  </View>
);

const styles = StyleSheet.create({
  card: {
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  source: {
    color: lightPalette.textTertiary,
    letterSpacing: 1.2,
  },
  title: {
    color: lightPalette.textPrimary,
  },
  reason: {
    color: lightPalette.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  btn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: lightPalette.borderStrong,
  },
  pressed: {
    backgroundColor: lightPalette.surfaceSunken,
  },
  btnLabel: {
    color: lightPalette.textSecondary,
  },
  btnPrimary: {
    backgroundColor: lightPalette.ink,
    borderColor: lightPalette.ink,
  },
  pressedPrimary: {
    opacity: 0.9,
  },
  btnPrimaryLabel: {
    color: lightPalette.textOnDark,
  },
});
