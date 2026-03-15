import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '../store/useAppStore';
import { TabBar } from '../components/TabBar';
import { AddBar } from '../components/AddBar';
import { EditModeRow } from '../components/EditModeRow';

export function EditModeScreen() {
  const insets = useSafeAreaInsets();
  const activeTab = useAppStore((s) => s.activeTab);
  const accounts = useAppStore((s) => s.accounts);
  const purposes = useAppStore((s) => s.purposes);
  const items = activeTab === 'accounts' ? accounts : purposes;
  const type = activeTab === 'accounts' ? 'account' : 'purpose';
  const movableCount = items.filter((i) => !i.isProtected).length;

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>Edit Mode</Text>
      </View>
      <TabBar />
      <AddBar />
      <ScrollView contentContainerStyle={{ paddingBottom: 8 }}>
        {items.map((item, index) => (
          <EditModeRow
            key={item.id}
            item={item}
            type={type}
            index={index}
            total={movableCount}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#c2410c',
    paddingBottom: 16,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
});
