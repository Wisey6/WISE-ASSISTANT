import React from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/theme';
import type { AssistantMessage } from '@/types';
import { Text } from './Text';

interface Props {
  message: AssistantMessage;
}

/**
 * Chat bubble for the assistant screen. User on the right (soft black),
 * assistant on the left (muted surface). Deliberately plain — no avatars,
 * no timestamps — to keep the focus on the conversation.
 */
export const MessageBubble: React.FC<Props> = ({ message }) => {
  const mine = message.role === 'user';
  return (
    <View style={[styles.row, mine ? styles.rowMine : styles.rowTheirs]}>
      <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
        <Text
          variant="callout"
          color={mine ? colors.textInverse : colors.text}
        >
          {message.text}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    marginVertical: spacing.xs,
  },
  rowMine: {
    alignItems: 'flex-end',
  },
  rowTheirs: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '82%',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.xl,
  },
  bubbleMine: {
    backgroundColor: colors.text,
    borderBottomRightRadius: 6,
  },
  bubbleTheirs: {
    backgroundColor: colors.surfaceMuted,
    borderBottomLeftRadius: 6,
  },
});
