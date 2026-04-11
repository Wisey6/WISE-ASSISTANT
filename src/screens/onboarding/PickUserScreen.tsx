import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { OwlCharacter, Screen, Text } from '@/components';
import { useUserStore } from '@/store/useUserStore';
import { colors, radius, spacing, userPalettes } from '@/theme';
import type { UserId } from '@/types';

/**
 * Onboarding is a single screen — pick Sarah or Tyler. That's it.
 * Each phone locks to one identity, and the AI/colors/permissions
 * flow from there. No passwords, no invites, no "create account".
 *
 * The user taps a card, the owl morphs to that variant as a
 * confirmation, then they hit "Continue" which drops them into
 * the main app permanently (or until they sign out in Profile).
 */
export const PickUserScreen: React.FC = () => {
  const pickUser = useUserStore((s) => s.pickUser);
  const [selected, setSelected] = useState<UserId | null>(null);

  const handleConfirm = () => {
    if (!selected) return;
    pickUser(selected);
  };

  // Owl variant follows the selection — if nothing yet, show Sarah
  // (arbitrary — feels softer as the empty state than a dark blue).
  const owlVariant: UserId = selected ?? 'sarah';

  return (
    <Screen>
      <View style={styles.root}>
        <View style={styles.hero}>
          <OwlCharacter size={180} variant={owlVariant} state="idle" />
          <Text variant="largeTitle" style={styles.title}>
            Who's this?
          </Text>
          <Text variant="subhead" style={styles.sub}>
            Pick yourself — Wise will remember and color everything to match.
          </Text>
        </View>

        <View style={styles.cards}>
          <UserCard
            id="sarah"
            selected={selected === 'sarah'}
            onPress={() => setSelected('sarah')}
          />
          <UserCard
            id="tyler"
            selected={selected === 'tyler'}
            onPress={() => setSelected('tyler')}
          />
        </View>

        <Pressable
          onPress={handleConfirm}
          disabled={!selected}
          style={({ pressed }) => [
            styles.cta,
            {
              backgroundColor: selected
                ? userPalettes[selected].accent
                : colors.surfaceMuted,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Text
            variant="headline"
            color={selected ? '#FFFFFF' : colors.textTertiary}
          >
            {selected ? `I'm ${userPalettes[selected].name}` : 'Pick one'}
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
};

interface UserCardProps {
  id: UserId;
  selected: boolean;
  onPress: () => void;
}

const UserCard: React.FC<UserCardProps> = ({ id, selected, onPress }) => {
  const palette = userPalettes[id];
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withSpring(0.96, { damping: 18, stiffness: 260 });
  };
  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 14, stiffness: 220 });
  };

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.cardWrap, animStyle]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.card,
          {
            backgroundColor: palette.accentSoft,
            borderColor: selected ? palette.accent : 'transparent',
          },
        ]}
      >
        <View
          style={[
            styles.cardDot,
            { backgroundColor: palette.accent },
          ]}
        />
        <Text variant="title2" color={palette.accentDeep}>
          {palette.name}
        </Text>
        <Text
          variant="footnote"
          color={palette.accentDeep}
          style={{ opacity: 0.7, marginTop: 2 }}
        >
          {id === 'sarah' ? 'pink theme' : 'blue theme'}
        </Text>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
  },
  hero: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  title: {
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  sub: {
    textAlign: 'center',
    marginTop: spacing.sm,
    maxWidth: 280,
  },
  cards: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  cardWrap: {
    flex: 1,
  },
  card: {
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 3,
    minHeight: 160,
    justifyContent: 'center',
  },
  cardDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginBottom: spacing.md,
  },
  cta: {
    marginHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderRadius: radius.pill,
    alignItems: 'center',
  },
});
