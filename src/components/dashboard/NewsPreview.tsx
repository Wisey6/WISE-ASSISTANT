import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { lightPalette, spacing, typography } from '@/theme';
import { Text } from '@/components/Text';
import { useNewsStore } from '@/store/useNewsStore';
import type { FootballFixture, FootballHeadline } from '@/types/news';

import { DashboardCard } from './DashboardCard';

interface Props {
  onPress?: () => void;
}

export const NewsPreview: React.FC<Props> = ({ onPress }) => {
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
  const crypto = useNewsStore((s) => s.crypto);
  const stocks = useNewsStore((s) => s.stocks);
  const topCrypto = crypto[0];
  const topStock = stocks[0];

  const body = (
    <DashboardCard>
      <View style={styles.header}>
        <Text style={[typography.caption, styles.eyebrow]}>TAILORED NEWS</Text>
        {onPress && (
          <Text style={[typography.caption, styles.cta]} weight="600">
            OPEN →
          </Text>
        )}
      </View>
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
          label="Crypto"
          value={
            topCrypto
              ? `${topCrypto.symbol} ${topCrypto.changePct24h > 0 ? '+' : ''}${topCrypto.changePct24h.toFixed(1)}%`
              : '—'
          }
        />
        <Row
          label="Stocks"
          value={
            topStock
              ? `${topStock.symbol} ${topStock.changePct > 0 ? '+' : ''}${topStock.changePct.toFixed(1)}%`
              : 'Add ALPHA_VANTAGE_KEY'
          }
        />
        <Row
          label="Anthropic"
          value={latestAnthropic?.title ?? 'No new updates'}
        />
      </View>
    </DashboardCard>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress}>
        {({ pressed }) => (
          <View style={pressed ? styles.pressed : undefined}>{body}</View>
        )}
      </Pressable>
    );
  }
  return body;
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
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  eyebrow: {
    color: lightPalette.textTertiary,
    letterSpacing: 1.2,
  },
  cta: {
    color: lightPalette.textPrimary,
    letterSpacing: 1.2,
  },
  rows: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.996 }],
  },
});
