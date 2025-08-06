import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from 'react-native';
import { MoreVertical, X } from 'lucide-react-native';

interface Props {
  onShare: () => void;
}

export default function AlbumMenu({ onShare }: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <>
      <TouchableOpacity onPress={() => setVisible(true)} style={styles.button}>
        <MoreVertical color="#94a3b8" size={20} />
      </TouchableOpacity>
      <Modal transparent visible={visible} animationType="fade">
        <View style={styles.overlay}>
          <View
            style={[styles.menu, styles.glassCard, styles.brutalBorder, styles.brutalShadow]}
          >
            <TouchableOpacity
              style={styles.close}
              onPress={() => setVisible(false)}
            >
              <X color="#fff" size={20} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                onShare();
                setVisible(false);
              }}
            >
              <Text style={styles.menuText}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => setVisible(false)}
            >
              <Text style={styles.menuText}>Save Album</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => setVisible(false)}
            >
              <Text style={styles.menuText}>Report</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: { padding: 8 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menu: {
    width: 220,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#1e293b',
  },
  close: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 4,
  },
  menuItem: { paddingVertical: 12 },
  menuText: {
    color: '#fff',
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
  },
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

