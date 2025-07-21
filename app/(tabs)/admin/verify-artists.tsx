import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/providers/AuthProvider';
import AdminArtistsScreen from '../../(admin)/artists';

export default function VerifyArtistsScreen() {
  const { user } = useAuth();

  if ((user?.role as any) !== 'admin') {
    return (
      <LinearGradient colors={["#1a1a2e", "#16213e", "#0f3460"]} style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.text}>Access denied. Admin only.</Text>
        </View>
      </LinearGradient>
    );
  }

  return <AdminArtistsScreen />;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  text: { color: '#fff' },
});
