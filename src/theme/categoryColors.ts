/**
 * Category + status tokens for the Dashboard. Every value is
 * deliberately muted — saturation stays under ~35% so none of them
 * compete with the white surface. Applied as small dots / pills,
 * never as background washes or side-stripe accents.
 */
export const categoryColors = {
  work: '#2F4858',
  study: '#6B5B4E',
  personal: '#4F6B52',
} as const;

export const categoryColorSoft = {
  work: '#E8EEF2',
  study: '#F0EAE4',
  personal: '#E6EDE7',
} as const;

export const statusColors = {
  todo: '#8A8A8A',
  inProgress: '#B08A3E',
  blocked: '#A65A4A',
  completed: '#4F6B52',
} as const;

export type Category = keyof typeof categoryColors;
export type Status = keyof typeof statusColors;

export const categoryLabel: Record<Category, string> = {
  work: 'Work',
  study: 'Study',
  personal: 'Personal',
};

export const statusLabel: Record<Status, string> = {
  todo: 'To do',
  inProgress: 'In progress',
  blocked: 'Blocked',
  completed: 'Completed',
};
