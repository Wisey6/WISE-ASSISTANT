import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { colors, radius, spacing } from '@/theme';
import type { Task } from '@/types';
import { Icon } from './Icon';
import { TaskRow } from './TaskRow';
import { Text } from './Text';

interface Props {
  task: Task;
  onToggle: (id: string) => void;
  onRemove?: (id: string) => void;
}

const SWIPE_THRESHOLD = 80;

/**
 * iOS-style swipeable row:
 *   • swipe left a little → reveals "Done" background
 *   • past threshold → commits the toggle with a haptic
 *   • swipe right → delete (optional)
 *
 * Pan gesture is handled natively by react-native-gesture-handler;
 * animation stays on the UI thread.
 */
export const SwipeableTaskRow: React.FC<Props> = ({ task, onToggle, onRemove }) => {
  const translate = useSharedValue(0);
  const committed = useSharedValue(false);

  const commit = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => undefined,
    );
    onToggle(task.id);
  }, [onToggle, task.id]);

  const remove = useCallback(() => {
    onRemove?.(task.id);
  }, [onRemove, task.id]);

  const pan = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onUpdate((e) => {
      translate.value = e.translationX;
    })
    .onEnd(() => {
      if (translate.value < -SWIPE_THRESHOLD) {
        committed.value = true;
        translate.value = withTiming(-120, { duration: 150 }, () => {
          runOnJS(commit)();
          translate.value = withSpring(0);
        });
      } else if (translate.value > SWIPE_THRESHOLD && onRemove) {
        translate.value = withTiming(400, { duration: 180 }, () => {
          runOnJS(remove)();
        });
      } else {
        translate.value = withSpring(0, { damping: 15, stiffness: 180 });
      }
    });

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translate.value }],
  }));

  const leftActionStyle = useAnimatedStyle(() => ({
    opacity: Math.max(0, Math.min(1, -translate.value / SWIPE_THRESHOLD)),
  }));

  const rightActionStyle = useAnimatedStyle(() => ({
    opacity: Math.max(0, Math.min(1, translate.value / SWIPE_THRESHOLD)),
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.action, styles.actionRight, leftActionStyle]}>
        <Icon
          name="check"
          size={20}
          color={colors.textInverse}
        />
        <Text variant="footnote" color={colors.textInverse}>
          {task.status === 'done' ? 'Undo' : 'Done'}
        </Text>
      </Animated.View>
      {onRemove && (
        <Animated.View style={[styles.action, styles.actionLeft, rightActionStyle]}>
          <Icon name="close" size={20} color={colors.textInverse} />
          <Text variant="footnote" color={colors.textInverse}>
            Delete
          </Text>
        </Animated.View>
      )}
      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.row, rowStyle]}>
          <TaskRow task={task} onToggle={onToggle} />
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  row: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
  },
  action: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 100,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  actionLeft: {
    left: 0,
    backgroundColor: colors.danger,
    borderTopLeftRadius: radius.lg,
    borderBottomLeftRadius: radius.lg,
  },
  actionRight: {
    right: 0,
    backgroundColor: colors.success,
    borderTopRightRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
  },
});
