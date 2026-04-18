import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, lightPalette, spacing } from '@/theme';
import { Icon } from '@/components';
import {
  CalendarWidget,
  CategoryBreakdown,
  GreetingHeader,
  GridCell,
  GridLayout,
  IntegrationsStatus,
  JokeCard,
  NewsButton,
  NewsModal,
  NewsPreview,
  SuggestionsFeed,
} from '@/components/dashboard';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useHourlyRefresh } from '@/hooks/useHourlyRefresh';
import { runHourlyScan } from '@/services/suggestionEngine';
import { useNewsStore } from '@/store/useNewsStore';
import type { RootStackParamList } from '@/navigation/types';

/**
 * Dashboard. Mobile-first stack; desktop uses a 12-col grid. Writes
 * to external systems happen only through SuggestionCard approvals —
 * the Ottley modal tool calls pipe through the same propose path.
 */
export const DashboardScreen: React.FC = () => {
  const bp = useBreakpoint();
  const insets = useSafeAreaInsets();
  const refreshNews = useNewsStore((s) => s.refresh);
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [newsOpen, setNewsOpen] = useState(false);

  useHourlyRefresh(async () => {
    await runHourlyScan();
    refreshNews();
  });

  const openProfile = () => navigation.navigate('Profile');

  const topRow = (
    <View style={styles.topRow}>
      <View style={{ flex: 1 }}>
        <GreetingHeader />
      </View>
      <NewsButton onPress={() => setNewsOpen(true)} />
      <Pressable onPress={openProfile} hitSlop={8} style={styles.profileBtn}>
        <Icon name="person" size={18} color={colors.text} />
      </Pressable>
    </View>
  );

  if (bp === 'lg') {
    return (
      <View style={styles.root}>
        <ScrollView
          contentContainerStyle={[
            styles.desktopScroll,
            { paddingBottom: insets.bottom + 160 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.desktopInner}>
            {topRow}
            <GridLayout>
              <GridCell span={8}>
                <CalendarWidget />
              </GridCell>
              <GridCell span={4}>
                <SuggestionsFeed />
              </GridCell>
              <GridCell span={4}>
                <CategoryBreakdown />
              </GridCell>
              <GridCell span={4}>
                <NewsPreview onPress={() => setNewsOpen(true)} />
              </GridCell>
              <GridCell span={4}>
                <JokeCard />
              </GridCell>
              <GridCell span={12}>
                <IntegrationsStatus />
              </GridCell>
            </GridLayout>
          </View>
        </ScrollView>
        <NewsModal visible={newsOpen} onClose={() => setNewsOpen(false)} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.mobileScroll,
          {
            paddingTop: insets.top + spacing.md,
            paddingBottom: insets.bottom + 160,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {topRow}
        <View style={styles.stack}>
          <CalendarWidget />
          <SuggestionsFeed />
          <CategoryBreakdown />
          <NewsPreview onPress={() => setNewsOpen(true)} />
          <JokeCard />
          <IntegrationsStatus />
        </View>
      </ScrollView>
      <NewsModal visible={newsOpen} onClose={() => setNewsOpen(false)} />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: lightPalette.bg,
  },
  mobileScroll: {
    paddingHorizontal: spacing.lg,
  },
  desktopScroll: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
    alignItems: 'center',
  },
  desktopInner: {
    width: '100%',
    maxWidth: 1280,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  profileBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  stack: {
    gap: spacing.md,
  },
});
