import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastProvider } from '@/components/toast';
import { useSession } from '@/lib/session';
import { C, FONT_FILES } from '@/theme';

SplashScreen.preventAutoHideAsync();

/**
 * Sends people where they belong (the web's useGuard):
 *  out              welcome & sign-in
 *  in, no taste     onboarding
 *  in, with taste   the tabs (and onboarding again, to retune)
 * When a guard flips (signing in or out) the reader is sent to `home`: the
 * tabs group has no index screen of its own, so it's named outright.
 */
export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(FONT_FILES);
  const { status, onboarded } = useSession();
  const ready = (fontsLoaded || !!fontError) && status !== 'loading';
  const home = status !== 'in' ? '/' : onboarded ? '/feed' : '/onboarding';

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: C.paper }}>
      <SafeAreaProvider>
        <ToastProvider>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.paper }, animation: 'fade' }}>
            <Stack.Protected guard={status === 'out'} redirectTo={home}>
              <Stack.Screen name="index" />
              <Stack.Screen name="login" options={{ animation: 'slide_from_right' }} />
            </Stack.Protected>
            <Stack.Protected guard={status === 'in' && onboarded} redirectTo={home}>
              <Stack.Screen name="(tabs)" />
            </Stack.Protected>
            <Stack.Protected guard={status === 'in'} redirectTo={home}>
              <Stack.Screen name="onboarding" />
            </Stack.Protected>
          </Stack>
        </ToastProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
