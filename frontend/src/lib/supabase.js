import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Native (iOS / Android) — encrypted hardware storage
const NativeStorage = {
  getItem:    (key)        => SecureStore.getItemAsync(key),
  setItem:    (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: (key)        => SecureStore.deleteItemAsync(key),
};

// Web — localStorage (SecureStore is unavailable in browser)
const WebStorage = {
  getItem:    (key)        => Promise.resolve(localStorage.getItem(key)),
  setItem:    (key, value) => Promise.resolve(localStorage.setItem(key, value)),
  removeItem: (key)        => Promise.resolve(localStorage.removeItem(key)),
};

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      storage:            Platform.OS === 'web' ? WebStorage : NativeStorage,
      autoRefreshToken:   true,
      persistSession:     true,
      detectSessionInUrl: false,
    },
  },
);
