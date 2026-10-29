import { useFonts } from 'expo-font';
import { Stack, type ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastProvider } from '@/components/toast';
import { Button, Eyebrow, Wordmark } from '@/components/ui';
import { reportError } from '@/lib/backend';
import { installCrashReporting } from '@/lib/crash';
import { useSession } from '@/lib/session';
import { C, F, GUTTER, FONT_FILES } from '@/theme';

SplashScreen.preventAutoHideAsync();
installCrashReporting();

/** A screen failed to draw: say so kindly, report it, and offer a way back. */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => {
    SplashScreen.hideAsync();
    reportError('render', error);
  }, [error]);
  return (
    <View style={s.error}>
      <Wordmark />
      <Eyebrow>Something went wrong</Eyebrow>
      <Text style={s.errorText}>A page didn&apos;t open as it should. We&apos;ve been told about it.</Text>
      <Button label="Try again" onPress={retry} />
    </View>
  );
}

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

const s = StyleSheet.create({
  error: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18, padding: GUTTER, backgroundColor: C.paper },
  errorText: { fontFamily: F.readItalic, fontSize: 20, lineHeight: 27, color: C.ink60, textAlign: 'center', maxWidth: 300 },
});
