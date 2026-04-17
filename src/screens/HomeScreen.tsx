import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  ChatComposer,
  SuggestionChips,
  Text,
} from '@/components';
import { colors, radius, spacing } from '@/theme';
import { useAssistantStore } from '@/store/useAssistantStore';
import { useTaskStore } from '@/store/useTaskStore';
import { useUserStore } from '@/store/useUserStore';
import { handleUserTurn } from '@/services/ai';
import { useVoiceInput } from '@/services/voice';
import type { AssistantMessage } from '@/types';

/**
 * Home is Ottley — the chat assistant. No owl, no mascot: just a clean
 * header with his name and status, the conversation below, and a
 * composer pinned to the bottom. Ottley handles everything in the
 * app's assistant pipeline (tasks, schedules, briefings, jokes).
 */
export const HomeScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const messages = useAssistantStore((s) => s.messages);
  const pendingIntent = useAssistantStore((s) => s.pendingIntent);
  const isThinking = useAssistantStore((s) => s.isThinking);
  const appendUser = useAssistantStore((s) => s.appendUser);
  const appendAssistant = useAssistantStore((s) => s.appendAssistant);
  const setThinking = useAssistantStore((s) => s.setThinking);
  const setPendingIntent = useAssistantStore((s) => s.setPendingIntent);

  const addTasksFromDrafts = useTaskStore((s) => s.addTasksFromDrafts);
  const addRecurringSchedule = useTaskStore((s) => s.addRecurringSchedule);
  const user = useUserStore((s) => s.user);

  const voice = useVoiceInput();
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const listRef = useRef<FlatList<AssistantMessage>>(null);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardWillShow', () =>
      setKeyboardVisible(true),
    );
    const hide = Keyboard.addListener('keyboardWillHide', () =>
      setKeyboardVisible(false),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const hasConversation = messages.length > 1;

  const statusLabel = voice.isRecording
    ? 'Listening…'
    : isThinking
    ? 'Thinking…'
    : 'Ready when you are';

  const handleSubmit = useCallback(
    async (text: string) => {
      appendUser(text);
      setThinking(true);
      await new Promise((r) => setTimeout(r, 250));

      const latestHistory = useAssistantStore.getState().messages;
      const response = await handleUserTurn(text, latestHistory, pendingIntent);

      let createdIds: string[] = [];

      if (response.tasks && response.tasks.length > 0) {
        const created = addTasksFromDrafts(response.tasks);
        createdIds = created.map((t) => t.id);
      }

      if (response.recurrence) {
        const created = addRecurringSchedule(response.recurrence, {
          title: response.tasks?.[0]?.title ?? 'Work',
        });
        createdIds.push(...created.map((t) => t.id));
      }

      if (response.nextIntent !== undefined) {
        setPendingIntent(response.nextIntent);
      }

      appendAssistant(response.reply, {
        createdTaskIds: createdIds.length > 0 ? createdIds : undefined,
        suggestions: response.suggestions,
      });

      setThinking(false);

      requestAnimationFrame(() => {
        listRef.current?.scrollToEnd({ animated: true });
      });
    },
    [
      appendUser,
      appendAssistant,
      setThinking,
      setPendingIntent,
      addTasksFromDrafts,
      addRecurringSchedule,
      pendingIntent,
    ],
  );

  const handleVoice = useCallback(async () => {
    if (voice.isRecording) {
      const result = await voice.stop();
      if (result && result.durationMs > 500) {
        const seconds = Math.round(result.durationMs / 1000);
        appendUser(`🎙 voice note · ${seconds}s`);
        appendAssistant(
          "Got your voice note. I can't transcribe it on-device yet — type what you said and I'll turn it into tasks.",
          { suggestions: ['Add a task', 'Set my schedule', 'Never mind'] },
        );
      }
      return;
    }
    await voice.toggle();
  }, [voice, appendUser, appendAssistant]);

  const handleSuggestion = useCallback(
    (text: string) => {
      handleSubmit(text);
    },
    [handleSubmit],
  );

  const lastMsg = messages[messages.length - 1];
  const activeSuggestions =
    lastMsg?.role === 'assistant' && lastMsg.suggestions?.length
      ? lastMsg.suggestions
      : [];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.root}
      keyboardVerticalOffset={0}
    >
      <OttleyHeader
        hasConversation={hasConversation}
        statusLabel={statusLabel}
        name={user.name}
        insetTop={insets.top}
      />

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => <MessageBubble message={item} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
      />

      <View
        style={[
          styles.composerWrap,
          {
            paddingBottom: keyboardVisible
              ? spacing.md
              : insets.bottom + 90,
          },
        ]}
      >
        {activeSuggestions.length > 0 && (
          <SuggestionChips items={activeSuggestions} onPick={handleSuggestion} />
        )}
        <ChatComposer
          onSubmit={handleSubmit}
          onVoicePress={handleVoice}
          isRecording={voice.isRecording}
          placeholder="Ask Ottley anything…"
        />
      </View>
    </KeyboardAvoidingView>
  );
};

interface HeaderProps {
  hasConversation: boolean;
  statusLabel: string;
  name: string;
  insetTop: number;
}

const OttleyHeader: React.FC<HeaderProps> = ({
  hasConversation,
  statusLabel,
  name,
  insetTop,
}) => {
  if (hasConversation) {
    return (
      <View style={[styles.hero, styles.heroCompactWrap, { paddingTop: insetTop + spacing.sm }]}>
        <View style={styles.avatar}>
          <Text variant="title3" color={colors.textInverse}>
            O
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="caption">OTTLEY</Text>
          <Text variant="title3">{statusLabel}</Text>
        </View>
      </View>
    );
  }
  return (
    <View
      style={[styles.hero, styles.heroFullWrap, { paddingTop: insetTop + spacing.xl }]}
    >
      <View style={styles.avatarLarge}>
        <Text variant="largeTitle" color={colors.textInverse}>
          O
        </Text>
      </View>
      <Text variant="largeTitle" style={styles.heroTitle}>
        Hey {name}.
      </Text>
      <Text variant="subhead" style={styles.heroSub}>
        It's Ottley. What are we ignoring today?
      </Text>
    </View>
  );
};

const MessageBubble: React.FC<{ message: AssistantMessage }> = ({ message }) => {
  const mine = message.role === 'user';
  return (
    <View style={[styles.msgRow, mine ? styles.msgRowMine : styles.msgRowTheirs]}>
      <View
        style={[
          styles.bubble,
          mine ? styles.bubbleMine : styles.bubbleTheirs,
        ]}
      >
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
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  hero: {
    paddingHorizontal: spacing.lg,
  },
  heroFullWrap: {
    alignItems: 'center',
    paddingBottom: spacing.lg,
  },
  heroCompactWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingBottom: spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceInverse,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLarge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.surfaceInverse,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  heroTitle: {
    textAlign: 'center',
  },
  heroSub: {
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    flexGrow: 1,
  },
  msgRow: {
    marginVertical: spacing.xs,
  },
  msgRowMine: { alignItems: 'flex-end' },
  msgRowTheirs: { alignItems: 'flex-start' },
  bubble: {
    maxWidth: '86%',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.xl,
  },
  bubbleMine: {
    backgroundColor: colors.surfaceInverse,
    borderBottomRightRadius: 6,
  },
  bubbleTheirs: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  composerWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    backgroundColor: colors.background,
  },
});
