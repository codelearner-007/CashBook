import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';

// expo-secure-store adapter for Zustand persist middleware.
// Falls back gracefully on web where SecureStore uses localStorage internally.
const secureStorage = {
  getItem:    (key) => SecureStore.getItemAsync(key).catch(() => null),
  setItem:    (key, value) => SecureStore.setItemAsync(key, value).catch(() => {}),
  removeItem: (key) => SecureStore.deleteItemAsync(key).catch(() => {}),
};

export const useWorkspaceStore = create(
  persist(
    (set) => ({
      activeWorkspace:    'personal',          // 'personal' | 'shared'
      setActiveWorkspace: (ws) => set({ activeWorkspace: ws }),
    }),
    {
      name:    'cashbook-workspace',
      storage: createJSONStorage(() => secureStorage),
    },
  ),
);
