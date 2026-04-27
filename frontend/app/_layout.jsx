import { useEffect } from 'react';
import { Platform } from 'react-native';
import Toast from '../src/lib/toast';
import { Slot, useRouter, useSegments, useRootNavigationState } from 'expo-router';
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
  const user            = useAuthStore((s) => s.user);
  const router          = useRouter();
  const segments        = useSegments();
  const navigationState = useRootNavigationState();

  useEffect(() => {
    if (!navigationState?.key) return;

    const inApp       = segments[0] === '(app)';
    const inAuth      = segments[0] === '(auth)';
    const inDashboard = segments[1] === 'dashboard';

    if (!user && inApp) {
      router.replace('/(auth)/login');
    } else if (user && inAuth) {
      if (user.role === 'superadmin') {
        router.replace('/(app)/dashboard/users');
      } else {
        router.replace('/(app)/books');
      }
    } else if (user && inApp && !inDashboard && user.role === 'superadmin') {
      // Superadmin accessing /books — allowed (admin can also view their own books)
    }
  }, [user, segments, navigationState?.key]);

  return null;
}

function SupabaseAuthListener() {
  const setUser   = useAuthStore((s) => s.setUser);
  const clearUser = useAuthStore((s) => s.clearUser);

  useEffect(() => {
    // Restore session on app start
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        try {
          const profile = await apiGetProfile();
          setUser(profile, session);
        } catch {
          // Profile fetch failed — session exists but backend unreachable; sign out cleanly
          await supabase.auth.signOut();
          clearUser();
        }
      }
    });

    // Listen for login/logout events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          try {
            const profile = await apiGetProfile();
            setUser(profile, session);
          } catch (err) {
            console.error('[Auth] Profile fetch failed:', err?.message);
          }
        } else if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
          clearUser();
          queryClient.clear();
        } else if (event === 'TOKEN_REFRESHED' && session) {
          // Keep session in sync in the store
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
