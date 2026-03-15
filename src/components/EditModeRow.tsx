import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';
import type { DimensionValue } from '../types';
import { useAppStore } from '../store/useAppStore';
import { swapDimensionValueOrder } from '../db/queries';

interface Props {
  item: DimensionValue;
  type: 'account' | 'purpose';
  index: number;
  total: number;
}

export function EditModeRow({ item, type, index, total }: Props) {
  const db = useSQLiteContext();
  const openModal = useAppStore((s) => s.openModal);
  const loadState = useAppStore((s) => s.loadState);
  const fmt = useAppStore((s) => s.fmt);

  const handleEdit = () => {
    openModal({
      type: 'edit',
      payload: { type, dvId: item.id, label: item.label, targetAmount: item.targetAmount, total: item.total },
    });
  };

  const handleMove = async (direction: 'up' | 'down') => {
    const neighbourIndex = direction === 'up' ? index - 1 : index + 1;
    await swapDimensionValueOrder(db, item.id, neighbourIndex, type);
    await loadState(db);
  };

  const canMoveUp = !item.isProtected && index > 0;
  const canMoveDown = !item.isProtected && index < total - 1;

  return (
    <View style={styles.row}>
      <View style={styles.moveButtons}>
        <TouchableOpacity
          onPress={() => handleMove('up')}
          disabled={!canMoveUp}
          style={[styles.moveBtn, { backgroundColor: canMoveUp ? '#ea580c' : '#fed7aa' }]}
        >
          <Ionicons name="chevron-up-outline" size={18} color="#ffffff" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleMove('down')}
          disabled={!canMoveDown}
          style={[styles.moveBtn, { backgroundColor: canMoveDown ? '#ea580c' : '#fed7aa' }]}
        >
          <Ionicons name="chevron-down-outline" size={18} color="#ffffff" />
        </TouchableOpacity>
      </View>
      <Text style={styles.label} numberOfLines={1}>{item.label}</Text>
      <Text style={styles.amount}>{fmt(item.total)}</Text>
      <TouchableOpacity style={styles.editBtn} onPress={handleEdit} disabled={item.isProtected}>
        <Text style={[styles.editBtnText, item.isProtected && styles.editBtnTextDisabled]}>Edit</Text>
      </TouchableOpacity>
    </View>
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
  moveButtons: {
    flexDirection: 'row',
    gap: 8,
    marginRight: 8,
  },
  moveBtn: {
    width: 29,
    height: 29,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#1e293b',
  },
  amount: {
    fontSize: 14,
    fontWeight: '500',
    color: '#94a3b8',
    marginRight: 12,
  },
  editBtn: {
    backgroundColor: '#fff7ed',
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  editBtnText: {
    fontSize: 12,
    color: '#ea580c',
    fontWeight: '500',
  },
  editBtnTextDisabled: {
    color: '#fdba74',
  },
});
