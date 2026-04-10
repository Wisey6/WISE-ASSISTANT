/**
 * Firebase wrapper — intentionally stubbed.
 *
 * We export the same shape the rest of the app will use once real
 * Firebase credentials are added. Until then every call is a no-op
 * so the UI runs offline. Keeping the boundary here (not in screens)
 * means none of the screens care whether we're online or not.
 */

import type { Task, User } from '@/types';

export interface FirebaseGateway {
  signIn: (email: string, password: string) => Promise<User>;
  signUp: (name: string, email: string, password: string) => Promise<User>;
  signOut: () => Promise<void>;
  subscribeTasks: (userId: string, cb: (tasks: Task[]) => void) => () => void;
  writeTask: (task: Task) => Promise<void>;
  invitePartner: (email: string) => Promise<{ partnerId: string }>;
}

const notImplemented = async (): Promise<never> => {
  throw new Error(
    'Firebase is not configured yet. Add credentials in src/services/firebase.ts.',
  );
};

export const firebase: FirebaseGateway = {
  signIn: notImplemented,
  signUp: notImplemented,
  signOut: async () => {},
  subscribeTasks: () => () => {},
  writeTask: async () => {},
  invitePartner: notImplemented,
};
