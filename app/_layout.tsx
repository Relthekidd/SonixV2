import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { FontProvider } from '@/providers/FontProvider';
import { AuthProvider } from '@/providers/AuthProvider';
import { MusicProvider } from '@/providers/MusicProvider';

export default function RootLayout() {
  useFrameworkReady();

  return (
    <FontProvider>
      <AuthProvider>
        <MusicProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="player" options={{ 
              headerShown: false,
              presentation: 'modal',
              animation: 'slide_from_bottom'
            }} />
            <Stack.Screen name="+not-found" />
          </Stack>
          <StatusBar style="light" />
        </MusicProvider>
      </AuthProvider>
    </FontProvider>
  );
}