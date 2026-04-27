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

if (Platform.OS !== 'web') {
  SplashScreen.preventAutoHideAsync();
}

const queryClient = new QueryClient();

function AuthGuard() {
  const user            = useAuthStore((s) => s.user);
  const router          = useRouter();
  const segments        = useSegments();
  const navigationState = useRootNavigationState();

  useEffect(() => {
    if (!navigationState?.key) return;

    const inApp      = segments[0] === '(app)';
    const inAuth     = segments[0] === '(auth)';
    const inDashboard= segments[1] === 'dashboard';

    if (!user && inApp) {
      router.replace('/(auth)/login');
    } else if (user && inAuth) {
      if (user.role === 'superadmin') {
        router.replace('/(app)/dashboard');
      } else {
        router.replace('/(app)/books');
      }
    } else if (user && inApp && !inDashboard && user.role === 'superadmin') {
      // Super admin trying to access /books directly → redirect to dashboard
      // (Comment this block out if you want superadmin to access both)
      // router.replace('/(app)/dashboard');
    }
  }, [user, segments, navigationState?.key]);

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
      <AuthGuard />
      <Slot />
      <Toast />
    </QueryClientProvider>
  );
}
