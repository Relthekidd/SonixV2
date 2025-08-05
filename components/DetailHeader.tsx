import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';

interface Props {
  title: string;
  onBack: () => void;
  right?: React.ReactNode;
}

export default function DetailHeader({ title, onBack, right }: Props) {
  return (
    <View
      style={[
        styles.header,
        styles.glassCard,
        styles.brutalBorder,
        styles.brutalShadow,
      ]}
    >
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <ArrowLeft color="#fff" size={24} />
      </TouchableOpacity>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.right}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    marginBottom: 16,
  },
  backButton: { padding: 8 },
  title: {
    flex: 1,
    textAlign: 'center',
    color: '#fff',
    fontFamily: 'Poppins-Bold',
    fontSize: 20,
  },
  right: { width: 32, alignItems: 'flex-end' },
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
});
