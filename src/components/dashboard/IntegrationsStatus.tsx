import React from 'react';
import { StyleSheet, View } from 'react-native';

import { lightPalette, spacing, typography } from '@/theme';
import { Text } from '@/components/Text';
import { useIntegrationsStore } from '@/store/useIntegrationsStore';
import type { IntegrationId } from '@/types/integrations';

import { DashboardCard } from './DashboardCard';

const ORDER: IntegrationId[] = ['clickup', 'google', 'microsoft', 'anthropic'];

export const IntegrationsStatus: React.FC = () => {
  const providers = useIntegrationsStore((s) => s.providers);

  return (
    <DashboardCard>
      <Text style={[typography.caption, styles.eyebrow]}>INTEGRATIONS</Text>
      <View style={styles.row}>
        {ORDER.map((id) => {
          const p = providers[id];
          return (
            <View key={id} style={styles.cell}>
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: p.connected
                      ? '#4F6B52'
                      : lightPalette.borderStrong,
                  },
                ]}
              />
              <Text style={[typography.footnote, styles.label]}>
                {p.label}
              </Text>
              <Text style={[typography.caption, styles.sub]}>
                {p.connected ? 'Connected' : 'Not connected'}
              </Text>
            </View>
          );
        })}
      </View>
    </DashboardCard>
  );
};

const styles = StyleSheet.create({
  eyebrow: {
    color: lightPalette.textTertiary,
    letterSpacing: 1.2,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  cell: {
    minWidth: 120,
    gap: 2,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: spacing.xs,
  },
  label: {
    color: lightPalette.textPrimary,
  },
  sub: {
    color: lightPalette.textTertiary,
  },
});
