import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  createBottomTabNavigator,
  type BottomTabBarProps,
} from '@react-navigation/bottom-tabs';

import { colors, radius, shadows, spacing } from '@/theme';
import { DashboardScreen } from '@/screens/DashboardScreen';
import { HomeScreen } from '@/screens/HomeScreen';
import { TasksScreen } from '@/screens/TasksScreen';
import { ProfileScreen } from '@/screens/ProfileScreen';
import { Icon, type IconName } from '@/components';

import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

/**
 * Minimal bottom nav — a short white pill with four icons. No FAB,
 * no Calendar tab. The Dashboard hosts the calendar widget; Ottley
 * lives as a floating black FAB on the Dashboard surface.
 */
export const MainTabs: React.FC = () => (
  <View style={{ flex: 1 }}>
    <Tab.Navigator
      tabBar={(props) => <FloatingBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Tasks" component={TasksScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  </View>
);

const BAR_ROUTES: { key: keyof MainTabParamList; icon: IconName }[] = [
  { key: 'Dashboard', icon: 'dashboard' },
  { key: 'Home', icon: 'home' },
  { key: 'Tasks', icon: 'check' },
  { key: 'Profile', icon: 'person' },
];

const FloatingBar: React.FC<BottomTabBarProps> = ({ state, navigation }) => {
  const insets = useSafeAreaInsets();
  const bottom = Math.max(spacing.md, insets.bottom);
  const currentKey = state.routeNames[state.index] as keyof MainTabParamList;

  const goTo = (key: keyof MainTabParamList) => {
    navigation.navigate(key as never);
  };

  return (
    <View style={[styles.container, { bottom }]} pointerEvents="box-none">
      <View style={styles.pill}>
        {BAR_ROUTES.map(({ key, icon }) => {
          const active = key === currentKey;
          return (
            <Pressable
              key={key}
              onPress={() => goTo(key)}
              style={styles.pillBtn}
              hitSlop={10}
            >
              {active && <View style={styles.pillBg} />}
              <Icon
                name={icon}
                size={20}
                color={active ? colors.text : colors.textTertiary}
                strokeWidth={active ? 1.9 : 1.5}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: 6,
    paddingVertical: 6,
    gap: 2,
    ...shadows.card,
  },
  pillBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  pillBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 22,
  },
});
