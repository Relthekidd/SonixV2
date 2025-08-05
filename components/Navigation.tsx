import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { useRouter, useSegments, Href } from 'expo-router';
import { Home, Search, Library, User, type LucideIcon } from 'lucide-react-native';

// Define navigation items
const navItems: { icon: LucideIcon; label: string; id: string; path: Href }[] = [
  { icon: Home, label: 'Home', id: 'index', path: '/' },
  { icon: Search, label: 'Search', id: 'search', path: '/(tabs)/search' },
  { icon: Library, label: 'Library', id: 'library', path: '/(tabs)/library' },
  { icon: User, label: 'Profile', id: 'profile', path: '/(tabs)/profile' },
];

export function Navigation() {
  const router = useRouter();
  const segments = useSegments();
  // Determine active route by the last segment
  const activeTab =
    segments.length > 0 ? segments[segments.length - 1] : 'index';

  return (
    <View style={styles.container}>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <TouchableOpacity
            key={item.id}
            style={[styles.button, isActive && styles.activeButton]}
            onPress={() => router.push(item.path)}
            activeOpacity={0.7}
          >
            <Icon
              size={24}
              color={isActive ? '#fff' : '#888'}
              style={styles.icon}
            />
            <Text style={[styles.label, isActive && styles.activeLabel]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...Platform.select({
      web: {
        width: 256,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRightWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        paddingTop: 24,
        flexDirection: 'column',
      },
      default: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(255,255,255,0.1)',
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 8,
      },
    }),
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
  },
  activeButton: {
    backgroundColor: '#1f2937', // Tailwind slate-800
  },
  icon: {
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    color: '#888',
  },
  activeLabel: {
    color: '#fff',
    fontWeight: '600',
  },
});
