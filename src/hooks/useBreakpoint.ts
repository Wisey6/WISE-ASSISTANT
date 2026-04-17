import { useWindowDimensions } from 'react-native';

export type Breakpoint = 'sm' | 'md' | 'lg';

export const BREAKPOINTS = {
  sm: 0,
  md: 640,
  lg: 1024,
} as const;

export function useBreakpoint(): Breakpoint {
  const { width } = useWindowDimensions();
  if (width >= BREAKPOINTS.lg) return 'lg';
  if (width >= BREAKPOINTS.md) return 'md';
  return 'sm';
}

export function useIsDesktop(): boolean {
  return useBreakpoint() === 'lg';
}
