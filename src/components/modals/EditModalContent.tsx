import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useAppStore } from '../../store/useAppStore';
import { renameDimensionValue, deleteDimensionValue, setTargetAmount } from '../../db/queries';
import { DIM_ACCOUNTS, DIM_PURPOSE } from '../../constants';
import { parseDollars } from '../../utils/format';

export function EditModalContent() {
  const db = useSQLiteContext();
  const modal = useAppStore((s) => s.modal);
  const closeModal = useAppStore((s) => s.closeModal);
  const loadState = useAppStore((s) => s.loadState);
  const showToast = useAppStore((s) => s.showToast);
  const type = modal.payload?.type ?? 'account';
  const dvId = modal.payload?.dvId ?? 0;
  const currentLabel = modal.payload?.label ?? '';
  const currentTargetAmount = modal.payload?.targetAmount ?? 0;
  const dimId = type === 'account' ? DIM_ACCOUNTS : DIM_PURPOSE;
  const typeName = type === 'account' ? 'Account' : 'Purpose';

  const [label, setLabel] = useState(currentLabel);
  const [targetAmountStr, setTargetAmountStr] = useState(
    currentTargetAmount > 0 ? (currentTargetAmount / 100).toFixed(2) : ''
  );

  const handleSave = async () => {
    const trimmed = label.trim();
    if (!trimmed) return showToast('Name is required');
    try {
      await renameDimensionValue(db, dvId, dimId, trimmed);
      if (type === 'purpose') {
        const cents = parseDollars(targetAmountStr) ?? 0;
        await setTargetAmount(db, dvId, cents);
      }
      closeModal();
      await loadState(db);
    } catch (e: any) {
      showToast(e.message.includes('UNIQUE') ? 'Label already exists' : e.message);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      `Delete ${typeName}`,
      `Delete "${currentLabel}"?\n\nThis will permanently delete all its slices.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDimensionValue(db, dvId, dimId);
              closeModal();
              await loadState(db);
            } catch (e: any) {
              showToast(e.message);
            }
          },
        },
      ]
    );
  };

  return (
    <View>
      <Text style={styles.label}>Name</Text>
      <TextInput
        style={styles.input}
        value={label}
        onChangeText={setLabel}
        autoFocus
        selectTextOnFocus
        onSubmitEditing={handleSave}
        returnKeyType="done"
      />
      {type === 'purpose' && (
        <>
          <Text style={styles.label}>Target Amount</Text>
          <TextInput
            style={styles.input}
            placeholder="0.00 (optional)"
            value={targetAmountStr}
            onChangeText={setTargetAmountStr}
            keyboardType="decimal-pad"
            returnKeyType="done"
          />
        </>
      )}
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
          <Text style={styles.deleteText}>Delete {typeName}</Text>
        </TouchableOpacity>
        <View style={styles.rightActions}>
          <TouchableOpacity style={styles.cancelBtn} onPress={closeModal}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryBtn} onPress={handleSave}>
            <Text style={styles.primaryText}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 15,
    color: '#1e293b',
    backgroundColor: '#f8fafc',
    marginBottom: 16,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deleteBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 6,
    backgroundColor: '#fee2e2',
  },
  deleteText: {
    color: '#dc2626',
    fontWeight: '600',
    fontSize: 13,
  },
  rightActions: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  cancelText: {
    color: '#475569',
    fontWeight: '500',
  },
  primaryBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
    backgroundColor: '#3b82f6',
  },
  primaryText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});
