import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  user:    null,
  session: null,

  /** Called after login: profile object from /api/v1/profile + Supabase session */
  setUser: (user, session = null) => set({ user, session }),

  clearUser: () => set({ user: null, session: null }),
}));
