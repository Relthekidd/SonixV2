// app/(tabs)/_layout.tsx

import React, { useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Slot, useRouter } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { Navigation } from '@/components/Navigation';
import { MiniPlayer } from '@/components/MiniPlayer';

export default function RootLayout() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/(auth)/login');
    }
  }, [user, isLoading]);

  if (isLoading || !user) {
    return null; // or a <LoadingScreen />  
  }

  return (
    <View style={styles.container}>
      {/* Responsive Navigation (mobile bottom / desktop sidebar) */}
      <Navigation />

      {/* Main content area */}
      <View style={styles.content}>
        <Slot />
      </View>

      {/* Persistent MiniPlayer */}
      <MiniPlayer />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',              // nav + content side by side
    backgroundColor: '#0f172a',        // match your theme
  },
  content: {
    flex: 1,
    paddingBottom: Platform.OS === 'web' ? 0 : 80, // give room for MiniPlayer on native
  },
});
