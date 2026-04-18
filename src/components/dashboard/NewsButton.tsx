import React from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { lightPalette, radius, spacing, typography } from '@/theme';
import { Text } from '@/components/Text';

interface Props {
  onPress: () => void;
}

export const NewsButton: React.FC<Props> = ({ onPress }) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
    hitSlop={6}
  >
    <Text style={[typography.caption, styles.label]} weight="600">
      NEWS
    </Text>
  </Pressable>
);

const styles = StyleSheet.create({
  btn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: lightPalette.borderStrong,
    backgroundColor: lightPalette.surface,
    alignSelf: 'flex-start',
  },
  pressed: {
    backgroundColor: lightPalette.surfaceSunken,
  },
  label: {
    color: lightPalette.textPrimary,
    letterSpacing: 1.2,
  },
});
