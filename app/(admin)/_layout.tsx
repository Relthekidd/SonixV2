import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { router } from 'expo-router';

export default function AdminLayout() {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.replace('/(auth)/login');
      } else if (user.role !== 'admin') {
        router.replace('/(tabs)');
      }
    }
  }, [user, isLoading]);

  if (isLoading || !user || user.role !== 'admin') {
    return null;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="artists" />
    </Stack>
  );
}