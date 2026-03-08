import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { useAppStore } from '../store/useAppStore';

export function AddBar() {
  const activeTab = useAppStore((s) => s.activeTab);
  const openModal = useAppStore((s) => s.openModal);

  const handleAdd = () => {
    openModal({ type: 'add', payload: { type: activeTab === 'accounts' ? 'account' : 'purpose' } });
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={handleAdd}>
        <Text style={styles.buttonText}>+ Add {activeTab === 'accounts' ? 'Account' : 'Purpose'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  button: {
    backgroundColor: '#3b82f6',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
});
