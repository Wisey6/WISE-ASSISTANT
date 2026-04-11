import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import { colors, radius, shadows, spacing } from '@/theme';
import { HomeScreen } from '@/screens/HomeScreen';
import { TasksScreen } from '@/screens/TasksScreen';
import { CalendarScreen } from '@/screens/CalendarScreen';
import { ProfileScreen } from '@/screens/ProfileScreen';
import { Icon, type IconName } from '@/components';

import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

/**
 * Minimal bottom nav — a short white pill with a Home icon and a
 * Profile avatar, plus a floating black "+" button to the right. The
 * Tasks and Calendar tabs are reached through the Home chat ("what
 * do I have today?") and the + button, not icons — keeps the bar
 * uncluttered like the reference.
 */
export const MainTabs: React.FC = () => {
  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        tabBar={(props) => <FloatingBar {...props} />}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Tasks" component={TasksScreen} />
        <Tab.Screen name="Calendar" component={CalendarScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>
    </View>
  );
};

/* -------------------------------------------------------------------------
 * Custom tab bar
 * -------------------------------------------------------------------------
 */

type Navigation = BottomTabNavigationProp<MainTabParamList>;

interface BarProps {
  state: { index: number; routeNames: string[] };
  navigation: Navigation;
}

const BAR_ROUTES: { key: keyof MainTabParamList; icon: IconName }[] = [
  { key: 'Home', icon: 'home' },
  { key: 'Profile', icon: 'person' },
];

const FloatingBar: React.FC<BarProps> = ({ state, navigation }) => {
  const insets = useSafeAreaInsets();
  const bottom = Math.max(spacing.md, insets.bottom);

  const currentKey = state.routeNames[state.index] as keyof MainTabParamList;

  const goTo = (key: keyof MainTabParamList) => {
    navigation.navigate(key as never);
  };

  // Pressing the + button cycles: Home → Tasks → Calendar → Home
  const cycleKey: keyof MainTabParamList =
    currentKey === 'Tasks'
      ? 'Calendar'
      : currentKey === 'Calendar'
      ? 'Home'
      : 'Tasks';

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
      <Pressable
        onPress={() => goTo(cycleKey)}
        style={styles.fab}
        hitSlop={10}
      >
        <Icon
          name={cycleKey === 'Calendar' ? 'calendar' : cycleKey === 'Tasks' ? 'check' : 'plus'}
          size={22}
          color={colors.textInverse}
        />
      </Pressable>
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
    gap: spacing.sm,
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
  fab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.surfaceInverse,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.floating,
  },
});
