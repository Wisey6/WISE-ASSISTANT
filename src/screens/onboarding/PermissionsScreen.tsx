import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { requestRecordingPermissionsAsync } from 'expo-audio';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Button, Card, Icon, Screen, Text } from '@/components';
import { colors, radius, spacing } from '@/theme';
import { useUserStore } from '@/store/useUserStore';
import { requestNotificationPermission } from '@/services/notifications';
import type { OnboardingStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Permissions'>;

/**
 * Permissions step. Two toggles — notifications and microphone —
 * each granted in-place so the user doesn't bounce through system
 * dialogs without context.
 */
export const PermissionsScreen: React.FC<Props> = () => {
  const completeOnboarding = useUserStore((s) => s.completeOnboarding);
  const [notifGranted, setNotifGranted] = useState(false);
  const [micGranted, setMicGranted] = useState(false);

  const requestNotif = async () => {
    const ok = await requestNotificationPermission();
    setNotifGranted(ok);
  };

  const requestMic = async () => {
    const { granted } = await requestRecordingPermissionsAsync();
    setMicGranted(granted);
  };

  return (
    <Screen bottomInset={false}>
      <View style={styles.root}>
        <View>
          <Text variant="caption">STEP 3 OF 3</Text>
          <Text variant="title1" style={{ marginTop: spacing.xs }}>
            A couple of permissions
          </Text>
          <Text variant="subhead" style={{ marginTop: spacing.xs }}>
            These are optional, but they make Wise much more useful.
          </Text>

          <View style={styles.options}>
            <PermissionCard
              icon="sparkle"
              title="Daily briefing & reminders"
              description="A calm 7 AM summary of what's ahead, plus deadline nudges."
              granted={notifGranted}
              onRequest={requestNotif}
            />
            <PermissionCard
              icon="mic"
              title="Voice input"
              description="Talk to your assistant instead of typing — especially handy in the car."
              granted={micGranted}
              onRequest={requestMic}
            />
          </View>
        </View>

        <Button label="Start using Wise" onPress={completeOnboarding} />
      </View>
    </Screen>
  );
};

interface CardProps {
  icon: 'sparkle' | 'mic';
  title: string;
  description: string;
  granted: boolean;
  onRequest: () => void;
}

const PermissionCard: React.FC<CardProps> = ({
  icon,
  title,
  description,
  granted,
  onRequest,
}) => (
  <Card style={styles.permCard}>
    <View style={styles.permIcon}>
      <Icon name={icon} size={18} color={colors.text} />
    </View>
    <View style={{ flex: 1 }}>
      <Text variant="headline">{title}</Text>
      <Text variant="subhead" style={{ marginTop: 2 }}>
        {description}
      </Text>
    </View>
    <Button
      label={granted ? 'Enabled' : 'Enable'}
      variant={granted ? 'secondary' : 'primary'}
      onPress={onRequest}
      fullWidth={false}
      style={styles.permButton}
    />
  </Card>
);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: spacing.xl,
  },
  options: {
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  permCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  permIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permButton: {
    height: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
  },
});
