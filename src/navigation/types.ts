import type { NavigatorScreenParams } from '@react-navigation/native';

export type OnboardingStackParamList = {
  Welcome: undefined;
  CreateAccount: undefined;
  InvitePartner: undefined;
  Permissions: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Tasks: undefined;
  Calendar: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Onboarding: NavigatorScreenParams<OnboardingStackParamList>;
  Main: NavigatorScreenParams<MainTabParamList>;
};
