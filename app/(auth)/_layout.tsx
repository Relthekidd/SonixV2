import React, { useEffect } from 'react';
import { Slot, useRouter } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';

export default function AuthLayout() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // Redirect logged-in users to the main tabs
  useEffect(() => {
    if (!isLoading && user) {
      router.replace('/(tabs)');
    }
  }, [isLoading, user]);

  // While loading or if already authenticated, don't render auth screens
  if (isLoading || user) {
    return null;
  }

  return <Slot />;
}
