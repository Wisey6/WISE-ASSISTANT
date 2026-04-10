import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import {
  Card,
  Icon,
  ProgressBar,
  Screen,
  SectionHeader,
  TaskRow,
  Text,
} from '@/components';
import { colors, radius, spacing } from '@/theme';
import { useTaskStore } from '@/store/useTaskStore';
import { useUserStore } from '@/store/useUserStore';
import { useTaskInsights } from '@/hooks/useTaskInsights';
import { greetingForNow } from '@/utils/date';
import type { MainTabParamList } from '@/navigation/types';

/**
 * The home screen. Three stacked sections:
 *
 *   1. Greeting + summary card (headline + progress)
 *   2. Today's tasks (short list with "See all")
 *   3. A small insights strip (due today / high priority / overdue)
 *
 * Everything reads off `useTaskInsights`, so the numbers stay in sync
 * with the rest of the app automatically.
 */
export const DashboardScreen: React.FC = () => {
  const user = useUserStore((s) => s.user);
  const toggleTask = useTaskStore((s) => s.toggleTask);
  const insights = useTaskInsights();
  const navigation =
    useNavigation<BottomTabNavigationProp<MainTabParamList>>();

  const todaySlice = insights.openTasks.slice(0, 3);
  const percent = Math.round(insights.completionRatio * 100);

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Text variant="subhead">{greetingForNow()}</Text>
        <Text variant="largeTitle">Hello, {user?.name ?? 'there'} 👋</Text>
      </View>

      <Card style={styles.summaryCard}>
        <View style={styles.summaryTop}>
          <View style={{ flex: 1 }}>
            <Text variant="caption" color={colors.textTertiary}>
              TODAY
            </Text>
            <Text variant="title2" style={{ marginTop: 4 }}>
              {insights.headline}
            </Text>
            <Text variant="subhead" style={{ marginTop: 6 }}>
              {insights.dueToday} due today · {insights.remaining} open
            </Text>
          </View>
          <View style={styles.ring}>
            <Text variant="title3">{percent}%</Text>
          </View>
        </View>
        <View style={{ marginTop: spacing.lg }}>
          <ProgressBar value={insights.completionRatio} />
          <Text variant="footnote" style={{ marginTop: spacing.sm }}>
            {insights.completed} of {insights.total} tasks complete
          </Text>
        </View>
      </Card>

      <View style={styles.insightsRow}>
        <InsightPill
          label="Due today"
          value={insights.dueToday}
          icon="calendar"
        />
        <InsightPill
          label="High priority"
          value={insights.highPriority}
          icon="flame"
          tint={colors.accent}
        />
        <InsightPill
          label="Overdue"
          value={insights.overdue}
          icon="sparkle"
          tint={insights.overdue > 0 ? colors.danger : colors.textSecondary}
        />
      </View>

      <View style={{ marginTop: spacing.xl }}>
        <SectionHeader
          title="Today"
          action={{
            label: 'See all',
            onPress: () => navigation.navigate('Tasks'),
          }}
        />
        <Card padded={false} style={{ paddingHorizontal: spacing.lg }}>
          {todaySlice.length === 0 ? (
            <EmptyState
              title="All clear"
              subtitle="Nothing open today. Ask your assistant what's next."
              onPress={() => navigation.navigate('Assistant')}
            />
          ) : (
            todaySlice.map((task, idx) => (
              <View
                key={task.id}
                style={[
                  idx > 0 && {
                    borderTopWidth: StyleSheet.hairlineWidth,
                    borderTopColor: colors.divider,
                  },
                ]}
              >
                <TaskRow task={task} onToggle={toggleTask} />
              </View>
            ))
          )}
        </Card>
      </View>

      <Pressable
        style={styles.assistantCta}
        onPress={() => navigation.navigate('Assistant')}
      >
        <View style={styles.assistantCtaIcon}>
          <Icon name="sparkle" size={18} color={colors.textInverse} />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="headline" color={colors.textInverse}>
            Talk to Wise
          </Text>
          <Text variant="subhead" color="rgba(255,255,255,0.7)">
            Say what's on your plate — it'll sort the rest.
          </Text>
        </View>
        <Icon name="arrowRight" size={20} color={colors.textInverse} />
      </Pressable>
    </Screen>
  );
};

interface PillProps {
  label: string;
  value: number;
  icon: 'calendar' | 'flame' | 'sparkle';
  tint?: string;
}

const InsightPill: React.FC<PillProps> = ({ label, value, icon, tint }) => (
  <View style={styles.pill}>
    <View style={styles.pillIcon}>
      <Icon name={icon} size={16} color={tint ?? colors.textSecondary} />
    </View>
    <Text variant="title3">{value}</Text>
    <Text variant="caption">{label}</Text>
  </View>
);

interface EmptyProps {
  title: string;
  subtitle: string;
  onPress: () => void;
}

const EmptyState: React.FC<EmptyProps> = ({ title, subtitle, onPress }) => (
  <Pressable onPress={onPress} style={styles.empty}>
    <Text variant="headline">{title}</Text>
    <Text variant="subhead" style={{ marginTop: 4 }}>
      {subtitle}
    </Text>
  </Pressable>
);

const styles = StyleSheet.create({
  header: {
    marginBottom: spacing.lg,
    gap: 2,
  },
  summaryCard: {
    paddingVertical: spacing.xl,
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ring: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  insightsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  pill: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: 4,
  },
  pillIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  assistantCta: {
    marginTop: spacing.xl,
    backgroundColor: colors.text,
    padding: spacing.lg,
    borderRadius: radius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  assistantCtaIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    paddingVertical: spacing.xl,
    alignItems: 'flex-start',
  },
});
