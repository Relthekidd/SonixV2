import { Tabs } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { useEffect } from 'react';
import { router } from 'expo-router';
import { Chrome as Home, Search, Library, User, Upload, Settings } from 'lucide-react-native';
import { MiniPlayer } from '@/components/MiniPlayer';
import { View, StyleSheet } from 'react-native';

export default function TabLayout() {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/(auth)/login');
    }
  }, [user, isLoading]);

  if (isLoading) {
  return null; // Or <LoadingScreen />
}

if (!user) {
  router.replace('/(auth)/login');
  return null;
}


  return (
    <View style={styles.container}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#0f172a',
            borderTopWidth: 1,
            borderTopColor: 'rgba(139, 92, 246, 0.2)',
            height: 80,
            paddingBottom: 20,
            paddingTop: 10,
          },
          tabBarActiveTintColor: '#8b5cf6',
          tabBarInactiveTintColor: '#64748b',
          tabBarLabelStyle: {
            fontSize: 12,
            fontFamily: 'Inter-Medium',
          },
        }}
      >
        {/* Home tab - visible to all users */}
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ size, color }) => (
              <Home size={size} color={color} />
            ),
          }}
        />
        
        {/* Search tab - visible to all users */}
        <Tabs.Screen
          name="search"
          options={{
            title: 'Search',
            tabBarIcon: ({ size, color }) => (
              <Search size={size} color={color} />
            ),
          }}
        />
        
        {/* Library tab - visible to all users */}
        <Tabs.Screen
          name="library"
          options={{
            title: 'Library',
            tabBarIcon: ({ size, color }) => (
              <Library size={size} color={color} />
            ),
          }}
        />
        
        {/* Artist Dashboard - only visible to verified artists (NOT admins) */}
        {user.role === 'artist' && user.artistVerified && (
          <Tabs.Screen
            name="artist-dashboard"
            options={{
              title: 'Upload',
              tabBarIcon: ({ size, color }) => (
                <Upload size={size} color={color} />
              ),
            }}
          />
        )}
        
        {/* Admin Dashboard - only visible to admins */}
        {user.role === 'admin' && (
          <Tabs.Screen
            name="admin"
            options={{
              title: 'Admin',
              tabBarIcon: ({ size, color }) => (
                <Settings size={size} color={color} />
              ),
            }}
          />
        )}
        
        {/* Profile tab - visible to all users */}
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ size, color }) => (
              <User size={size} color={color} />
            ),
          }}
        />
      </Tabs>
      <MiniPlayer />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
});