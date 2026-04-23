import { useEffect } from 'react';
import { Platform } from 'react-native';
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

if (Platform.OS !== 'web') {
  SplashScreen.preventAutoHideAsync();
}

const queryClient = new QueryClient();

function AuthGuard() {
  const user     = useAuthStore((s) => s.user);
  const router   = useRouter();
  const segments = useSegments();

  useEffect(() => {
    const inApp  = segments[0] === '(app)';
    const inAuth = segments[0] === '(auth)';

    if (!user && inApp) {
      // Logged out while inside the app — send to login
      router.replace('/(auth)/login');
    } else if (user && inAuth) {
      // Already logged in — skip login screen
      router.replace('/(app)/books');
    }
  }, [user, segments]);

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
    </QueryClientProvider>
  );
}
