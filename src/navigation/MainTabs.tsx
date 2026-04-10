import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';

import { colors, radius, spacing } from '@/theme';
import { DashboardScreen } from '@/screens/DashboardScreen';
import { TasksScreen } from '@/screens/TasksScreen';
import { AssistantScreen } from '@/screens/AssistantScreen';
import { CalendarScreen } from '@/screens/CalendarScreen';
import { TabIcon, type IconName } from '@/components/TabIcon';

import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

/**
 * Bottom tab bar. Blurred translucent background on iOS mimics
 * the native look of apps like Apple Reminders / Notes. Android
 * falls back to a solid surface.
 */
export const MainTabs: React.FC = () => {
  const insets = useSafeAreaInsets();
  const bottomOffset = Math.max(spacing.md, insets.bottom);

  return (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarShowLabel: true,
      tabBarActiveTintColor: colors.text,
      tabBarInactiveTintColor: colors.textTertiary,
      tabBarLabelStyle: {
        fontSize: 11,
        fontWeight: '500',
        letterSpacing: 0.1,
      },
      tabBarStyle: [styles.tabBar, { bottom: bottomOffset }],
      tabBarBackground: () =>
        Platform.OS === 'ios' ? (
          <BlurView tint="light" intensity={80} style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.tabBarSolid]} />
        ),
      tabBarIcon: ({ color, focused }) => (
        <TabIcon name={iconFor(route.name)} color={color} focused={focused} />
      ),
    })}
  >
    <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Home' }} />
    <Tab.Screen name="Tasks" component={TasksScreen} options={{ title: 'Tasks' }} />
    <Tab.Screen name="Assistant" component={AssistantScreen} options={{ title: 'Assistant' }} />
    <Tab.Screen name="Calendar" component={CalendarScreen} options={{ title: 'Calendar' }} />
  </Tab.Navigator>
  );
};

const iconFor = (name: keyof MainTabParamList): IconName => {
  switch (name) {
    case 'Dashboard':
      return 'home';
    case 'Tasks':
      return 'check';
    case 'Assistant':
      return 'owl';
    case 'Calendar':
      return 'calendar';
  }
};

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    height: 64,
    borderRadius: radius.xxl,
    borderTopWidth: 0,
    backgroundColor: 'transparent',
    overflow: 'hidden',
    paddingBottom: 8,
    paddingTop: 8,
    elevation: 6,
    shadowColor: '#111113',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
  },
  tabBarSolid: {
    backgroundColor: colors.surface,
  },
});
