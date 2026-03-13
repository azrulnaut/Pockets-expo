import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '../store/useAppStore';

export function Taskbar() {
  const insets = useSafeAreaInsets();
  const openModal = useAppStore((s) => s.openModal);
  const accounts = useAppStore((s) => s.accounts);
  const purposes = useAppStore((s) => s.purposes);
  const showToast = useAppStore((s) => s.showToast);

  const handleDeposit = () => {
    if (accounts.length === 0) return showToast('Add an account first');
    openModal({ type: 'deposit' });
  };

  const handleTransfer = () => {
    if (accounts.length < 2) return showToast('Need at least 2 accounts to transfer between');
    openModal({ type: 'accountTransfer' });
  };

  const handleSpend = () => {
    const eligible = accounts.filter((a) => a.total > 0);
    if (accounts.length === 0) return showToast('Add an account first');
    if (eligible.length === 0) return showToast('No accounts with balance to spend from');
    openModal({ type: 'spend' });
  };

  const handlePurposeTransfer = () => {
    if (purposes.length < 2) return showToast('Need at least 2 purposes to transfer between');
    openModal({ type: 'purposeTransfer' });
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 8 }]}>
      <TouchableOpacity style={styles.btn} onPress={handleDeposit}>
        <Text style={styles.btnText}>Deposit</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.btn} onPress={handleTransfer}>
        <Text style={styles.btnText}>Transfer</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.btn} onPress={handleSpend}>
        <Text style={styles.btnText}>Spend</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.btn} onPress={handlePurposeTransfer}>
        <Text style={styles.btnText}>Re-tag</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#1a1a2e',
    paddingTop: 15,
    paddingHorizontal: 8,
  },
  btn: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 15,
    backgroundColor: '#2d2d4e',
    borderRadius: 6,
    alignItems: 'center',
  },
  btnText: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '500',
  },
});
