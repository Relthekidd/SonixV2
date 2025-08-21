import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/providers/AuthProvider';
import { router } from 'expo-router';
import {
  Mail,
  ArrowLeft,
  CircleAlert as AlertCircle,
  CircleCheck as CheckCircle,
} from 'lucide-react-native';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { resetPassword } = useAuth();

  const handleResetPassword = async () => {
    setError(null);

    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    if (!email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    try {
      await resetPassword(email.trim());
      setEmailSent(true);
    } catch (error: unknown) {
      const err = error as Error;
      console.error('Reset password error:', err);
      setError(err.message || 'Failed to send reset email');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#1a1a2e', '#16213e', '#0f3460']}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ArrowLeft color="#ffffff" size={24} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {!emailSent ? (
          <>
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>
              Enter your email address and we&apos;ll send you a link to reset your
              password
            </Text>

            {/* Error Display */}
            {error && (
              <View style={styles.errorContainer}>
                <AlertCircle
                  color="#ef4444"
                  size={16}
                  style={styles.errorIcon}
                />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <View style={styles.form}>
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
                  editable={!isLoading}
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.resetButton,
                  isLoading && styles.resetButtonDisabled,
                ]}
                onPress={handleResetPassword}
                disabled={isLoading}
              >
                <LinearGradient
                  colors={
                    isLoading
                      ? ['#64748b', '#64748b', '#64748b']
                      : ['#8b5cf6', '#a855f7', '#c084fc']
                  }
                  style={styles.buttonGradient}
                >
                  <Text style={styles.resetButtonText}>
                    {isLoading ? 'Sending...' : 'Send Reset Link'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <View style={styles.successContainer}>
              <CheckCircle color="#10b981" size={64} />
              <Text style={styles.successTitle}>Check Your Email</Text>
              <Text style={styles.successSubtitle}>
                We&apos;ve sent a password reset link to
              </Text>
              <Text style={styles.emailText}>{email}</Text>
              <Text style={styles.instructionText}>
                  Click the link in the email to reset your password. If you don&apos;t
                see the email, check your spam folder.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.resetButton}
              onPress={() => router.push('/(auth)/login')}
            >
              <LinearGradient
                colors={['#8b5cf6', '#a855f7', '#c084fc']}
                style={styles.buttonGradient}
              >
                <Text style={styles.resetButtonText}>Back to Login</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.resendButton}
              onPress={() => {
                setEmailSent(false);
                setEmail('');
              }}
            >
              <Text style={styles.resendButtonText}>
                  Didn&apos;t receive the email? Try again
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Poppins-Bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
    lineHeight: 24,
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
  form: {
    gap: 24,
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
  resetButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  resetButtonDisabled: {
    opacity: 0.7,
  },
  buttonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
  },
  successContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  successTitle: {
    fontSize: 24,
    fontFamily: 'Poppins-Bold',
    color: '#ffffff',
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  successSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 8,
  },
  emailText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#8b5cf6',
    textAlign: 'center',
    marginBottom: 16,
  },
  instructionText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
  },
  resendButton: {
    marginTop: 16,
    paddingVertical: 12,
  },
  resendButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#8b5cf6',
    textAlign: 'center',
  },
});
