import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  createBottomTabNavigator,
  type BottomTabBarProps,
} from '@react-navigation/bottom-tabs';

import { colors, radius, shadows, spacing } from '@/theme';
import { DashboardScreen } from '@/screens/DashboardScreen';
import { TasksScreen } from '@/screens/TasksScreen';
import { Icon, type IconName } from '@/components';
import { OttleyEye } from '@/components/dashboard/OttleyEye';
import { OttleyModal } from '@/components/dashboard/OttleyModal';
import { useUIStore } from '@/store/useUIStore';

import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

/**
 * Three-button bottom control: Dashboard on the left, Ottley in the
 * middle, Tasks on the right. Ottley opens a modal — not a tab — so
 * tapping it doesn't swap the underlying screen.
 */
export const MainTabs: React.FC = () => {
  const ottleyOpen = useUIStore((s) => s.ottleyOpen);
  const setOttleyOpen = useUIStore((s) => s.setOttleyOpen);

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        tabBar={(props) => <FloatingBar {...props} />}
        screenOptions={{ headerShown: false }}
      >
        <Tab.Screen name="Dashboard" component={DashboardScreen} />
        <Tab.Screen name="Tasks" component={TasksScreen} />
      </Tab.Navigator>
      <OttleyModal visible={ottleyOpen} onClose={() => setOttleyOpen(false)} />
    </View>
  );
};

const SIDE_ROUTES: { key: keyof MainTabParamList; icon: IconName }[] = [
  { key: 'Dashboard', icon: 'dashboard' },
  { key: 'Tasks', icon: 'check' },
];

const PUCK = 48;

const FloatingBar: React.FC<BottomTabBarProps> = ({ state, navigation }) => {
  const insets = useSafeAreaInsets();
  const bottom = Math.max(spacing.md, insets.bottom);
  const currentKey = state.routeNames[state.index] as keyof MainTabParamList;
  const setOttleyOpen = useUIStore((s) => s.setOttleyOpen);

  const goTo = (key: keyof MainTabParamList) => {
    navigation.navigate(key as never);
  };

  return (
    <View style={[styles.container, { bottom }]} pointerEvents="box-none">
      <View style={styles.pill}>
        <SideButton
          icon={SIDE_ROUTES[0].icon}
          active={currentKey === SIDE_ROUTES[0].key}
          onPress={() => goTo(SIDE_ROUTES[0].key)}
        />
        <OttleyButton onPress={() => setOttleyOpen(true)} />
        <SideButton
          icon={SIDE_ROUTES[1].icon}
          active={currentKey === SIDE_ROUTES[1].key}
          onPress={() => goTo(SIDE_ROUTES[1].key)}
        />
      </View>
    </View>
  );
};

const SideButton: React.FC<{
  icon: IconName;
  active: boolean;
  onPress: () => void;
}> = ({ icon, active, onPress }) => (
  <Pressable
    onPress={onPress}
    style={styles.sideBtn}
    hitSlop={10}
  >
    {active && <View style={styles.sideBtnActiveBg} />}
    <Icon
      name={icon}
      size={22}
      color={active ? colors.text : colors.textTertiary}
      strokeWidth={active ? 1.9 : 1.5}
    />
  </Pressable>
);

const OttleyButton: React.FC<{ onPress: () => void }> = ({ onPress }) => {
  const ring = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.timing(ring, {
        toValue: 1,
        duration: 1800,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    );
    pulse.start();
    return () => pulse.stop();
  }, [ring]);
  const ringScale = ring.interpolate({ inputRange: [0, 1], outputRange: [1, 1.65] });
  const ringOpacity = ring.interpolate({
    inputRange: [0, 0.15, 1],
    outputRange: [0, 0.35, 0],
  });

  return (
    <View style={styles.ottleyWrap}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.ottleyRing,
          { transform: [{ scale: ringScale }], opacity: ringOpacity },
        ]}
      />
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.ottleyBtn, pressed && styles.ottleyPressed]}
        hitSlop={8}
      >
        <OttleyEye size={30} />
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
    paddingHorizontal: spacing.lg,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: spacing.md,
    ...shadows.card,
  },
  sideBtn: {
    width: PUCK,
    height: PUCK,
    borderRadius: PUCK / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  sideBtnActiveBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.surfaceMuted,
    borderRadius: PUCK / 2,
  },
  ottleyWrap: {
    width: PUCK,
    height: PUCK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ottleyRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: PUCK / 2,
    backgroundColor: colors.surfaceInverse,
  },
  ottleyBtn: {
    width: PUCK,
    height: PUCK,
    borderRadius: PUCK / 2,
    backgroundColor: colors.surfaceInverse,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.floating,
  },
  ottleyPressed: {
    opacity: 0.88,
  },
});
