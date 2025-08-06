import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/services/supabase';
import { ArrowLeft } from 'lucide-react-native';

export default function ProfileSettings() {
  const { user, logout } = useAuth();
  const [isPrivate, setIsPrivate] = useState(user?.is_private ?? false);

  const togglePrivacy = async () => {
    if (!user) return;
    const newValue = !isPrivate;
    setIsPrivate(newValue);
    await supabase.from('profiles').update({ is_private: newValue }).eq('id', user.id);
  };

  return (
    <LinearGradient colors={['#0f172a', '#1e293b', '#0f172a']} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings & Account</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity
          style={[styles.item, styles.glassCard, styles.brutalBorder, styles.brutalShadow]}
          onPress={() => router.push('/profile?edit=true' as const)}
        >
          <Text style={styles.itemText}>Edit Profile</Text>
        </TouchableOpacity>
        <View
          style={[styles.item, styles.row, styles.glassCard, styles.brutalBorder, styles.brutalShadow]}
        >
          <Text style={styles.itemText}>Private Account</Text>
          <Switch value={isPrivate} onValueChange={togglePrivacy} />
        </View>
        <TouchableOpacity
          style={[styles.item, styles.glassCard, styles.brutalBorder, styles.brutalShadow]}
          onPress={() => router.push('/profile/requests' as const)}
        >
          <Text style={styles.itemText}>Manage Follow Requests</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.item, styles.glassCard, styles.brutalBorder, styles.brutalShadow]}
        >
          <Text style={styles.itemText}>Notifications</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.item, styles.glassCard, styles.brutalBorder, styles.brutalShadow]}
        >
          <Text style={styles.itemText}>Preferences</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 16,
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    left: 16,
    top: 50,
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-Bold',
    color: '#fff',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  item: {
    padding: 16,
    borderRadius: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#fff',
  },
  logoutButton: {
    marginTop: 32,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#ef4444',
    alignItems: 'center',
  },
  logoutText: {
    color: '#fff',
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
  },
  glassCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
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
});
