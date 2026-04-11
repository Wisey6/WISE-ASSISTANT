import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { PickUserScreen } from '@/screens/onboarding/PickUserScreen';

import type { OnboardingStackParamList } from './types';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

/**
 * Onboarding is deliberately one screen: pick Sarah or Tyler. No
 * account creation, no partner invites — this app is a fixed pair
 * and each phone just has to say which half it is.
 */
export const OnboardingNavigator: React.FC = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
      animation: 'fade',
    }}
  >
    <Stack.Screen name="PickUser" component={PickUserScreen} />
  </Stack.Navigator>
);
