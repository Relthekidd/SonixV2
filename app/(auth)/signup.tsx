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
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/providers/AuthProvider';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Eye, EyeOff, Mail, Lock, User, FileText, CircleAlert as AlertCircle, Camera, CheckCircle } from 'lucide-react-native';

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [bio, setBio] = useState('');
  const [profilePicture, setProfilePicture] = useState<any>(null);
  const [selectedRole, setSelectedRole] = useState<'listener' | 'artist'>('listener');
  const [isPrivate, setIsPrivate] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { signup } = useAuth();

  const pickProfilePicture = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setProfilePicture(result.assets[0]);
      }
    } catch (error) {
      console.error('Error picking profile picture:', error);
      Alert.alert('Error', 'Failed to pick profile picture');
    }
  };

  const handleSignup = async () => {
    // Clear any previous messages
    setError(null);
    setSuccess(null);

    // Client-side validation
    if (!email?.trim() || !password || !confirmPassword || !displayName?.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    if (selectedRole === 'artist' && !bio?.trim()) {
      setError('Bio is required for artist accounts');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (!email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    try {
      console.log('🚀 Starting signup process from UI');
      
      const additionalData = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        bio: bio.trim(),
        isPrivate,
        profilePictureUrl: profilePicture?.uri,
      };

      await signup(email.trim(), password, displayName.trim(), selectedRole, additionalData);
      
      console.log('✅ Signup completed successfully');
      
      setSuccess('Account created successfully! Welcome to Sonix!');
      
      // Small delay to show success message
      setTimeout(() => {
        if (selectedRole === 'artist') {
          Alert.alert(
            'Application Submitted', 
            'Your artist application has been submitted and is pending admin approval. You will be notified once your application is reviewed.',
            [{ text: 'OK', onPress: () => router.replace('/(tabs)') }]
          );
        } else {
          router.replace('/(tabs)');
        }
      }, 1500);
      
    } catch (error) {
      console.error('❌ Signup failed in UI:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred during signup';
      setError(errorMessage);
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

            {/* Success Message */}
            {success && (
              <View style={styles.successContainer}>
                <CheckCircle color="#10b981" size={16} style={styles.successIcon} />
                <Text style={styles.successText}>{success}</Text>
              </View>
            )}

            {/* Error Display */}
            {error && (
              <View style={styles.errorContainer}>
                <AlertCircle color="#ef4444" size={16} style={styles.errorIcon} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Profile Picture */}
            <View style={styles.profilePictureSection}>
              <TouchableOpacity style={styles.profilePictureContainer} onPress={pickProfilePicture}>
                {profilePicture ? (
                  <Image source={{ uri: profilePicture.uri }} style={styles.profilePicture} />
                ) : (
                  <View style={styles.profilePicturePlaceholder}>
                    <User color="#8b5cf6" size={32} />
                  </View>
                )}
                <View style={styles.cameraButton}>
                  <Camera color="#ffffff" size={16} />
                </View>
              </TouchableOpacity>
              <Text style={styles.profilePictureLabel}>Profile Picture (Optional)</Text>
            </View>

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
              {/* Name Fields */}
              <View style={styles.nameRow}>
                <View style={[styles.inputContainer, styles.nameInput]}>
                  <User color="#8b5cf6" size={20} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="First Name"
                    placeholderTextColor="#64748b"
                    value={firstName}
                    onChangeText={setFirstName}
                    autoCapitalize="words"
                    editable={!isLoading}
                  />
                </View>

                <View style={[styles.inputContainer, styles.nameInput]}>
                  <TextInput
                    style={styles.input}
                    placeholder="Last Name"
                    placeholderTextColor="#64748b"
                    value={lastName}
                    onChangeText={setLastName}
                    autoCapitalize="words"
                    editable={!isLoading}
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <User color="#8b5cf6" size={20} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Display Name *"
                  placeholderTextColor="#64748b"
                  value={displayName}
                  onChangeText={setDisplayName}
                  autoCapitalize="words"
                  editable={!isLoading}
                />
              </View>

              <View style={styles.inputContainer}>
                <Mail color="#8b5cf6" size={20} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email *"
                  placeholderTextColor="#64748b"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  editable={!isLoading}
                />
              </View>

              {/* Bio for artists or optional for listeners */}
              <View style={styles.inputContainer}>
                <FileText color="#8b5cf6" size={20} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.bioInput]}
                  placeholder={selectedRole === 'artist' ? "Tell us about your music and artistic background... *" : "Bio (Optional)"}
                  placeholderTextColor="#64748b"
                  value={bio}
                  onChangeText={setBio}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  editable={!isLoading}
                />
              </View>

              <View style={styles.inputContainer}>
                <Lock color="#8b5cf6" size={20} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Password *"
                  placeholderTextColor="#64748b"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoComplete="new-password"
                  editable={!isLoading}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                  disabled={isLoading}
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
                  placeholder="Confirm Password *"
                  placeholderTextColor="#64748b"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoComplete="new-password"
                  editable={!isLoading}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeIcon}
                  disabled={isLoading}
                >
                  {showConfirmPassword ? (
                    <EyeOff color="#64748b" size={20} />
                  ) : (
                    <Eye color="#64748b" size={20} />
                  )}
                </TouchableOpacity>
              </View>

              {/* Privacy Setting */}
              <View style={styles.privacyContainer}>
                <TouchableOpacity
                  style={styles.checkboxContainer}
                  onPress={() => setIsPrivate(!isPrivate)}
                  disabled={isLoading}
                >
                  <View style={[styles.checkbox, isPrivate && styles.checkboxChecked]}>
                    {isPrivate && <Eye color="#ffffff" size={16} />}
                  </View>
                  <View style={styles.checkboxTextContainer}>
                    <Text style={styles.checkboxLabel}>Private Account</Text>
                    <Text style={styles.checkboxDescription}>
                      Require approval for followers to see your profile
                    </Text>
                  </View>
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
                style={[styles.signupButton, (isLoading || success) && styles.signupButtonDisabled]}
                onPress={handleSignup}
                disabled={isLoading || !!success}
              >
                <LinearGradient
                  colors={isLoading || success ? ['#64748b', '#64748b', '#64748b'] : ['#8b5cf6', '#a855f7', '#c084fc']}
                  style={styles.buttonGradient}
                >
                  <Text style={styles.signupButtonText}>
                    {isLoading 
                      ? 'Creating Account...' 
                      : success
                        ? 'Account Created!'
                        : selectedRole === 'artist' 
                          ? 'Submit Application' 
                          : 'Create Account'
                    }
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.loginContainer}>
                <Text style={styles.loginText}>Already have an account? </Text>
                <TouchableOpacity 
                  onPress={() => router.push('/(auth)/login')}
                  disabled={isLoading}
                >
                  <Text style={[styles.loginLink, isLoading && styles.loginLinkDisabled]}>Sign In</Text>
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
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  successIcon: {
    marginRight: 8,
  },
  successText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#10b981',
    lineHeight: 20,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorIcon: {
    marginRight: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#ef4444',
    lineHeight: 20,
  },
  profilePictureSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  profilePictureContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  profilePicture: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  profilePicturePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePictureLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#94a3b8',
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
  nameRow: {
    flexDirection: 'row',
    gap: 12,
  },
  nameInput: {
    flex: 1,
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
  privacyContainer: {
    marginTop: 8,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#64748b',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#8b5cf6',
    borderColor: '#8b5cf6',
  },
  checkboxTextContainer: {
    flex: 1,
  },
  checkboxLabel: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
    marginBottom: 2,
  },
  checkboxDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#94a3b8',
    lineHeight: 20,
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
  signupButtonDisabled: {
    opacity: 0.7,
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
  loginLinkDisabled: {
    opacity: 0.5,
  },
});