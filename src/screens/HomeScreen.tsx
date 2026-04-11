import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import {
  ChatComposer,
  Icon,
  OwlCharacter,
  SuggestionChips,
  Text,
} from '@/components';
import { colors, radius, spacing } from '@/theme';
import { useAssistantStore } from '@/store/useAssistantStore';
import { useTaskStore } from '@/store/useTaskStore';
import { usePartnersStore } from '@/store/usePartnersStore';
import { useUserStore } from '@/store/useUserStore';
import { handleUserTurn } from '@/services/ai';
import { useVoiceInput } from '@/services/voice';
import type { AssistantMessage } from '@/types';

/**
 * Home is the primary surface — owl + chat.
 *
 * - Empty state: big owl centered, welcoming prompt, suggestion chips
 *   so the user has a clear "what can I say?" to start with.
 * - Active conversation: owl shrinks into the header, chat thread
 *   scrolls normally, composer pinned to the keyboard.
 *
 * Everything flows through handleUserTurn so slot-fill, recurrence,
 * and direct task creation all go through the same pipeline.
 */
export const HomeScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const messages = useAssistantStore((s) => s.messages);
  const pendingIntent = useAssistantStore((s) => s.pendingIntent);
  const isThinking = useAssistantStore((s) => s.isThinking);
  const owlMood = useAssistantStore((s) => s.owlMood);
  const appendUser = useAssistantStore((s) => s.appendUser);
  const appendAssistant = useAssistantStore((s) => s.appendAssistant);
  const setThinking = useAssistantStore((s) => s.setThinking);
  const setPendingIntent = useAssistantStore((s) => s.setPendingIntent);
  const setOwlMood = useAssistantStore((s) => s.setOwlMood);

  const addTasksFromDrafts = useTaskStore((s) => s.addTasksFromDrafts);
  const addRecurringSchedule = useTaskStore((s) => s.addRecurringSchedule);
  const meColor = usePartnersStore((s) => s.meColor);
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

  // Effective owl state: voice recording > thinking > store mood
  const owlState = voice.isRecording
    ? 'listening'
    : isThinking
    ? 'thinking'
    : owlMood;

  const handleSubmit = useCallback(
    async (text: string) => {
      appendUser(text);
      setThinking(true);
      setOwlMood('thinking');
      // Yield to the UI so the user bubble appears before "thinking".
      await new Promise((r) => setTimeout(r, 320));

      const response = await handleUserTurn(text, pendingIntent);

      let createdIds: string[] = [];

      if (response.tasks && response.tasks.length > 0) {
        const created = addTasksFromDrafts(response.tasks, 'me');
        createdIds = created.map((t) => t.id);
      }

      if (response.recurrence) {
        const created = addRecurringSchedule(response.recurrence, {
          title: 'Work',
          ownerId: 'me',
          color: meColor,
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

      setOwlMood(response.mood ?? 'idle');
      setThinking(false);

      requestAnimationFrame(() => {
        listRef.current?.scrollToEnd({ animated: true });
      });
    },
    [
      appendUser,
      appendAssistant,
      setThinking,
      setOwlMood,
      setPendingIntent,
      addTasksFromDrafts,
      addRecurringSchedule,
      pendingIntent,
      meColor,
    ],
  );

  const handleVoice = useCallback(async () => {
    // If we're currently recording, stop and submit a placeholder.
    // Real speech-to-text requires a backend (e.g. Whisper). For now
    // we just acknowledge the recording so the mic at least works.
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

  // The latest assistant message (if it has suggestion chips) —
  // we render those above the composer for quick taps.
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
      <HeaderHero
        hasConversation={hasConversation}
        owlState={owlState}
        name={user?.name ?? 'there'}
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
        />
      </View>
    </KeyboardAvoidingView>
  );
};

/* -------------------------------------------------------------------------
 * Header hero
 * -------------------------------------------------------------------------
 */

interface HeaderProps {
  hasConversation: boolean;
  owlState: 'idle' | 'listening' | 'thinking' | 'talking' | 'happy' | 'sleep';
  name: string;
  insetTop: number;
}

const HeaderHero: React.FC<HeaderProps> = ({
  hasConversation,
  owlState,
  name,
  insetTop,
}) => {
  const compact = useSharedValue(hasConversation ? 1 : 0);

  useEffect(() => {
    compact.value = withTiming(hasConversation ? 1 : 0, { duration: 350 });
  }, [hasConversation, compact]);

  const wrapStyle = useAnimatedStyle(() => ({
    paddingVertical: spacing.md + (1 - compact.value) * 32,
  }));

  if (hasConversation) {
    return (
      <Animated.View
        style={[styles.hero, wrapStyle, { paddingTop: insetTop + spacing.sm }]}
      >
        <View style={styles.heroCompact}>
          <OwlCharacter size={64} state={owlState} />
          <View style={{ marginLeft: spacing.md, flex: 1 }}>
            <Text variant="caption">YOUR ASSISTANT</Text>
            <Text variant="title3">{stateLabel(owlState)}</Text>
          </View>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[styles.hero, wrapStyle, { paddingTop: insetTop + spacing.sm }]}
    >
      <View style={styles.heroFull}>
        <OwlCharacter size={200} state={owlState} />
        <Text variant="title1" style={styles.heroTitle}>
          Hey {name}.
        </Text>
        <Text variant="subhead" style={styles.heroSub}>
          Tell me what's on your plate — I'll sort the rest.
        </Text>
      </View>
    </Animated.View>
  );
};

function stateLabel(state: string): string {
  switch (state) {
    case 'listening':
      return 'Listening…';
    case 'thinking':
      return 'Thinking…';
    case 'happy':
      return 'Got it';
    case 'sleep':
      return 'Resting';
    default:
      return 'Ready';
  }
}

/* -------------------------------------------------------------------------
 * Inline message bubble (flatter version than /components/MessageBubble)
 * -------------------------------------------------------------------------
 */

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
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  heroFull: {
    alignItems: 'center',
    paddingTop: spacing.md,
  },
  heroTitle: {
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  heroSub: {
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  heroCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
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
