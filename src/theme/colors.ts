/**
 * Palette tuned to the "minimal + tiny pops of color" reference:
 * warm off-white canvas, bold near-black cards with cream text,
 * and a muted pastel set for calendar blocks and partner tags.
 *
 * Everything the rest of the app uses goes through these tokens —
 * never hard-code hex anywhere else.
 */
export const colors = {
  // Surfaces
  background: '#F1F0EA',        // warm cream canvas (like the reference)
  surface: '#FFFFFF',
  surfaceMuted: '#E9E7DF',      // slightly darker cream for chips / tracks
  surfaceInverse: '#0C0C0E',    // near-black for bold cards
  surfaceInverseSoft: '#1A1A1D',
  overlay: 'rgba(12, 12, 14, 0.04)',

  // Text
  text: '#0C0C0E',
  textSecondary: '#6B6A63',
  textTertiary: '#A5A39A',
  textInverse: '#F6F4EC',       // cream-white on dark cards
  textInverseMuted: 'rgba(246, 244, 236, 0.6)',

  // Strokes
  border: '#E0DED4',
  divider: '#EDEBE2',

  // Accent pops (use sparingly — one per screen)
  accent: '#E85D3C',            // coral-red, the "hero" pop
  accentPurple: '#8D7FD3',      // soft purple
  accentSoft: '#F4E6E1',        // coral wash for backgrounds

  // Semantics
  success: '#4FA67E',
  warning: '#E0A84A',
  danger: '#E05A4A',
} as const;

/**
 * Pastel palette used for calendar time blocks and partner activity
 * colors. Keep this list short so the whole app reads consistent.
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
