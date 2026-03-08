import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { SliceRow } from '../types';
import { fmt } from '../utils/format';

interface Props {
  slice: SliceRow;
}

export function SliceSubRow({ slice }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{slice.other_label ?? '(untagged)'}</Text>
      <Text style={styles.amount}>{fmt(slice.amount)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingLeft: 40,
    paddingRight: 16,
    backgroundColor: '#f1f5f9',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  label: {
    fontSize: 13,
    color: '#475569',
  },
  amount: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
});
