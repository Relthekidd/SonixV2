import { Tabs } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { useEffect } from 'react';
import { router } from 'expo-router';
import { Chrome as Home, Search, Library, User, Upload } from 'lucide-react-native';
import { MiniPlayer } from '@/components/MiniPlayer';
import { View, StyleSheet } from 'react-native';

export default function TabLayout() {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/(auth)/login');
    }
  }, [user, isLoading]);

  if (isLoading || !user) {
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
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ size, color }) => (
              <Home size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="search"
          options={{
            title: 'Search',
            tabBarIcon: ({ size, color }) => (
              <Search size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="library"
          options={{
            title: 'Library',
            tabBarIcon: ({ size, color }) => (
              <Library size={size} color={color} />
            ),
          }}
        />
        {user.role === 'artist' && (
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