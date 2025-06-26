import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Upload, Check } from 'lucide-react-native';

interface UploadProgressModalProps {
  visible: boolean;
  progress: number;
  isComplete: boolean;
  title: string;
  type: 'single' | 'album';
}

export function UploadProgressModal({
  visible,
  progress,
  isComplete,
  title,
  type,
}: UploadProgressModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <LinearGradient
            colors={['#1e293b', '#334155']}
            style={styles.modalGradient}
          >
            <View style={styles.iconContainer}>
              {isComplete ? (
                <Check color="#10b981" size={48} />
              ) : (
                <Upload color="#8b5cf6" size={48} />
              )}
            </View>

            <Text style={styles.modalTitle}>
              {isComplete ? 'Upload Complete!' : `Uploading ${type}...`}
            </Text>

            <Text style={styles.modalSubtitle} numberOfLines={2}>
              {title}
            </Text>

            {!isComplete && (
              <>
                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <View 
                      style={[
                        styles.progressFill,
                        { width: `${progress}%` }
                      ]} 
                    />
                  </View>
                  <Text style={styles.progressText}>{Math.round(progress)}%</Text>
                </View>

                <ActivityIndicator 
                  size="large" 
                  color="#8b5cf6" 
                  style={styles.spinner}
                />
              </>
            )}

            {isComplete && (
              <Text style={styles.successText}>
                Your {type} has been uploaded successfully and is now available!
              </Text>
            )}
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: '85%',
    maxWidth: 400,
    borderRadius: 20,
    overflow: 'hidden',
  },
  modalGradient: {
    padding: 32,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontFamily: 'Poppins-Bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 32,
  },
  progressContainer: {
    width: '100%',
    marginBottom: 24,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    marginBottom: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#8b5cf6',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#8b5cf6',
    textAlign: 'center',
  },
  spinner: {
    marginTop: 16,
  },
  successText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#10b981',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 16,
  },
});