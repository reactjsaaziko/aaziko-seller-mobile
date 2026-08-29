import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as Network from 'expo-network';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import 'react-native-reanimated';

import AazikoSplash from '@/components/aaziko-splash';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { processQueue } from '@/lib/upload-queue';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [splashDone, setSplashDone] = useState(false);

  // App-wide: upload any queued (offline-captured) media whenever the app opens,
  // comes to the foreground, or the internet comes back.
  useEffect(() => {
    processQueue();
    const appSub = AppState.addEventListener('change', (s) => {
      if (s === 'active') processQueue();
    });
    const netSub = Network.addNetworkStateListener((e) => {
      if (e.isConnected && e.isInternetReachable !== false) processQueue();
    });
    return () => {
      appSub.remove();
      netSub.remove();
    };
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        {/* Login is the entry screen ("/") — the app opens here */}
        <Stack.Screen name="index" options={{ headerShown: false }} />
        {/* Orders list — where the vendor lands after login */}
        <Stack.Screen name="orders" options={{ headerShown: false }} />
        {/* Order detail — opened when a vendor taps an order */}
        <Stack.Screen name="order-detail" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
      {/* Aaziko logo splash shown on top when the app opens */}
      {!splashDone && <AazikoSplash onDone={() => setSplashDone(true)} />}
    </ThemeProvider>
  );
}
