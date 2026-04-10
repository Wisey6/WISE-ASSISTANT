import React, { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Button, Screen, Text } from '@/components';
import { colors, radius, spacing, typography } from '@/theme';
import { useUserStore } from '@/store/useUserStore';
import type { OnboardingStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'CreateAccount'>;

/**
 * Sign-up form. Deliberately minimal — name + email. A future
 * version can add password or magic-link flow, both of which will
 * plug into `firebase.signUp` without needing a UI change.
 */
export const CreateAccountScreen: React.FC<Props> = ({ navigation }) => {
  const setUser = useUserStore((s) => s.setUser);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const canContinue = name.trim().length > 0 && /.+@.+\..+/.test(email);

  const handleNext = () => {
    setUser({
      id: 'local-user',
      name: name.trim(),
      email: email.trim(),
      partnerId: null,
    });
    navigation.navigate('InvitePartner');
  };

  return (
    <Screen keyboardAvoiding bottomInset={false}>
      <View style={styles.root}>
        <View>
          <Text variant="caption">STEP 1 OF 3</Text>
          <Text variant="title1" style={{ marginTop: spacing.xs }}>
            Create your account
          </Text>
          <Text variant="subhead" style={{ marginTop: spacing.xs }}>
            Wise uses your name so your briefings feel personal.
          </Text>

          <View style={styles.fields}>
            <Field label="Name">
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Alex Carter"
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="words"
                style={[typography.body, styles.input]}
              />
            </Field>
            <Field label="Email">
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={colors.textTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                style={[typography.body, styles.input]}
              />
            </Field>
          </View>
        </View>

        <Button label="Continue" disabled={!canContinue} onPress={handleNext} />
      </View>
    </Screen>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <View style={styles.field}>
    <Text variant="caption" style={{ marginBottom: spacing.xs }}>
      {label.toUpperCase()}
    </Text>
    <View style={styles.inputWrap}>{children}</View>
  </View>
);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: spacing.xl,
  },
  fields: {
    marginTop: spacing.xl,
    gap: spacing.lg,
  },
  field: {
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
