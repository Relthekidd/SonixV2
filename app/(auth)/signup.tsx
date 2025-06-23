import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/providers/AuthProvider';
import { router } from 'expo-router';
import { Eye, EyeOff, Mail, Lock, User, FileText } from 'lucide-react-native';

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [selectedRole, setSelectedRole] = useState<'listener' | 'artist'>('listener');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { signup } = useAuth();

  const handleSignup = async () => {
    if (!email || !password || !confirmPassword || !displayName) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (selectedRole === 'artist' && !bio.trim()) {
      Alert.alert('Error', 'Bio is required for artist accounts');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    try {
      await signup(email, password, displayName, selectedRole);
      
      if (selectedRole === 'artist') {
        Alert.alert(
          'Application Submitted', 
          'Your artist application has been submitted and is pending admin approval. You will be notified once your application is reviewed.',
          [{ text: 'OK', onPress: () => router.replace('/(tabs)') }]
        );
      } else {
        router.replace('/(tabs)');
      }
    } catch (error) {
      Alert.alert('Signup Failed', 'An error occurred during signup');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#1a1a2e', '#16213e', '#0f3460']}
      style={styles.container}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join the Sonix community</Text>

            {/* Role Selection */}
            <View style={styles.roleSection}>
              <Text style={styles.roleLabel}>Account Type</Text>
              <View style={styles.roleContainer}>
                <TouchableOpacity
                  style={[
                    styles.roleOption,
                    selectedRole === 'listener' && styles.roleOptionSelected
                  ]}
                  onPress={() => setSelectedRole('listener')}
                >
                  <View style={[
                    styles.roleRadio,
                    selectedRole === 'listener' && styles.roleRadioSelected
                  ]}>
                    {selectedRole === 'listener' && <View style={styles.roleRadioDot} />}
                  </View>
                  <View style={styles.roleTextContainer}>
                    <Text style={styles.roleTitle}>Music Listener</Text>
                    <Text style={styles.roleDescription}>Discover and enjoy music</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.roleOption,
                    selectedRole === 'artist' && styles.roleOptionSelected
                  ]}
                  onPress={() => setSelectedRole('artist')}
                >
                  <View style={[
                    styles.roleRadio,
                    selectedRole === 'artist' && styles.roleRadioSelected
                  ]}>
                    {selectedRole === 'artist' && <View style={styles.roleRadioDot} />}
                  </View>
                  <View style={styles.roleTextContainer}>
                    <Text style={styles.roleTitle}>Artist</Text>
                    <Text style={styles.roleDescription}>Upload and share your music</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <User color="#8b5cf6" size={20} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Display Name"
                  placeholderTextColor="#64748b"
                  value={displayName}
                  onChangeText={setDisplayName}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.inputContainer}>
                <Mail color="#8b5cf6" size={20} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor="#64748b"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
              </View>

              {selectedRole === 'artist' && (
                <View style={styles.inputContainer}>
                  <FileText color="#8b5cf6" size={20} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, styles.bioInput]}
                    placeholder="Tell us about your music and artistic background..."
                    placeholderTextColor="#64748b"
                    value={bio}
                    onChangeText={setBio}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>
              )}

              <View style={styles.inputContainer}>
                <Lock color="#8b5cf6" size={20} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor="#64748b"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoComplete="new-password"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                >
                  {showPassword ? (
                    <EyeOff color="#64748b" size={20} />
                  ) : (
                    <Eye color="#64748b" size={20} />
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.inputContainer}>
                <Lock color="#8b5cf6" size={20} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Confirm Password"
                  placeholderTextColor="#64748b"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoComplete="new-password"
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeIcon}
                >
                  {showConfirmPassword ? (
                    <EyeOff color="#64748b" size={20} />
                  ) : (
                    <Eye color="#64748b" size={20} />
                  )}
                </TouchableOpacity>
              </View>

              {selectedRole === 'artist' && (
                <View style={styles.artistNotice}>
                  <Text style={styles.artistNoticeText}>
                    Artist accounts require admin approval. You'll be notified once your application is reviewed.
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.signupButton}
                onPress={handleSignup}
                disabled={isLoading}
              >
                <LinearGradient
                  colors={['#8b5cf6', '#a855f7', '#c084fc']}
                  style={styles.buttonGradient}
                >
                  <Text style={styles.signupButtonText}>
                    {isLoading 
                      ? 'Creating Account...' 
                      : selectedRole === 'artist' 
                        ? 'Submit Application' 
                        : 'Create Account'
                    }
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.loginContainer}>
                <Text style={styles.loginText}>Already have an account? </Text>
                <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                  <Text style={styles.loginLink}>Sign In</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  title: {
    fontSize: 32,
    fontFamily: 'Poppins-Bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 32,
  },
  roleSection: {
    marginBottom: 24,
  },
  roleLabel: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
    marginBottom: 12,
  },
  roleContainer: {
    gap: 12,
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  roleOptionSelected: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderColor: '#8b5cf6',
  },
  roleRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#64748b',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  roleRadioSelected: {
    borderColor: '#8b5cf6',
  },
  roleRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#8b5cf6',
  },
  roleTextContainer: {
    flex: 1,
  },
  roleTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
    marginBottom: 2,
  },
  roleDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#94a3b8',
  },
  form: {
    gap: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    minHeight: 56,
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
    paddingVertical: 12,
    minHeight: 80,
  },
  eyeIcon: {
    padding: 4,
  },
  artistNotice: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  artistNoticeText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#8b5cf6',
    textAlign: 'center',
    lineHeight: 20,
  },
  signupButton: {
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  buttonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  signupButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  loginText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#94a3b8',
  },
  loginLink: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#8b5cf6',
  },
});