import React, { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Button, Screen, Text } from '@/components';
import { colors, radius, spacing, typography } from '@/theme';
import type { OnboardingStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'InvitePartner'>;

export const InvitePartnerScreen: React.FC<Props> = ({ navigation }) => {
  const [partnerEmail, setPartnerEmail] = useState('');

  return (
    <Screen keyboardAvoiding bottomInset={false}>
      <View style={styles.root}>
        <View>
          <Text variant="caption">STEP 2 OF 3</Text>
          <Text variant="title1" style={{ marginTop: spacing.xs }}>
            Invite a partner
          </Text>
          <Text variant="subhead" style={{ marginTop: spacing.xs }}>
            Share tasks, calendar, and daily briefings. You can do this
            later in settings.
          </Text>

          <View style={styles.field}>
            <Text variant="caption" style={{ marginBottom: spacing.xs }}>
              PARTNER'S EMAIL
            </Text>
            <View style={styles.inputWrap}>
              <TextInput
                value={partnerEmail}
                onChangeText={setPartnerEmail}
                placeholder="partner@example.com"
                placeholderTextColor={colors.textTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                style={[typography.body, styles.input]}
              />
            </View>
          </View>
        </View>

        <View style={{ gap: spacing.sm }}>
          <Button label="Send invite" onPress={() => navigation.navigate('Permissions')} />
          <Button
            variant="ghost"
            label="I'll do this later"
            onPress={() => navigation.navigate('Permissions')}
          />
        </View>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: spacing.xl,
  },
  field: {
    marginTop: spacing.xl,
    gap: spacing.xs,
  },
  inputWrap: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    height: 52,
    justifyContent: 'center',
  },
  input: {
    color: colors.text,
  },
});
