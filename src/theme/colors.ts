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

/**
 * Per-user theme. The app has exactly two users — Sarah (pink) and
 * Tyler (blue) — so we hard-code both palettes and pick between them
 * based on whoever is logged in.
 *
 * Each palette gives the app a hero tint, a soft background wash,
 * a pair of owl body colors, and a subtle border tone.
 */
export const userPalettes = {
  sarah: {
    name: 'Sarah',
    // Hero — used for buttons, the today dot, the "you" tag.
    accent: '#E8588F',
    accentSoft: '#F9DCE6',
    accentDeep: '#B83B6E',
    // Owl body colors
    owlBody: '#FFD5E3',
    owlBodyShade: '#F6A9C4',
    owlBodyDeep: '#E5829F',
    owlCheek: '#FF9FB8',
    owlOutline: '#5A2840',
    // UI accents
    tabActive: '#E8588F',
    chipBg: '#FDE7EF',
  },
  tyler: {
    name: 'Tyler',
    accent: '#4C8DE0',
    accentSoft: '#DCE9FA',
    accentDeep: '#2D5FA8',
    owlBody: '#CFE3FB',
    owlBodyShade: '#A5C3EE',
    owlBodyDeep: '#6F95CF',
    owlCheek: '#8FB6EF',
    owlOutline: '#1E3355',
    tabActive: '#4C8DE0',
    chipBg: '#E3EEFB',
  },
} as const;

export type UserPaletteKey = keyof typeof userPalettes;
export type UserPalette = (typeof userPalettes)[UserPaletteKey];

export type ColorToken = keyof typeof colors;
export type TagColor = (typeof tagColors)[number];
