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

const navItems: { icon: LucideIcon; label: string; id: string; path: Href }[] = [
  { icon: Home,    label: 'Home',    id: 'index',   path: '/'         },
  { icon: Search,  label: 'Search',  id: 'search',  path: '/search'   },
  { icon: Library, label: 'Library', id: 'library', path: '/library'  },
  { icon: User,    label: 'Profile', id: 'profile', path: '/profile'  },
];

export function Navigation() {
  const router = useRouter();
  const segments = useSegments();
  const activeTab = segments.length > 0 ? segments[segments.length - 1] : 'index';

  return (
    <View style={[styles.container, styles.glassCard, styles.brutalBorder, styles.brutalShadow]}>
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
        position: 'fixed',
        bottom: 16,
        left: 16,
        width: 256,
        zIndex: 1000,
      },
      default: {
        position: 'absolute',
        bottom: 16,
        left: 16,
        right: 16,
        zIndex: 1000,
      },
    }),
    flexDirection: Platform.OS === 'web' ? 'column' : 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },

  // Neobrutalist card styles
  glassCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
  },
  brutalBorder: {
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  brutalShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
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
