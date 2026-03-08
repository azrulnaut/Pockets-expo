import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { fmt } from '../utils/format';

export function BalanceHeader() {
  const fund = useAppStore((s) => s.fund);

  return (
    <View style={styles.container}>
      <Text style={styles.name}>{fund?.name ?? 'Pockets'}</Text>
      <Text style={styles.total}>{fmt(fund?.total_amount ?? 0)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a2e',
    paddingTop: 48,
    paddingBottom: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  name: {
    color: '#a0aec0',
    fontSize: 14,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  total: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: 'bold',
  },
});
