import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { colors } from '@/theme';
import { useUserStore } from '@/store/useUserStore';

import { MainTabs } from './MainTabs';
import { OnboardingNavigator } from './OnboardingNavigator';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    card: colors.background,
    text: colors.text,
    border: colors.border,
    primary: colors.text,
  },
};

/**
 * Top-level navigator. We flip between the onboarding flow and the
 * main tab bar based on whether the user has finished onboarding.
 * Using a single root stack (rather than remounting) keeps the
 * transition smooth.
 */
export const RootNavigator: React.FC = () => {
  const hasOnboarded = useUserStore((s) => s.hasOnboarded);

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {hasOnboarded ? (
          <Stack.Screen name="Main" component={MainTabs} />
        ) : (
          <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
