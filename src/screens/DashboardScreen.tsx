import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { lightPalette, spacing } from '@/theme';
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
  OttleyFab,
  OttleyModal,
  SuggestionsFeed,
} from '@/components/dashboard';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useHourlyRefresh } from '@/hooks/useHourlyRefresh';
import { runHourlyScan } from '@/services/suggestionEngine';
import { useNewsStore } from '@/store/useNewsStore';

/**
 * Dashboard. Mobile-first stack; desktop uses a 12-col grid. Writes
 * to external systems happen only through SuggestionCard approvals —
 * the Ottley modal tool calls pipe through the same propose path.
 */
export const DashboardScreen: React.FC = () => {
  const bp = useBreakpoint();
  const insets = useSafeAreaInsets();
  const refreshNews = useNewsStore((s) => s.refresh);

  const [ottleyOpen, setOttleyOpen] = useState(false);
  const [newsOpen, setNewsOpen] = useState(false);

  useHourlyRefresh(async () => {
    await runHourlyScan();
    refreshNews();
  });

  const fabBottom = insets.bottom + 100;

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
            <View style={styles.topRow}>
              <View style={{ flex: 1 }}>
                <GreetingHeader />
              </View>
              <NewsButton onPress={() => setNewsOpen(true)} />
            </View>
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
                <NewsPreview />
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

        <OttleyFab onPress={() => setOttleyOpen(true)} bottomInset={fabBottom} />
        <OttleyModal visible={ottleyOpen} onClose={() => setOttleyOpen(false)} />
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
        <View style={styles.topRow}>
          <View style={{ flex: 1 }}>
            <GreetingHeader />
          </View>
          <NewsButton onPress={() => setNewsOpen(true)} />
        </View>
        <View style={styles.stack}>
          <CalendarWidget />
          <SuggestionsFeed />
          <CategoryBreakdown />
          <NewsPreview />
          <JokeCard />
          <IntegrationsStatus />
        </View>
      </ScrollView>

      <OttleyFab onPress={() => setOttleyOpen(true)} bottomInset={fabBottom} />
      <OttleyModal visible={ottleyOpen} onClose={() => setOttleyOpen(false)} />
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
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  stack: {
    gap: spacing.md,
  },
});
