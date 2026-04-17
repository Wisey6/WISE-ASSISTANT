import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { lightPalette, spacing, typography } from '@/theme';
import { ChatComposer } from '@/components/ChatComposer';
import { Text } from '@/components/Text';
import { useAssistantStore } from '@/store/useAssistantStore';
import type { AssistantMessage } from '@/types';

import { DashboardCard } from './DashboardCard';

interface Props {
  onSubmit: (text: string) => void;
  compact?: boolean;
}

export const ChatDock: React.FC<Props> = ({ onSubmit, compact = false }) => {
  const messages = useAssistantStore((s) => s.messages);
  const tail = messages.slice(-3);
  return (
    <DashboardCard padded>
      <Text style={[typography.caption, styles.eyebrow]}>ASK CLAUDE</Text>
      {!compact && (
        <ScrollView
          style={styles.log}
          contentContainerStyle={styles.logContent}
          showsVerticalScrollIndicator={false}
        >
          {tail.map((m) => (
            <ChatLine key={m.id} message={m} />
          ))}
        </ScrollView>
      )}
      <ChatComposer
        onSubmit={onSubmit}
        placeholder="Schedule something, move a task, ask what's next…"
      />
    </DashboardCard>
  );
};

const ChatLine: React.FC<{ message: AssistantMessage }> = ({ message }) => {
  const mine = message.role === 'user';
  return (
    <View style={styles.line}>
      <Text
        style={[
          typography.caption,
          styles.role,
          mine && { color: lightPalette.textPrimary },
        ]}
      >
        {mine ? 'YOU' : 'CLAUDE'}
      </Text>
      <Text style={[typography.body, styles.text]}>{message.text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  eyebrow: {
    color: lightPalette.textTertiary,
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
  },
  log: {
    maxHeight: 160,
    marginBottom: spacing.sm,
  },
  logContent: {
    gap: spacing.sm,
  },
  line: {
    gap: 2,
  },
  role: {
    color: lightPalette.textTertiary,
    letterSpacing: 1.2,
  },
  text: {
    color: lightPalette.textPrimary,
  },
});
