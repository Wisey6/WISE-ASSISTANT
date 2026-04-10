/**
 * Minimal, Apple-inspired palette.
 * Off-white background, soft black text, one warm accent.
 * Keep this list short on purpose — restraint is the design.
 */
export const colors = {
  // Surfaces
  background: '#F8F8F8',
  surface: '#FFFFFF',
  surfaceMuted: '#F1F1F3',
  overlay: 'rgba(17, 17, 19, 0.04)',

  // Text
  text: '#111113',
  textSecondary: '#6B6B70',
  textTertiary: '#A1A1A6',
  textInverse: '#FFFFFF',

  // Accents
  accent: '#E08B4A', // warm amber — matches the owl, used sparingly
  accentSoft: '#FBEADA',

  // Semantics
  success: '#3AA675',
  successSoft: '#E3F4EB',
  warning: '#E0A84A',
  danger: '#E05A4A',

  // Strokes
  border: '#ECECEE',
  divider: '#EFEFF1',
} as const;

export type ColorToken = keyof typeof colors;
