import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { lightPalette, spacing, typography } from '@/theme';
import { Text } from '@/components/Text';
import { useNewsStore } from '@/store/useNewsStore';
import type { FootballFixture, FootballHeadline } from '@/types/news';

import { DashboardCard } from './DashboardCard';

export const NewsPreview: React.FC = () => {
  const weather = useNewsStore((s) => s.weather);
  const football = useNewsStore((s) => s.football);
  const anthropic = useNewsStore((s) => s.anthropic);
  const refresh = useNewsStore((s) => s.refresh);
  const lastRefreshed = useNewsStore((s) => s.lastRefreshedAt);

  useEffect(() => {
    if (!lastRefreshed) refresh();
  }, [lastRefreshed, refresh]);

  const today = weather?.days[0];
  const nextFootball = football[0];
  const latestAnthropic = anthropic[0];

  return (
    <DashboardCard>
      <Text style={[typography.caption, styles.eyebrow]}>TAILORED NEWS</Text>
      <View style={styles.rows}>
        <Row
          label="Weather"
          value={
            today
              ? `${today.condition} · H ${today.high}° / L ${today.low}°`
              : 'Loading…'
          }
        />
        <Row
          label="Football"
          value={nextFootball ? footballLine(nextFootball) : '—'}
        />
        <Row
          label="Anthropic"
          value={latestAnthropic?.title ?? 'No new updates'}
        />
      </View>
    </DashboardCard>
  );
};

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.row}>
    <Text
      style={[typography.footnote, { color: lightPalette.textTertiary, width: 88 }]}
    >
      {label}
    </Text>
    <Text
      style={[typography.footnote, { color: lightPalette.textPrimary, flex: 1 }]}
      numberOfLines={1}
    >
      {value}
    </Text>
  </View>
);

function footballLine(item: FootballHeadline | FootballFixture): string {
  if ('home' in item) {
    const date = new Date(item.kickoff);
    return `${item.home.name} vs ${item.away.name} · ${date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    })}`;
  }
  return item.title;
}

const styles = StyleSheet.create({
  eyebrow: {
    color: lightPalette.textTertiary,
    letterSpacing: 1.2,
    marginBottom: spacing.md,
  },
  rows: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
