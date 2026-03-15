import React, { useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useAppStore } from '../../store/useAppStore';
import { createDimensionValue, setTargetAmount } from '../../db/queries';
import { DIM_ACCOUNTS, DIM_PURPOSE } from '../../constants';

export function AddModalContent() {
  const db = useSQLiteContext();
  const modal = useAppStore((s) => s.modal);
  const closeModal = useAppStore((s) => s.closeModal);
  const loadState = useAppStore((s) => s.loadState);
  const showToast = useAppStore((s) => s.showToast);
  const parse = useAppStore((s) => s.parse);

  const [label, setLabel] = useState('');
  const [targetAmountStr, setTargetAmountStr] = useState('');
  const inputRef = useRef<TextInput>(null);

  const type = modal.payload?.type ?? 'account';
  const typeName = type === 'account' ? 'Account' : 'Purpose';
  const dimId = type === 'account' ? DIM_ACCOUNTS : DIM_PURPOSE;

  const handleSubmit = async () => {
    const trimmed = label.trim();
    if (!trimmed) return showToast('Name is required');
    try {
      const newDvId = await createDimensionValue(db, dimId, trimmed);
      if (type === 'purpose') {
        const cents = parse(targetAmountStr) ?? 0;
        if (cents > 0) await setTargetAmount(db, newDvId, cents);
      }
      closeModal();
      await loadState(db);
    } catch (e: any) {
      showToast(e.message.includes('UNIQUE') ? 'Label already exists' : e.message);
    }
  };

  return (
    <View>
      <Text style={styles.label}>Name</Text>
      <TextInput
        ref={inputRef}
        style={styles.input}
        placeholder={`${typeName} name`}
        value={label}
        onChangeText={setLabel}
        autoFocus
        onSubmitEditing={handleSubmit}
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
      <View style={styles.actions}>
        <TouchableOpacity style={styles.cancelBtn} onPress={closeModal}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.primaryBtn} onPress={handleSubmit}>
          <Text style={styles.primaryText}>Add</Text>
        </TouchableOpacity>
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
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
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
