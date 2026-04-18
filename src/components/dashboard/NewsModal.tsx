import React, { useCallback } from 'react';
import {
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, Text } from '@/components';
import { colors, lightPalette, radius, spacing, typography } from '@/theme';
import { useNewsStore } from '@/store/useNewsStore';
import type {
  AnthropicUpdate,
  CryptoMover,
  FootballFixture,
  FootballHeadline,
  StockMover,
} from '@/types/news';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const NewsModal: React.FC<Props> = ({ visible, onClose }) => {
  const insets = useSafeAreaInsets();
  const weather = useNewsStore((s) => s.weather);
  const football = useNewsStore((s) => s.football);
  const anthropic = useNewsStore((s) => s.anthropic);
  const crypto = useNewsStore((s) => s.crypto);
  const stocks = useNewsStore((s) => s.stocks);
  const isRefreshing = useNewsStore((s) => s.isRefreshing);
  const refresh = useNewsStore((s) => s.refresh);

  const onRefresh = useCallback(() => {
    refresh();
  }, [refresh]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <View>
            <Text style={[typography.caption, styles.eyebrow]}>TAILORED NEWS</Text>
            <Text style={[typography.title2, styles.title]}>Today's brief</Text>
          </View>
          <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
            <Icon name="close" size={22} color={lightPalette.textPrimary} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
          }
        >
          {/* Weather */}
          <Section label="WEATHER — this week">
            {weather ? (
              weather.days.slice(0, 7).map((d) => (
                <View key={d.date} style={styles.weatherRow}>
                  <Text
                    style={[
                      typography.footnote,
                      { color: lightPalette.textTertiary, width: 56 },
                    ]}
                  >
                    {new Date(d.date).toLocaleDateString(undefined, {
                      weekday: 'short',
                    })}
                  </Text>
                  <Text
                    style={[
                      typography.body,
                      { color: lightPalette.textPrimary, flex: 1 },
                    ]}
                  >
                    {d.condition}
                  </Text>
                  <Text
                    style={[typography.body, { color: lightPalette.textPrimary }]}
                    weight="600"
                  >
                    {d.high}°
                  </Text>
                  <Text
                    style={[
                      typography.body,
                      { color: lightPalette.textTertiary, marginLeft: spacing.xs },
                    ]}
                  >
                    {d.low}°
                  </Text>
                </View>
              ))
            ) : (
              <Text style={[typography.body, styles.empty]}>Loading weather…</Text>
            )}
          </Section>

          {/* Markets — crypto + stocks */}
          <Section label="BIGGEST MOVERS — 24H">
            {crypto.length === 0 && stocks.length === 0 ? (
              <Text style={[typography.body, styles.empty]}>
                Loading markets…
              </Text>
            ) : (
              <>
                {crypto.map((c) => (
                  <MoverRow
                    key={`crypto-${c.id}`}
                    kind="crypto"
                    item={c}
                  />
                ))}
                {stocks.length === 0 && !process.env.EXPO_PUBLIC_ALPHA_VANTAGE_KEY ? (
                  <Text
                    style={[
                      typography.caption,
                      {
                        color: lightPalette.textTertiary,
                        paddingHorizontal: spacing.lg,
                        paddingVertical: spacing.md,
                      },
                    ]}
                  >
                    Add EXPO_PUBLIC_ALPHA_VANTAGE_KEY to .env for stock movers.
                  </Text>
                ) : (
                  stocks.map((s) => (
                    <MoverRow
                      key={`stock-${s.symbol}`}
                      kind="stock"
                      item={s}
                    />
                  ))
                )}
              </>
            )}
          </Section>

          {/* Football */}
          <Section label="ARSENAL & FOOTBALL">
            {football.length === 0 ? (
              <Text style={[typography.body, styles.empty]}>
                No fixtures or headlines fetched yet.
              </Text>
            ) : (
              football.map((item) => (
                <FootballItem
                  key={'id' in item ? item.id : (item as FootballHeadline).id}
                  item={item}
                />
              ))
            )}
          </Section>

          {/* Anthropic */}
          <Section label="ANTHROPIC UPDATES">
            {anthropic.length === 0 ? (
              <Text style={[typography.body, styles.empty]}>
                No Anthropic updates fetched.
              </Text>
            ) : (
              anthropic.map((item) => <AnthropicItem key={item.id} item={item} />)
            )}
          </Section>
        </ScrollView>
      </View>
    </Modal>
  );
};

const Section: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <View style={styles.section}>
    <Text style={[typography.caption, styles.sectionLabel]}>{label}</Text>
    <View style={styles.sectionBody}>{children}</View>
  </View>
);

const FootballItem: React.FC<{ item: FootballFixture | FootballHeadline }> = ({
  item,
}) => {
  if ('home' in item) {
    const date = new Date(item.kickoff);
    const live = item.status === 'live';
    const finished = item.status === 'finished';
    const scored =
      finished && typeof item.home.score === 'number' && typeof item.away.score === 'number';
    return (
      <View style={styles.footballRow}>
        <Text
          style={[typography.caption, { color: lightPalette.textTertiary, width: 80 }]}
        >
          {live ? 'LIVE' : date.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          })}
        </Text>
        <Text
          style={[typography.body, { color: lightPalette.textPrimary, flex: 1 }]}
          numberOfLines={1}
        >
          {item.home.name} {scored ? item.home.score : ''}{' '}
          vs {item.away.name} {scored ? item.away.score : ''}
        </Text>
      </View>
    );
  }
  const headline = item as FootballHeadline;
  return (
    <Pressable
      style={styles.footballRow}
      onPress={() => headline.url && Linking.openURL(headline.url).catch(() => undefined)}
    >
      <Text
        style={[typography.caption, { color: lightPalette.textTertiary, width: 80 }]}
      >
        {headline.source.toUpperCase()}
      </Text>
      <Text
        style={[typography.body, { color: lightPalette.textPrimary, flex: 1 }]}
        numberOfLines={2}
      >
        {headline.title}
      </Text>
    </Pressable>
  );
};

type MoverProps =
  | { kind: 'crypto'; item: CryptoMover }
  | { kind: 'stock'; item: StockMover };

const MoverRow: React.FC<MoverProps> = (props) => {
  const symbol =
    props.kind === 'crypto' ? props.item.symbol : props.item.symbol;
  const name =
    props.kind === 'crypto' ? props.item.name : props.item.name ?? props.item.symbol;
  const price = props.kind === 'crypto' ? props.item.price : props.item.price;
  const change =
    props.kind === 'crypto'
      ? props.item.changePct24h
      : props.item.changePct;
  const up = change >= 0;
  const url = props.kind === 'crypto' ? props.item.url : undefined;
  return (
    <Pressable
      style={styles.moverRow}
      onPress={() => url && Linking.openURL(url).catch(() => undefined)}
    >
      <Text
        style={[typography.caption, { color: lightPalette.textTertiary, width: 60 }]}
      >
        {props.kind === 'crypto' ? 'CRYPTO' : 'STOCK'}
      </Text>
      <View style={{ flex: 1 }}>
        <Text
          style={[typography.body, { color: lightPalette.textPrimary }]}
          weight="600"
          numberOfLines={1}
        >
          {symbol}
        </Text>
        <Text
          style={[typography.caption, { color: lightPalette.textTertiary }]}
          numberOfLines={1}
        >
          {name}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text
          style={[
            typography.body,
            { color: lightPalette.textPrimary },
          ]}
          weight="600"
        >
          {formatPrice(price)}
        </Text>
        <Text
          style={[
            typography.caption,
            { color: up ? '#4F6B52' : '#A65A4A' },
          ]}
          weight="600"
        >
          {up ? '+' : ''}
          {change.toFixed(2)}%
        </Text>
      </View>
    </Pressable>
  );
};

function formatPrice(p: number): string {
  if (p >= 1000) return `$${p.toFixed(0)}`;
  if (p >= 1) return `$${p.toFixed(2)}`;
  return `$${p.toFixed(4)}`;
}

const AnthropicItem: React.FC<{ item: AnthropicUpdate }> = ({ item }) => (
  <Pressable
    style={styles.anthropicRow}
    onPress={() => item.url && Linking.openURL(item.url).catch(() => undefined)}
  >
    <Text
      style={[typography.body, { color: lightPalette.textPrimary }]}
      numberOfLines={2}
    >
      {item.title}
    </Text>
    {item.summary ? (
      <Text
        style={[
          typography.footnote,
          { color: lightPalette.textSecondary, marginTop: 2 },
        ]}
        numberOfLines={2}
      >
        {item.summary}
      </Text>
    ) : null}
  </Pressable>
);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: lightPalette.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  eyebrow: {
    color: lightPalette.textTertiary,
    letterSpacing: 1.2,
  },
  title: {
    color: lightPalette.textPrimary,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: lightPalette.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  sectionLabel: {
    color: lightPalette.textTertiary,
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
  },
  sectionBody: {
    backgroundColor: lightPalette.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: lightPalette.border,
    overflow: 'hidden',
  },
  weatherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: lightPalette.divider,
  },
  footballRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: lightPalette.divider,
  },
  anthropicRow: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: lightPalette.divider,
  },
  moverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: lightPalette.divider,
  },
  empty: {
    color: lightPalette.textSecondary,
    padding: spacing.lg,
  },
});
