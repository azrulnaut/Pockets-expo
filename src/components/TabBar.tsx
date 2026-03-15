import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../store/useAppStore';

export function TabBar() {
  const activeTab = useAppStore((s) => s.activeTab);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const activeScreen = useAppStore((s) => s.activeScreen);
  const activeColor = activeScreen === 'editMode' ? '#ea580c' : '#3b82f6';

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'accounts' && { borderBottomWidth: 2, borderBottomColor: activeColor }]}
        onPress={() => setActiveTab('accounts')}
      >
        <Ionicons name="wallet-outline" size={16} color={activeTab === 'accounts' ? activeColor : '#64748b'} />
        <Text style={[styles.tabText, activeTab === 'accounts' && { color: activeColor }]}>
          Accounts
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'purposes' && { borderBottomWidth: 2, borderBottomColor: activeColor }]}
        onPress={() => setActiveTab('purposes')}
      >
        <Ionicons name="cube-outline" size={16} color={activeTab === 'purposes' ? activeColor : '#64748b'} />
        <Text style={[styles.tabText, activeTab === 'purposes' && { color: activeColor }]}>
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
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#64748b',
  },
});
