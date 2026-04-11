import { useUserStore } from '@/store/useUserStore';

import { userPalettes, type UserPalette } from './colors';

/**
 * Returns the palette for whoever is logged in on this phone.
 * Defaults to Sarah's pink if nothing is picked yet (unusual —
 * onboarding gates the main app on having a user).
 */
export function useUserTheme(): UserPalette {
  const currentUserId = useUserStore((s) => s.currentUserId);
  return currentUserId ? userPalettes[currentUserId] : userPalettes.sarah;
}
