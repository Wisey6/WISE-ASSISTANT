/**
 * Tiny id generator. We don't need UUIDs on-device; Firestore will
 * assign real ids when we sync. This is good enough to key lists.
 */
export const createId = (prefix = 'id'): string => {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}_${rand}`;
};
