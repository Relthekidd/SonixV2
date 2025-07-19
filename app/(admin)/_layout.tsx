import React, { useEffect } from 'react';
import { Slot, useRouter } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';

export default function AdminLayout() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // Redirect non-admins or unauthenticated users
  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.replace('/(auth)/login');
      } else if (user.role !== 'admin') {
        router.replace('/(tabs)');
      }
    }
  }, [isLoading, user]);

  // Show nothing while checking auth or if not allowed
  if (isLoading || !user || user.role !== 'admin') {
    return null;
  }

  // Render nested admin routes
  return <Slot />;
}
