import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Button, OwlCharacter, Screen, Text } from '@/components';
import { spacing } from '@/theme';
import type { OnboardingStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Welcome'>;

export const WelcomeScreen: React.FC<Props> = ({ navigation }) => (
  <Screen bottomInset={false}>
    <View style={styles.root}>
      <View style={styles.hero}>
        <OwlCharacter size={160} />
        <Text variant="largeTitle" style={styles.title}>
          Meet Wise.
        </Text>
        <Text variant="body" style={styles.body}>
          Talk naturally. Wise turns messy thoughts into a clean plan —
          shared with the people you care about.
        </Text>
      </View>
      <Button label="Get started" onPress={() => navigation.navigate('CreateAccount')} />
    </View>
  </Screen>
);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.xl,
  },
  hero: {
    alignItems: 'center',
  },
  title: {
    marginTop: spacing.xl,
    textAlign: 'center',
  },
  body: {
    textAlign: 'center',
    marginTop: spacing.md,
    maxWidth: 300,
  },
});
