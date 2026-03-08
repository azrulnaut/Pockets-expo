import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { DimensionRow } from './DimensionRow';

export function DimensionList() {
  const activeTab = useAppStore((s) => s.activeTab);
  const accounts = useAppStore((s) => s.accounts);
  const purposes = useAppStore((s) => s.purposes);

  const type = activeTab === 'accounts' ? 'account' : 'purpose';
  const items = activeTab === 'accounts' ? accounts : purposes;

  if (items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          None yet — tap + Add to create one.
        </Text>
      </View>
    );
  }

  return (
    <View>
      {items.map((item) => (
        <DimensionRow key={item.id} item={item} type={type} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
