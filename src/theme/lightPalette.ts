/**
 * Clean white variant for the Dashboard surface. Sits alongside the
 * warm-cream `colors` palette used by the rest of the app — do not
 * overwrite or replace those tokens. Only the Dashboard opts in.
 *
 * Voice: calm, editorial, typography-led. Surfaces are plain white
 * on a near-white canvas; contrast comes from ink-black text and
 * generous whitespace, not from colored fills.
 */
export const lightPalette = {
  bg: '#FAFAF8',
  surface: '#FFFFFF',
  surfaceSunken: '#F4F3EF',
  border: '#EAEAE6',
  borderStrong: '#D8D7D2',
  divider: '#EFEEE9',

  textPrimary: '#111113',
  textSecondary: '#5A5A5A',
  textTertiary: '#9A9A97',
  textOnDark: '#F6F4EC',

  ink: '#111113',
  inkSoft: '#1F1F22',
  overlay: 'rgba(17, 17, 19, 0.04)',
} as const;

export type LightPaletteToken = keyof typeof lightPalette;
