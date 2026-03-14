import React, { useRef, useState } from 'react';
import { Animated, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../store/useAppStore';

export function Taskbar() {
  const insets = useSafeAreaInsets();
  const openModal = useAppStore((s) => s.openModal);
  const accounts = useAppStore((s) => s.accounts);
  const purposes = useAppStore((s) => s.purposes);
  const showToast = useAppStore((s) => s.showToast);
  const setActiveTab = useAppStore((s) => s.setActiveTab);

  const [subMenuOpen, setSubMenuOpen] = useState(false);
  const [taskbarHeight, setTaskbarHeight] = useState(80);
  const scaleAnim = useRef(new Animated.Value(0)).current;

  const openSubMenu = () => {
    setSubMenuOpen(true);
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 120,
      friction: 8,
    }).start();
  };

  const closeSubMenu = (callback?: () => void) => {
    Animated.timing(scaleAnim, {
      toValue: 0,
      duration: 100,
      useNativeDriver: true,
    }).start(() => {
      setSubMenuOpen(false);
      callback?.();
    });
  };

  const handleAccountTransactions = () => {
    if (subMenuOpen) {
      closeSubMenu();
    } else {
      openSubMenu();
    }
  };

  const handleDeposit = () => {
    closeSubMenu(() => {
      if (accounts.length === 0) return showToast('Add an account first');
      setActiveTab('accounts');
      openModal({ type: 'deposit' });
    });
  };

  const handleTransfer = () => {
    closeSubMenu(() => {
      if (accounts.length < 2) return showToast('Need at least 2 accounts to transfer between');
      setActiveTab('accounts');
      openModal({ type: 'accountTransfer' });
    });
  };

  const handleSpend = () => {
    closeSubMenu(() => {
      const eligible = accounts.filter((a) => a.total > 0);
      if (accounts.length === 0) return showToast('Add an account first');
      if (eligible.length === 0) return showToast('No accounts with balance to spend from');
      setActiveTab('accounts');
      openModal({ type: 'spend' });
    });
  };

  const handlePurposeTransfer = () => {
    if (purposes.length < 2) return showToast('Need at least 2 purposes to transfer between');
    setActiveTab('purposes');
    openModal({ type: 'purposeTransfer' });
  };

  const handleSettings = () => {
    // placeholder
  };

  return (
    <>
      <View
        style={[styles.container, { paddingBottom: insets.bottom + 8 }]}
        onLayout={(e) => setTaskbarHeight(e.nativeEvent.layout.height)}
      >
        <TouchableOpacity style={styles.btn} onPress={handleAccountTransactions}>
          <Ionicons name="cash-outline" size={24} color="#e2e8f0" />
          <Text style={styles.btnLabel}>Account</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btn} onPress={handlePurposeTransfer}>
          <Ionicons name="cube-outline" size={24} color="#e2e8f0" />
          <Text style={styles.btnLabel}>Re-tag</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btn} onPress={handleSettings}>
          <Ionicons name="settings-outline" size={24} color="#e2e8f0" />
          <Text style={styles.btnLabel}>Settings</Text>
        </TouchableOpacity>
      </View>

      <Modal transparent visible={subMenuOpen} onRequestClose={() => closeSubMenu()}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={() => closeSubMenu()}
        />
        <Animated.View
          style={[
            styles.subMenu,
            {
              bottom: taskbarHeight + insets.bottom,
              opacity: scaleAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <TouchableOpacity style={styles.subMenuItem} onPress={handleDeposit}>
            <View style={[styles.subMenuCircle, { backgroundColor: '#15803d' }]}>
              <Ionicons name="arrow-down-circle-outline" size={26} color="#16a34a" />
            </View>
            <Text style={styles.subMenuLabel}>Deposit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.subMenuItem} onPress={handleSpend}>
            <View style={[styles.subMenuCircle, { backgroundColor: '#991b1b' }]}>
              <Ionicons name="arrow-up-circle-outline" size={26} color="#ef4444" />
            </View>
            <Text style={styles.subMenuLabel}>Spend</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.subMenuItem} onPress={handleTransfer}>
            <View style={[styles.subMenuCircle, { backgroundColor: '#334155' }]}>
              <Ionicons name="swap-horizontal-outline" size={26} color="#94a3b8" />
            </View>
            <Text style={styles.subMenuLabel}>Transfer</Text>
          </TouchableOpacity>
        </Animated.View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#1a1a2e',
    paddingTop: 12,
    paddingHorizontal: 8,
  },
  btn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    gap: 4,
  },
  btnLabel: {
    color: '#e2e8f0',
    fontSize: 11,
    fontWeight: '500',
  },
  subMenu: {
    position: 'absolute',
    left: 0,
    right: 0,
    marginHorizontal: 40,
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#1a1a2e',
    borderRadius: 30,
    paddingVertical: 12,
    paddingHorizontal: 16,
    elevation: 8,
  },
  subMenuItem: {
    alignItems: 'center',
    gap: 6,
  },
  subMenuCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subMenuLabel: {
    color: '#e2e8f0',
    fontSize: 11,
    fontWeight: '500',
  },
});
