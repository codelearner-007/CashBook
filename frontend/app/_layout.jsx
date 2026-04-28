import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import Toast from '../src/lib/toast';
import { Slot, useRouter, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from '@expo-google-fonts/inter';
import { useAuthStore } from '../src/store/authStore';
import { supabase } from '../src/lib/supabase';
import { apiGetProfile } from '../src/lib/api';

if (Platform.OS !== 'web') {
  SplashScreen.preventAutoHideAsync();
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 2 * 60 * 1000, retry: 1 },
  },
});

function AuthGuard() {
  const user     = useAuthStore((s) => s.user);
  const router   = useRouter();
  const segments = useSegments();
  const [navReady, setNavReady] = useState(false);

  // Wait one full render cycle so Expo Router's assertIsReady passes
  useEffect(() => { setNavReady(true); }, []);

  useEffect(() => {
    if (!navReady) return;

    const inApp = segments[0] === '(app)';

    if (!user && inApp) {
      router.replace('/(auth)/login');
    } else if (user && !inApp) {
      if (user.role === 'superadmin') {
        router.replace('/(app)/dashboard/users');
      } else {
        router.replace('/(app)/books');
      }
    }
  }, [user, segments, navReady]);

  return null;
}

// Fetch profile: try backend → Supabase direct → build from session
async function resolveProfile(session) {
  try {
    return await apiGetProfile();
  } catch {
    // Backend not running — read directly from profiles table
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();
    if (data) return data;
    // profiles table not set up yet — build minimal profile from Google session
    const u = session.user;
    return {
      id: u.id,
      email: u.email,
      full_name: u.user_metadata?.full_name || u.user_metadata?.name || u.email,
      avatar_url: u.user_metadata?.avatar_url || null,
      role: 'user',
      is_active: true,
    };
  }
}

function SupabaseAuthListener() {
  const setUser   = useAuthStore((s) => s.setUser);
  const clearUser = useAuthStore((s) => s.clearUser);

  useEffect(() => {
    // Restore session on app start
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const profile = await resolveProfile(session);
        setUser(profile, session);
      }
    });

    // Listen for login/logout events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          const profile = await resolveProfile(session);
          setUser(profile, session);
        } else if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
          clearUser();
          queryClient.clear();
        } else if (event === 'TOKEN_REFRESHED' && session) {
          const prev = useAuthStore.getState().user;
          if (prev) setUser(prev, session);
        }
      },
    );

    return () => subscription.unsubscribe();
  }, []);

  return null;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  useEffect(() => {
    if ((fontsLoaded || fontError) && Platform.OS !== 'web') {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError && Platform.OS !== 'web') return null;

  return (
    <QueryClientProvider client={queryClient}>
      <SupabaseAuthListener />
      <AuthGuard />
      <Slot />
      <Toast />
    </QueryClientProvider>
  );
}
