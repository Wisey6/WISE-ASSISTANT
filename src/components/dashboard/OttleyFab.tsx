import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, shadows, spacing } from '@/theme';
import { Text } from '@/components/Text';

interface Props {
  onPress: () => void;
  /** Offset above the floating tab bar. */
  bottomInset?: number;
}

/**
 * 64px black circular FAB anchored bottom-right. Opens Ottley as a
 * full-screen modal. The "O" monogram keeps the visual tied to the
 * "O" avatar used on the Home chat hero.
 */
export const OttleyFab: React.FC<Props> = ({ onPress, bottomInset = 100 }) => (
  <View
    style={[styles.wrap, { bottom: bottomInset }]}
    pointerEvents="box-none"
  >
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
      hitSlop={8}
    >
      <Text style={styles.glyph}>O</Text>
    </Pressable>
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    right: spacing.lg,
    alignItems: 'flex-end',
  },
  btn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surfaceInverse,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.floating,
  },
  btnPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.92,
  },
  glyph: {
    color: colors.textInverse,
    fontSize: 26,
    fontWeight: '600',
  },
});
