import { create } from 'zustand';

export const useThemeStore = create((set) => ({
  isDark: false,
  toggle: () => set((s) => ({ isDark: !s.isDark })),
}));
