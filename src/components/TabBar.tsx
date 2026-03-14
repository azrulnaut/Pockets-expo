import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../store/useAppStore';

export function TabBar() {
  const activeTab = useAppStore((s) => s.activeTab);
  const setActiveTab = useAppStore((s) => s.setActiveTab);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'accounts' && styles.activeTab]}
        onPress={() => setActiveTab('accounts')}
      >
        <Ionicons name="wallet-outline" size={16} color={activeTab === 'accounts' ? '#3b82f6' : '#64748b'} />
        <Text style={[styles.tabText, activeTab === 'accounts' && styles.activeTabText]}>
          Accounts
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'purposes' && styles.activeTab]}
        onPress={() => setActiveTab('purposes')}
      >
        <Ionicons name="cube-outline" size={16} color={activeTab === 'purposes' ? '#3b82f6' : '#64748b'} />
        <Text style={[styles.tabText, activeTab === 'purposes' && styles.activeTabText]}>
          Purposes
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#3b82f6',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#64748b',
  },
  activeTabText: {
    color: '#3b82f6',
  },
});
