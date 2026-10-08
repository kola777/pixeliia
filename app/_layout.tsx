import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import 'react-native-reanimated';

import { EditorProvider } from '@/context/EditorContext';
import { colors } from '@/constants/theme';
import { registerServiceWorker } from '@/lib/registerServiceWorker';
import { ensureSignedIn } from '@/lib/supabase';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'onboarding',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
    // Anonymous identity for owned backend jobs; silent no-op in local mode.
    void ensureSignedIn().catch(() => {});
    // PWA shell worker; no-op on iOS/Android native builds.
    registerServiceWorker();
  }, []);

  return (
    <EditorProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShadowVisible: false,
          headerTintColor: colors.accent,
          headerTitleStyle: { color: colors.text, fontWeight: '700' },
          contentStyle: { backgroundColor: colors.background },
        }}>
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ title: 'Sign in' }} />
        <Stack.Screen name="privacy" options={{ title: 'Privacy' }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="editor/[toolId]" options={{ title: 'Edit' }} />
        <Stack.Screen name="export" options={{ title: 'Export' }} />
      </Stack>
    </EditorProvider>
  );
}
