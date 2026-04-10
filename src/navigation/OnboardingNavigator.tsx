import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { WelcomeScreen } from '@/screens/onboarding/WelcomeScreen';
import { CreateAccountScreen } from '@/screens/onboarding/CreateAccountScreen';
import { InvitePartnerScreen } from '@/screens/onboarding/InvitePartnerScreen';
import { PermissionsScreen } from '@/screens/onboarding/PermissionsScreen';

import type { OnboardingStackParamList } from './types';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export const OnboardingNavigator: React.FC = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
      animation: 'slide_from_right',
      contentStyle: { backgroundColor: '#F8F8F8' },
    }}
  >
    <Stack.Screen name="Welcome" component={WelcomeScreen} />
    <Stack.Screen name="CreateAccount" component={CreateAccountScreen} />
    <Stack.Screen name="InvitePartner" component={InvitePartnerScreen} />
    <Stack.Screen name="Permissions" component={PermissionsScreen} />
  </Stack.Navigator>
);
