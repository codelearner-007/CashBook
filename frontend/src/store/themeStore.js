import { create } from 'zustand';

export const useThemeStore = create((set) => ({
  isDark: false,
  setIsDark: (value) => set({ isDark: value }),
  toggle: () => set((s) => ({ isDark: !s.isDark })),
}));
