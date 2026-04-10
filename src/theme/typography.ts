import { Platform, TextStyle } from 'react-native';

import { colors } from './colors';

/**
 * Uses the system font on iOS (San Francisco) to match HIG.
 * Letter-spacing follows Apple's tracking for large titles.
 */
const fontFamily = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'System',
});

const base: TextStyle = {
  fontFamily,
  color: colors.text,
};

export const typography = {
  largeTitle: {
    ...base,
    fontSize: 34,
    lineHeight: 41,
    fontWeight: '700',
    letterSpacing: 0.37,
  } satisfies TextStyle,
  title1: {
    ...base,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    letterSpacing: 0.36,
  } satisfies TextStyle,
  title2: {
    ...base,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '600',
    letterSpacing: 0.35,
  } satisfies TextStyle,
  title3: {
    ...base,
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '600',
  } satisfies TextStyle,
  headline: {
    ...base,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600',
  } satisfies TextStyle,
  body: {
    ...base,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '400',
  } satisfies TextStyle,
  callout: {
    ...base,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '400',
  } satisfies TextStyle,
  subhead: {
    ...base,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '400',
    color: colors.textSecondary,
  } satisfies TextStyle,
  footnote: {
    ...base,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
    color: colors.textSecondary,
  } satisfies TextStyle,
  caption: {
    ...base,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    color: colors.textTertiary,
    letterSpacing: 0.4,
  } satisfies TextStyle,
} as const;

export type TypographyToken = keyof typeof typography;
