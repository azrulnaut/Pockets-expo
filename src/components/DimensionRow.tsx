import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import type { DimensionValue } from '../types';
import { useAppStore } from '../store/useAppStore';
import { SliceSubRow } from './SliceSubRow';
import { fmt } from '../utils/format';

interface Props {
  item: DimensionValue;
  type: 'account' | 'purpose';
}

export function DimensionRow({ item, type }: Props) {
  const db = useSQLiteContext();
  const toggleExpand = useAppStore((s) => s.toggleExpand);
  const openModal = useAppStore((s) => s.openModal);
  const expandedAccounts = useAppStore((s) => s.expandedAccounts);
  const expandedPurposes = useAppStore((s) => s.expandedPurposes);
  const sliceCache = useAppStore((s) => s.sliceCache);

  const expandedSet = type === 'account' ? expandedAccounts : expandedPurposes;
  const isExpanded = expandedSet.has(item.id);
  const cacheKey = `${type === 'account' ? 'a' : 'p'}-${item.id}`;
  const slices = sliceCache[cacheKey];

  const handlePress = () => {
    toggleExpand(db, type, item.id);
  };

  const handleGear = () => {
    openModal({ type: 'edit', payload: { type, dvId: item.id, label: item.label } });
  };

  const handleAction = () => {
    if (type === 'account') {
      openModal({
        type: 'rebalance',
        payload: { dvId: item.id, label: item.label, currentTotal: item.total, mode: 'rebalance' },
      });
    }
  };

  return (
    <>
      <TouchableOpacity style={styles.row} onPress={handlePress} activeOpacity={0.7}>
        <Text style={styles.toggle}>{isExpanded ? '▼' : '▶'}</Text>
        <Text style={styles.label} numberOfLines={1}>{item.label}</Text>
        <Text style={styles.amount}>{fmt(item.total)}</Text>
        {type === 'account' && (
          <TouchableOpacity style={styles.actionBtn} onPress={handleAction}>
            <Text style={styles.actionBtnText}>Update</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.gearBtn} onPress={handleGear}>
          <Text style={styles.gearText}>⚙</Text>
        </TouchableOpacity>
      </TouchableOpacity>

      {isExpanded && (
        <View>
          {slices === undefined ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color="#94a3b8" />
            </View>
          ) : slices.length === 0 ? (
            <View style={styles.emptyRow}>
              <Text style={styles.emptyText}>No slices.</Text>
            </View>
          ) : (
            slices.map((s) => <SliceSubRow key={s.id} slice={s} />)
          )}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  toggle: {
    fontSize: 12,
    color: '#94a3b8',
    marginRight: 8,
    width: 14,
  },
  label: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#1e293b',
  },
  amount: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    marginRight: 8,
  },
  actionBtn: {
    backgroundColor: '#eff6ff',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 6,
  },
  actionBtnText: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '500',
  },
  gearBtn: {
    padding: 4,
  },
  gearText: {
    fontSize: 16,
    color: '#94a3b8',
  },
  loadingRow: {
    paddingVertical: 12,
    paddingLeft: 40,
    backgroundColor: '#f1f5f9',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  emptyRow: {
    paddingVertical: 10,
    paddingLeft: 40,
    backgroundColor: '#f1f5f9',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  emptyText: {
    fontSize: 13,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
});
