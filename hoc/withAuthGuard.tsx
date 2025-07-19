import React from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import LoadingSpinner from '@/components/LoadingSpinner';

// Constrain P to object and return a React.FC for proper intrinsic attributes
export function withAuthGuard<P extends object>(
  Screen: React.ComponentType<P>
): React.FC<P> {
  const GuardedScreen: React.FC<P> = (props) => {
    const { user, isLoading } = useAuth();
    const router = useRouter();

    if (isLoading) {
      return <LoadingSpinner />;
    }
    if (!user) {
      router.replace('/(auth)/login');
      return null;
    }
    return <Screen {...props} />;
  };

  return GuardedScreen;
}
