import type { NavigatorScreenParams } from '@react-navigation/native';

/**
 * Onboarding is a single screen — the Sarah/Tyler picker. Kept as
 * a stack param list in case we ever want to add a second step.
 */
export type OnboardingStackParamList = {
  PickUser: undefined;
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
