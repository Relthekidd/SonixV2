import { Tabs } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { useEffect } from 'react';
import { router } from 'expo-router';
import {
  Chrome as Home,
  Search,
  Library,
  User,
  Upload,
  Settings,
} from 'lucide-react-native';
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
    return null; // Or <LoadingScreen />
  }

  const screens = [
    { name: 'index', title: 'Home', icon: Home },
    { name: 'search', title: 'Search', icon: Search },
    { name: 'library', title: 'Library', icon: Library },
    { name: 'profile', title: 'Profile', icon: User },
  ];

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
        {screens.map(({ name, title, icon: Icon }) => (
          <Tabs.Screen
            key={name}
            name={name}
            options={{
              title,
              tabBarIcon: ({ size, color }) => (
                <Icon size={size} color={color} />
              ),
            }}
          />
        ))}
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