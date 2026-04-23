import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  user: null,
  session: null,

  setUser: (user, session = null) => set({ user, session }),

  clearUser: () => set({ user: null, session: null }),
}));

// Keep the mock export so other screens that still import MOCK_USER don't break
export const MOCK_USER = {
  id: 'u1',
  email: 'farhan@example.com',
  full_name: 'Farhan Ahmad',
  avatar_url: undefined,
};
