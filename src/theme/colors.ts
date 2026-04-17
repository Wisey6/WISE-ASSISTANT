/**
 * Global palette. Warm off-white canvas, bold near-black cards with
 * cream text, and a small accent set for subtle colored touches.
 * Never hard-code hex anywhere else.
 */
export const colors = {
  // Surfaces
  background: '#F1F0EA',
  surface: '#FFFFFF',
  surfaceMuted: '#E9E7DF',
  surfaceInverse: '#0C0C0E',
  surfaceInverseSoft: '#1A1A1D',
  overlay: 'rgba(12, 12, 14, 0.04)',

  // Text
  text: '#0C0C0E',
  textSecondary: '#6B6A63',
  textTertiary: '#A5A39A',
  textInverse: '#F6F4EC',
  textInverseMuted: 'rgba(246, 244, 236, 0.6)',

  // Strokes
  border: '#E0DED4',
  divider: '#EDEBE2',

  // Accents
  accent: '#E85D3C',
  accentSoft: '#F4E6E1',

  // Semantics
  success: '#4FA67E',
  warning: '#E0A84A',
  danger: '#E05A4A',
} as const;

/**
 * Pastel palette used for calendar time blocks.
 */
export const tagColors = [
  '#C6BEE3', // lavender
  '#E8A29A', // coral rose
  '#F2C999', // warm peach
  '#A6C5A0', // sage
  '#9FBCCF', // sky
  '#D8C18A', // mustard
  '#E3A5C3', // rose
  '#B5B4AA', // stone
] as const;

export type ColorToken = keyof typeof colors;
export type TagColor = (typeof tagColors)[number];
