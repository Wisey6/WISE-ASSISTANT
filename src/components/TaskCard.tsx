import React from 'react';
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
import { Icon } from './Icon';
import { Text } from './Text';

interface Props {
  task: Task;
  onToggle: (id: string) => void;
  onPress?: (task: Task) => void;
  /** Optional accent color — rendered as a small dot + left edge. */
  accentColor?: string;
}

/**
 * Bold task card. Matches the black-card style in the reference:
 *
 *   ┌──────────────────────────────┐
 *   │ Cleaning               [ ✓ ] │  ← title (large, cream)
 *   │ room                         │
 *   │ 13:00 – 17:00 · Team         │  ← meta row (muted cream)
 *   └──────────────────────────────┘
 *
 * A slim colored strip runs down the left to indicate whose task it is.
 */
export const TaskCard: React.FC<Props> = ({
  task,
  onToggle,
  onPress,
  accentColor,
}) => {
  const done = task.status === 'done';
  const scale = useSharedValue(1);

  const wrapStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleToggle = () => {
    Haptics.selectionAsync().catch(() => undefined);
    scale.value = withSequence(
      withTiming(0.97, { duration: 90 }),
      withSpring(1, { damping: 12, stiffness: 220 }),
    );
    onToggle(task.id);
  };

  const timeRange = formatTimeRange(task);

  return (
    <Animated.View style={wrapStyle}>
      <Pressable
        onPress={() => onPress?.(task)}
        style={({ pressed }) => [
          styles.card,
          done && styles.cardDone,
          pressed && { opacity: 0.95 },
        ]}
      >
        {/* Left color strip */}
        {accentColor && (
          <View
            style={[styles.accentStrip, { backgroundColor: accentColor }]}
          />
        )}

        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text
              variant="title2"
              color={colors.textInverse}
              numberOfLines={3}
              style={[styles.title, done && styles.titleDone]}
            >
              {task.title}
            </Text>
            <Pressable
              onPress={handleToggle}
              hitSlop={14}
              style={[styles.check, done && styles.checkDone]}
            >
              {done && <Icon name="check" size={14} color={colors.text} />}
            </Pressable>
          </View>

          {timeRange && (
            <View style={styles.metaRow}>
              <Text variant="footnote" color={colors.textInverseMuted}>
                {timeRange}
              </Text>
            </View>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
};

function formatTimeRange(task: Task): string | null {
  if (task.startAt && task.endAt) {
    return `${clock(task.startAt)} – ${clock(task.endAt)}`;
  }
  if (task.dueAt) {
    return `due ${clock(task.dueAt)}`;
  }
  return null;
}

function clock(iso: string): string {
  const d = new Date(iso);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

const CHECK_SIZE = 26;

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceInverse,
    borderRadius: radius.xxl,
    overflow: 'hidden',
    flexDirection: 'row',
    minHeight: 128,
  },
  cardDone: {
    opacity: 0.55,
  },
  accentStrip: {
    width: 4,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  title: {
    flex: 1,
    lineHeight: 26,
  },
  titleDone: {
    textDecorationLine: 'line-through',
  },
  check: {
    width: CHECK_SIZE,
    height: CHECK_SIZE,
    borderRadius: 6,
    borderWidth: 1.4,
    borderColor: 'rgba(246, 244, 236, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkDone: {
    backgroundColor: colors.textInverse,
    borderColor: colors.textInverse,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
});
