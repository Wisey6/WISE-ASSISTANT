import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Speech from 'expo-speech';

import { ChatComposer, Icon, Text } from '@/components';
import { colors, radius, spacing, typography } from '@/theme';
import { useAssistantStore } from '@/store/useAssistantStore';
import { useUserStore } from '@/store/useUserStore';
import { runOttleyTurn } from '@/services/ottleyAgent';
import type { AssistantMessage } from '@/types';

interface Props {
  visible: boolean;
  onClose: () => void;
}

interface InlineTool {
  id: string;
  name: string;
  label: string;
}

const TOOL_LABELS: Record<string, string> = {
  web_search: 'Searching the web',
  list_clickup_tasks: 'Checking ClickUp',
  list_calendar_events: 'Checking calendar',
  search_gmail: 'Searching Gmail',
  read_gmail_thread: 'Reading Gmail thread',
  search_drive: 'Searching Drive',
  read_drive_file: 'Reading Drive file',
  list_outlook_mail: 'Checking Outlook',
  list_teams_messages: 'Checking Teams',
  get_news_brief: 'Pulling news brief',
  get_pending_suggestions: 'Reviewing pending suggestions',
  propose_create_clickup_task: 'Proposing task',
  propose_update_clickup_status: 'Proposing status change',
  propose_create_calendar_event: 'Proposing event',
  schedule_push_notification: 'Scheduling reminder',
};

export const OttleyModal: React.FC<Props> = ({ visible, onClose }) => {
  const insets = useSafeAreaInsets();
  const messages = useAssistantStore((s) => s.messages);
  const appendUser = useAssistantStore((s) => s.appendUser);
  const appendAssistant = useAssistantStore((s) => s.appendAssistant);
  const setThinking = useAssistantStore((s) => s.setThinking);
  const isThinking = useAssistantStore((s) => s.isThinking);
  const userName = useUserStore((s) => s.user.name);
  const [tools, setTools] = useState<InlineTool[]>([]);
  const [voiceOn, setVoiceOn] = useState(false);
  const listRef = useRef<FlatList<AssistantMessage>>(null);

  const speak = useCallback((text: string) => {
    if (!text.trim()) return;
    Speech.stop();
    Speech.speak(text, {
      language: 'en-GB',
      // iOS "Daniel" is the posh BBC voice; Android falls back to default en-GB.
      voice: Platform.OS === 'ios' ? 'com.apple.voice.compact.en-GB.Daniel' : undefined,
      pitch: 1.0,
      rate: 0.98,
    });
  }, []);

  useEffect(() => {
    if (!visible) {
      Speech.stop().catch(() => undefined);
    }
    return () => {
      Speech.stop().catch(() => undefined);
    };
  }, [visible]);

  const handleSubmit = useCallback(
    async (text: string) => {
      appendUser(text);
      setThinking(true);
      setTools([]);
      const history = useAssistantStore
        .getState()
        .messages.slice(-20)
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({ role: m.role, content: m.text }));
      try {
        const result = await runOttleyTurn(userName, history, text, {
          onToolStart: (name) => {
            setTools((prev) => [
              ...prev,
              {
                id: `${name}-${Date.now()}-${Math.random()}`,
                name,
                label: TOOL_LABELS[name] ?? name.replace(/_/g, ' '),
              },
            ]);
          },
        });
        appendAssistant(result.text);
        if (voiceOn) speak(result.text);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        appendAssistant(`Well, that broke: ${msg}`);
      } finally {
        setThinking(false);
        setTools([]);
      }
    },
    [appendUser, appendAssistant, setThinking, userName, voiceOn, speak],
  );

  useEffect(() => {
    if (visible) {
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: false }));
    }
  }, [visible, messages.length]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[typography.caption, styles.eyebrow]}>OTTLEY</Text>
            <Text style={[typography.title3, styles.title]}>
              Hey {userName}.
            </Text>
          </View>
          <Pressable
            onPress={() => {
              if (voiceOn) Speech.stop();
              setVoiceOn((v) => !v);
            }}
            hitSlop={10}
            style={[styles.voiceBtn, voiceOn && styles.voiceBtnOn]}
          >
            <Text
              variant="caption"
              color={voiceOn ? '#111111' : '#FFFFFF'}
              weight="600"
            >
              {voiceOn ? 'VOICE · ON' : 'VOICE'}
            </Text>
          </Pressable>
          <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
            <Icon name="close" size={22} color="#FFFFFF" />
          </Pressable>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
          keyboardVerticalOffset={0}
        >
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={({ item }) => <Bubble message={item} />}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />

          {(isThinking || tools.length > 0) && (
            <View style={styles.toolsRow}>
              {tools.length === 0 ? (
                <Text style={[typography.caption, styles.toolText]}>
                  Thinking…
                </Text>
              ) : (
                tools.map((t) => (
                  <View key={t.id} style={styles.toolChip}>
                    <View style={styles.toolDot} />
                    <Text style={[typography.caption, styles.toolText]}>
                      {t.label}
                    </Text>
                  </View>
                ))
              )}
            </View>
          )}

          <View
            style={[
              styles.composerWrap,
              { paddingBottom: insets.bottom + spacing.md },
            ]}
          >
            <ChatComposer
              onSubmit={handleSubmit}
              placeholder="Ask Ottley anything…"
            />
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const Bubble: React.FC<{ message: AssistantMessage }> = ({ message }) => {
  const mine = message.role === 'user';
  return (
    <View style={[styles.msgRow, mine ? styles.msgMine : styles.msgTheirs]}>
      <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
        <Text
          variant="callout"
          color={mine ? '#FFFFFF' : '#111111'}
        >
          {message.text}
        </Text>
      </View>
    </View>
  );
};

const USER_BUBBLE_BLUE = '#2F7BFF';

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  voiceBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  voiceBtnOn: {
    backgroundColor: '#FFFFFF',
  },
  eyebrow: {
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 1.2,
  },
  title: {
    color: '#FFFFFF',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexGrow: 1,
  },
  msgRow: { marginVertical: spacing.xs },
  msgMine: { alignItems: 'flex-end' },
  msgTheirs: { alignItems: 'flex-start' },
  bubble: {
    maxWidth: '86%',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.xl,
  },
  bubbleMine: {
    backgroundColor: USER_BUBBLE_BLUE,
    borderBottomRightRadius: 6,
  },
  bubbleTheirs: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 6,
  },
  toolsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  toolChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  toolDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: USER_BUBBLE_BLUE,
  },
  toolText: {
    color: 'rgba(255,255,255,0.75)',
  },
  composerWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    backgroundColor: '#000000',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
});
