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
  MessageBubble,
  OwlCharacter,
  Text,
} from '@/components';
import { colors, spacing } from '@/theme';
import { useAssistantStore } from '@/store/useAssistantStore';
import { useTaskStore } from '@/store/useTaskStore';
import { useUserStore } from '@/store/useUserStore';
import { parseUserInputToTasks } from '@/services/ai';
import type { AssistantMessage } from '@/types';

/**
 * The Owl assistant screen. When there's no conversation yet we show
 * the owl big and centered with a welcoming prompt. Once the user
 * starts talking, the owl shrinks to a header and the chat takes
 * over — similar to how Siri / ChatGPT mobile handle the transition.
 *
 * Layout note: everything is inside a KeyboardAvoidingView and laid
 * out with flex so the composer rides up with the keyboard naturally.
 */
export const AssistantScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const messages = useAssistantStore((s) => s.messages);
  const appendUser = useAssistantStore((s) => s.appendUser);
  const appendAssistant = useAssistantStore((s) => s.appendAssistant);
  const isThinking = useAssistantStore((s) => s.isThinking);
  const setThinking = useAssistantStore((s) => s.setThinking);
  const addTasksFromDrafts = useTaskStore((s) => s.addTasksFromDrafts);
  const userId = useUserStore((s) => s.user?.id ?? 'local-user');

  const [isRecording, setIsRecording] = useState(false);
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
  const owlState: 'idle' | 'thinking' | 'listening' = isThinking
    ? 'thinking'
    : isRecording
    ? 'listening'
    : 'idle';

  const handleSubmit = useCallback(
    async (text: string) => {
      appendUser(text);
      setThinking(true);
      // Keep the UI responsive — yield, then parse.
      await new Promise((r) => setTimeout(r, 380));
      const result = await parseUserInputToTasks(text);
      const created = addTasksFromDrafts(result.tasks, userId);
      appendAssistant(
        result.summary,
        created.map((t) => t.id),
      );
      setThinking(false);
      requestAnimationFrame(() => {
        listRef.current?.scrollToEnd({ animated: true });
      });
    },
    [addTasksFromDrafts, appendAssistant, appendUser, setThinking, userId],
  );

  const handleVoice = useCallback(() => {
    // Placeholder for real expo-av recording.
    // Kept intentionally simple — we just toggle the owl's listening
    // state so the animation demos correctly. Real recording goes
    // here when we wire up a speech-to-text service.
    setIsRecording((r) => !r);
  }, []);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.root}
      keyboardVerticalOffset={0}
    >
      <View style={[styles.hero, { paddingTop: insets.top + spacing.sm }]}>
        <OwlCharacter size={hasConversation ? 96 : 180} state={owlState} />
        {!hasConversation && (
          <View style={styles.heroText}>
            <Text variant="title2" style={{ textAlign: 'center' }}>
              What's on your plate?
            </Text>
            <Text
              variant="subhead"
              style={{ textAlign: 'center', marginTop: spacing.xs }}
            >
              Talk naturally — I'll turn it into tasks.
            </Text>
          </View>
        )}
      </View>

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
            // When the keyboard is up the tab bar is covered, so we only
            // need a minimal gap above the keyboard. Otherwise we sit
            // above the floating tab bar (64 + bottom safe area).
            paddingBottom: keyboardVisible
              ? spacing.md
              : insets.bottom + 80,
          },
        ]}
      >
        <ChatComposer
          onSubmit={handleSubmit}
          onVoicePress={handleVoice}
          isRecording={isRecording}
        />
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  hero: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  heroText: {
    marginTop: spacing.lg,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    flexGrow: 1,
  },
  composerWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    backgroundColor: colors.background,
  },
});
