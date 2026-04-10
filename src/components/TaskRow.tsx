import React, { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { colors, radius, spacing } from '@/theme';
import type { Task } from '@/types';
import { formatDueLabel } from '@/utils/date';
import { Icon } from './Icon';
import { Text } from './Text';

interface Props {
  task: Task;
  onToggle: (id: string) => void;
  onPress?: (task: Task) => void;
}

/**
 * A single task row. Tapping the check circle toggles completion with
 * a small bounce and a haptic tick. Tapping the row itself is reserved
 * for opening task details.
 */
export const TaskRow: React.FC<Props> = ({ task, onToggle, onPress }) => {
  const scale = useSharedValue(1);
  const done = task.status === 'done';

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleToggle = useCallback(() => {
    Haptics.selectionAsync().catch(() => undefined);
    scale.value = withSequence(
      withTiming(0.97, { duration: 80 }),
      withSpring(1, { damping: 12, stiffness: 220 }),
    );
    onToggle(task.id);
  }, [onToggle, scale, task.id]);

  return (
    <Animated.View style={[styles.row, rowStyle]}>
      <Pressable
        onPress={handleToggle}
        hitSlop={14}
        style={[styles.check, done && styles.checkDone]}
      >
        {done && <Icon name="check" size={18} color={colors.textInverse} />}
      </Pressable>
      <Pressable
        style={styles.body}
        onPress={() => onPress?.(task)}
      >
        <Text
          variant="callout"
          weight="500"
          style={[done && styles.titleDone]}
          numberOfLines={1}
        >
          {task.title}
        </Text>
        <View style={styles.meta}>
          <Text variant="footnote">{formatDueLabel(task.dueAt)}</Text>
          {task.priority === 'high' && !done && (
            <View style={styles.priorityDot}>
              <Icon name="flame" size={12} color={colors.accent} />
              <Text variant="footnote" color={colors.accent}>
                High
              </Text>
            </View>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
};

const CHECK_SIZE = 26;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  check: {
    width: CHECK_SIZE,
    height: CHECK_SIZE,
    borderRadius: CHECK_SIZE / 2,
    borderWidth: 1.6,
    borderColor: colors.textTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkDone: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  titleDone: {
    textDecorationLine: 'line-through',
    color: colors.textTertiary,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  priorityDot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
  },
});
