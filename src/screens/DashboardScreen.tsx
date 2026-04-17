import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { lightPalette, spacing } from '@/theme';
import {
  CategoryBreakdown,
  ChatDock,
  GreetingHeader,
  GridCell,
  GridLayout,
  IntegrationsStatus,
  JokeCard,
  SuggestionsFeed,
  TodayAgenda,
  UpcomingDeadlines,
} from '@/components/dashboard';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useHourlyRefresh } from '@/hooks/useHourlyRefresh';
import { runHourlyScan } from '@/services/suggestionEngine';
import { useAssistantStore } from '@/store/useAssistantStore';

/**
 * Dashboard surface. Mobile-first stack; on wide screens (>= 1024px)
 * the same widgets flow into a 12-col grid. Writes to external
 * systems only happen when the user approves a suggestion — nothing
 * here side-effects ClickUp / Calendar on its own.
 */
export const DashboardScreen: React.FC = () => {
  const bp = useBreakpoint();
  const insets = useSafeAreaInsets();
  const appendUser = useAssistantStore((s) => s.appendUser);
  const appendAssistant = useAssistantStore((s) => s.appendAssistant);

  useHourlyRefresh(runHourlyScan);

  const handleSubmit = useCallback(
    (text: string) => {
      appendUser(text);
      // Placeholder while the Anthropic wiring lands. The real
      // `sendToClaude` action in useAssistantStore will tool-call
      // into suggestionEngine.propose() — never mutate directly.
      appendAssistant(
        "Noted. I'll file that under 'things you'll agree to later' — check the suggestions feed.",
      );
    },
    [appendUser, appendAssistant],
  );

  if (bp === 'lg') {
    return (
      <View style={styles.root}>
        <ScrollView
          contentContainerStyle={[
            styles.desktopScroll,
            { paddingBottom: insets.bottom + 140 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.desktopInner}>
            <GreetingHeader />
            <GridLayout>
              <GridCell span={8}>
                <TodayAgenda />
              </GridCell>
              <GridCell span={4}>
                <SuggestionsFeed />
              </GridCell>
              <GridCell span={4}>
                <CategoryBreakdown />
              </GridCell>
              <GridCell span={4}>
                <UpcomingDeadlines />
              </GridCell>
              <GridCell span={4}>
                <JokeCard />
              </GridCell>
              <GridCell span={12}>
                <IntegrationsStatus />
              </GridCell>
              <GridCell span={12}>
                <ChatDock onSubmit={handleSubmit} />
              </GridCell>
            </GridLayout>
          </View>
        </ScrollView>
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
            paddingBottom: insets.bottom + 140,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <GreetingHeader />
        <View style={styles.stack}>
          <TodayAgenda />
          <SuggestionsFeed />
          <CategoryBreakdown />
          <UpcomingDeadlines />
          <JokeCard />
          <IntegrationsStatus />
          <ChatDock onSubmit={handleSubmit} compact />
        </View>
      </ScrollView>
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
  stack: {
    gap: spacing.md,
  },
});
