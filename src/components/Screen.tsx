import React from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  ViewStyle,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing } from '@/theme';

interface Props {
  children: React.ReactNode;
  /** When true the content scrolls. Use for long screens. */
  scroll?: boolean;
  /** Extra horizontal padding on top of the default gutter. */
  gutter?: number;
  /** Include padding above the floating tab bar. */
  bottomInset?: boolean;
  style?: ViewStyle;
  keyboardAvoiding?: boolean;
}

/**
 * Screen wrapper. All screens should use this so spacing, safe areas,
 * and the tab bar inset stay consistent across the app.
 */
export const Screen: React.FC<Props> = ({
  children,
  scroll = false,
  gutter = spacing.lg,
  bottomInset = true,
  keyboardAvoiding = false,
  style,
}) => {
  const insets = useSafeAreaInsets();
  const content = (
    <View
      style={[
        {
          flex: scroll ? undefined : 1,
          paddingTop: insets.top + spacing.sm,
          paddingHorizontal: gutter,
          paddingBottom: bottomInset ? insets.bottom + 96 : insets.bottom,
        },
        style,
      ]}
    >
      {children}
    </View>
  );

  const body = scroll ? (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {content}
    </ScrollView>
  ) : (
    content
  );

  if (keyboardAvoiding) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.root}
      >
        {body}
      </KeyboardAvoidingView>
    );
  }

  return <View style={styles.root}>{body}</View>;
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
});
