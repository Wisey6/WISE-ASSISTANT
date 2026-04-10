import React from 'react';
import { Text as RNText, TextProps, TextStyle } from 'react-native';

import { colors, typography, type TypographyToken } from '@/theme';

interface Props extends TextProps {
  variant?: TypographyToken;
  color?: string;
  weight?: TextStyle['fontWeight'];
  children: React.ReactNode;
}

/**
 * Thin wrapper around React Native's `Text` that pulls styling
 * straight from the typography scale. Using a variant keeps the
 * screens tidy — `<Text variant="title1">` is all you need.
 */
export const Text: React.FC<Props> = ({
  variant = 'body',
  color = colors.text,
  weight,
  style,
  children,
  ...rest
}) => (
  <RNText
    allowFontScaling
    style={[typography[variant], { color }, weight ? { fontWeight: weight } : null, style]}
    {...rest}
  >
    {children}
  </RNText>
);
