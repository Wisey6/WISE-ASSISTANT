import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { colors, radius, spacing, typography } from '@/theme';
import { Icon } from './Icon';

interface Props {
  onSubmit: (text: string) => void;
  onVoicePress?: () => void;
  isRecording?: boolean;
  placeholder?: string;
  style?: ViewStyle;
}

/**
 * Assistant input bar. A single pill with:
 *
 *   - Multi-line text input that grows up to 3 lines.
 *   - A trailing button that swaps based on state:
 *       • empty → microphone
 *       • empty + recording → pulsing microphone
 *       • has text → send arrow (solid black)
 *
 * Text input fix: multi-line TextInput in React Native fires
 * `onSubmitEditing` only when `blurOnSubmit` is true AND there's no
 * newline. We explicitly handle the return key by checking for a
 * trailing newline and stripping it, then submitting — that's the
 * behavior most chat apps use.
 */
export const ChatComposer: React.FC<Props> = ({
  onSubmit,
  onVoicePress,
  isRecording = false,
  placeholder = "Tell me what's on your mind…",
  style,
}) => {
  const [value, setValue] = useState('');
  const canSend = value.trim().length > 0;

  const pulse = useSharedValue(0);
  React.useEffect(() => {
    pulse.value = isRecording
      ? withRepeat(withTiming(1, { duration: 900 }), -1, true)
      : withTiming(0, { duration: 200 });
  }, [isRecording, pulse]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + pulse.value * 0.35,
    transform: [{ scale: 1 + pulse.value * 0.2 }],
  }));

  const submitIfReady = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setValue('');
  };

  // Detect hardware keyboard return without inserting a newline.
  const onChangeText = (next: string) => {
    if (next.endsWith('\n')) {
      const trimmed = next.slice(0, -1).trim();
      if (trimmed.length > 0) {
        onSubmit(trimmed);
        setValue('');
        return;
      }
    }
    setValue(next);
  };

  return (
    <View style={[styles.wrap, style]}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        multiline
        blurOnSubmit={false}
        onSubmitEditing={submitIfReady}
        style={[typography.body, styles.input]}
      />
      {canSend ? (
        <Pressable onPress={submitIfReady} style={[styles.button, styles.buttonActive]}>
          <Icon name="send" size={18} color={colors.textInverse} />
        </Pressable>
      ) : (
        <Pressable
          onPress={onVoicePress}
          style={[styles.button, isRecording && styles.buttonRecording]}
        >
          {isRecording && <Animated.View style={[styles.pulse, pulseStyle]} />}
          <Icon
            name="mic"
            size={18}
            color={isRecording ? colors.textInverse : colors.text}
          />
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    paddingLeft: spacing.lg,
    paddingRight: spacing.xs,
    paddingVertical: spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    shadowColor: '#0C0C0E',
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 96,
    paddingVertical: spacing.sm,
    color: colors.text,
  },
  button: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  buttonActive: {
    backgroundColor: colors.surfaceInverse,
  },
  buttonRecording: {
    backgroundColor: colors.accent,
  },
  pulse: {
    position: 'absolute',
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.accent,
  },
});
