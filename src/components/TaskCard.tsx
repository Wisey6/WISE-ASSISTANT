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
  /** Partner / owner color — rendered as a small accent dot + left edge. */
  accentColor?: string;
  /** Partner name for the tag row */
  ownerLabel?: string;
  /** When true, the check is a read-only indicator (this phone can't
   * edit the other user's tasks). */
  readOnly?: boolean;
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
  ownerLabel,
  readOnly = false,
}) => {
  const done = task.status === 'done';
  const scale = useSharedValue(1);

  const wrapStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleToggle = () => {
    if (readOnly) return;
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
              disabled={readOnly}
              style={[
                styles.check,
                done && styles.checkDone,
                readOnly && styles.checkReadOnly,
              ]}
            >
              {done && <Icon name="check" size={14} color={colors.text} />}
              {readOnly && !done && (
                <Icon
                  name="chevronRight"
                  size={12}
                  color={colors.textInverseMuted}
                />
              )}
            </Pressable>
          </View>

          {(timeRange || ownerLabel) && (
            <View style={styles.metaRow}>
              {timeRange && (
                <Text
                  variant="footnote"
                  color={colors.textInverseMuted}
                >
                  {timeRange}
                </Text>
              )}
              {ownerLabel && (
                <View style={styles.ownerPill}>
                  {accentColor && (
                    <View
                      style={[styles.ownerDot, { backgroundColor: accentColor }]}
                    />
                  )}
                  <Text variant="footnote" color={colors.textInverseMuted}>
                    {ownerLabel}
                  </Text>
                </View>
              )}
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
  checkReadOnly: {
    borderStyle: 'dashed',
    borderColor: 'rgba(246, 244, 236, 0.3)',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  ownerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ownerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
