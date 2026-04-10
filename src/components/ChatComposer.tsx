import React, { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
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
}

/**
 * Assistant input bar. Uses a single pill with an auto-growing text
 * field on the left and a dynamic trailing button: microphone when
 * the field is empty, send arrow once the user starts typing.
 */
export const ChatComposer: React.FC<Props> = ({
  onSubmit,
  onVoicePress,
  isRecording = false,
  placeholder = 'Tell Wise what you’ve got on…',
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
    transform: [{ scale: 1 + pulse.value * 0.15 }],
  }));

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setValue('');
  };

  return (
    <View style={styles.wrap}>
      <TextInput
        value={value}
        onChangeText={setValue}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        multiline
        returnKeyType="send"
        onSubmitEditing={handleSend}
        blurOnSubmit
        style={[typography.body, styles.input]}
      />
      {canSend ? (
        <Pressable onPress={handleSend} style={[styles.button, styles.buttonActive]}>
          <Icon name="send" size={20} color={colors.textInverse} />
        </Pressable>
      ) : (
        <Pressable
          onPress={onVoicePress}
          style={[styles.button, isRecording && styles.buttonRecording]}
        >
          {isRecording && <Animated.View style={[styles.pulse, pulseStyle]} />}
          <Icon
            name="mic"
            size={20}
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
    shadowColor: '#111113',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    paddingVertical: spacing.sm,
    color: colors.text,
  },
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  buttonActive: {
    backgroundColor: colors.text,
  },
  buttonRecording: {
    backgroundColor: colors.accent,
  },
  pulse: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
  },
});
