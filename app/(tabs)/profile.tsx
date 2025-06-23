import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  Switch,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/providers/AuthProvider';
import { 
  Edit3, 
  Settings, 
  LogOut, 
  User, 
  Mail, 
  Eye, 
  EyeOff,
  Camera,
  Save,
  X
} from 'lucide-react-native';

export default function ProfileScreen() {
  const { user, logout, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState({
    displayName: user?.displayName || '',
    bio: user?.bio || '',
    isPublic: user?.isPublic || false,
    showFavoriteStats: user?.showFavoriteStats || false,
  });

  const handleSaveProfile = async () => {
    try {
      await updateProfile(editedProfile);
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', onPress: logout, style: 'destructive' },
      ]
    );
  };

  const stats = [
    { label: 'Playlists', value: '12' },
    { label: 'Followers', value: '248' },
    { label: 'Following', value: '156' },
  ];

  return (
    <LinearGradient
      colors={['#1a1a2e', '#16213e', '#0f3460']}
      style={styles.container}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => setIsEditing(!isEditing)}
          >
            {isEditing ? (
              <X color="#ffffff" size={24} />
            ) : (
              <Edit3 color="#ffffff" size={24} />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <Image 
              source={{ 
                uri: user?.avatar || 'https://images.pexels.com/photos/771742/pexels-photo-771742.jpeg?auto=compress&cs=tinysrgb&w=400' 
              }} 
              style={styles.avatar} 
            />
            {isEditing && (
              <TouchableOpacity style={styles.cameraButton}>
                <Camera color="#ffffff" size={20} />
              </TouchableOpacity>
            )}
          </View>

          {isEditing ? (
            <View style={styles.editForm}>
              <View style={styles.inputContainer}>
                <User color="#8b5cf6" size={20} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Display Name"
                  placeholderTextColor="#64748b"
                  value={editedProfile.displayName}
                  onChangeText={(text) => setEditedProfile(prev => ({ ...prev, displayName: text }))}
                />
              </View>

              <View style={styles.inputContainer}>
                <TextInput
                  style={[styles.input, styles.bioInput]}
                  placeholder="Bio"
                  placeholderTextColor="#64748b"
                  value={editedProfile.bio}
                  onChangeText={(text) => setEditedProfile(prev => ({ ...prev, bio: text }))}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.switchContainer}>
                <Text style={styles.switchLabel}>Public Profile</Text>
                <Switch
                  value={editedProfile.isPublic}
                  onValueChange={(value) => setEditedProfile(prev => ({ ...prev, isPublic: value }))}
                  trackColor={{ false: '#374151', true: '#8b5cf6' }}
                  thumbColor={editedProfile.isPublic ? '#ffffff' : '#9ca3af'}
                />
              </View>

              <View style={styles.switchContainer}>
                <Text style={styles.switchLabel}>Show Favorite Stats</Text>
                <Switch
                  value={editedProfile.showFavoriteStats}
                  onValueChange={(value) => setEditedProfile(prev => ({ ...prev, showFavoriteStats: value }))}
                  trackColor={{ false: '#374151', true: '#8b5cf6' }}
                  thumbColor={editedProfile.showFavoriteStats ? '#ffffff' : '#9ca3af'}
                />
              </View>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveProfile}
              >
                <LinearGradient
                  colors={['#8b5cf6', '#a855f7']}
                  style={styles.saveButtonGradient}
                >
                  <Save color="#ffffff" size={20} style={styles.saveIcon} />
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={styles.displayName}>{user?.displayName}</Text>
              <Text style={styles.email}>{user?.email}</Text>
              {user?.bio && <Text style={styles.bio}>{user.bio}</Text>}

              <View style={styles.statsContainer}>
                {stats.map((stat, index) => (
                  <View key={index} style={styles.statItem}>
                    <Text style={styles.statValue}>{stat.value}</Text>
                    <Text style={styles.statLabel}>{stat.label}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>

        {!isEditing && (
          <View style={styles.menuSection}>
            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuItemContent}>
                <Settings color="#8b5cf6" size={24} />
                <Text style={styles.menuItemText}>Settings</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuItemContent}>
                <Eye color="#8b5cf6" size={24} />
                <Text style={styles.menuItemText}>Privacy</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.menuItem}
              onPress={handleLogout}
            >
              <View style={styles.menuItemContent}>
                <LogOut color="#ef4444" size={24} />
                <Text style={[styles.menuItemText, styles.logoutText]}>Logout</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#8b5cf6',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  displayName: {
    fontSize: 24,
    fontFamily: 'Poppins-Bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  email: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#94a3b8',
    marginBottom: 12,
  },
  bio: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#cbd5e1',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 40,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontFamily: 'Poppins-Bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#94a3b8',
  },
  editForm: {
    width: '100%',
    gap: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#ffffff',
  },
  bioInput: {
    textAlignVertical: 'top',
    paddingTop: 16,
    paddingBottom: 16,
    height: 80,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  switchLabel: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#ffffff',
  },
  saveButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  saveIcon: {
    marginRight: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
  },
  menuSection: {
    paddingHorizontal: 24,
  },
  menuItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  menuItemText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#ffffff',
    marginLeft: 16,
  },
  logoutText: {
    color: '#ef4444',
  },
  bottomPadding: {
    height: 120,
  },
});