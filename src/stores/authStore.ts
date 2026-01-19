/**
 * Roboto SAI Auth Store
 * Simple client-side auth for user-specific chat persistence
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  userId: string | null;
  username: string | null;
  isLoggedIn: boolean;
  login: (username: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      userId: null,
      username: null,
      isLoggedIn: false,
      login: (username: string) => {
        const userId = username.toLowerCase().replace(/\s+/g, '_').slice(0, 64);
        set({ userId, username, isLoggedIn: true });
      },
      logout: () => {
        set({ userId: null, username: null, isLoggedIn: false });
      },
    }),
    {
      name: 'robo-auth',
    }
  )
);
