import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useAppStore } from '../../store/useAppStore';
import { getPurposeTotal } from '../../db/queries';
import { executePurposeTransfer } from '../../db/database';
import { fmt, parseDollars } from '../../utils/format';

export function PurposeTransferModalContent() {
  const db = useSQLiteContext();
  const closeModal = useAppStore((s) => s.closeModal);
  const loadState = useAppStore((s) => s.loadState);
  const showToast = useAppStore((s) => s.showToast);
  const invalidateSliceCache = useAppStore((s) => s.invalidateSliceCache);
  const purposes = useAppStore((s) => s.purposes);

  const [sourceId, setSourceId] = useState(purposes[0]?.id ?? 0);
  const [targetId, setTargetId] = useState(purposes[1]?.id ?? 0);
  const [amountStr, setAmountStr] = useState('');

  const sourcePurpose = purposes.find((p) => p.id === sourceId);
  const targetPurpose = purposes.find((p) => p.id === targetId);

  const handleConfirm = async () => {
    if (sourceId === targetId) return showToast('Source and target must differ');
    const amountCents = parseDollars(amountStr);
    if (!amountCents || amountCents <= 0) return showToast('Enter a valid amount');

    try {
      const sourceTotal = await getPurposeTotal(db, sourceId);
      if (amountCents > sourceTotal) {
        return showToast(`Insufficient balance: ${fmt(sourceTotal)} available`);
      }
      await executePurposeTransfer(db, sourceId, targetId, amountCents);
      invalidateSliceCache();
      closeModal();
      await loadState(db);
    } catch (e: any) {
      showToast(e.message);
    }
  };

  return (
    <View>
      <Text style={styles.fieldLabel}>From purpose</Text>
      <ScrollView style={styles.purposeList} nestedScrollEnabled>
        {purposes.map((p) => (
          <TouchableOpacity
            key={p.id}
            style={[styles.purposeItem, sourceId === p.id && styles.itemSelected]}
            onPress={() => setSourceId(p.id)}
          >
            <Text style={[styles.itemText, sourceId === p.id && styles.itemTextSelected]}>
              {p.label}
            </Text>
            <Text style={styles.itemAmount}>{fmt(p.total)}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={[styles.fieldLabel, { marginTop: 12 }]}>To purpose</Text>
      <ScrollView style={styles.purposeList} nestedScrollEnabled>
        {purposes.map((p) => (
          <TouchableOpacity
            key={p.id}
            style={[styles.purposeItem, targetId === p.id && styles.itemSelected]}
            onPress={() => setTargetId(p.id)}
          >
            <Text style={[styles.itemText, targetId === p.id && styles.itemTextSelected]}>
              {p.label}
            </Text>
            <Text style={styles.itemAmount}>{fmt(p.total)}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Amount ($)</Text>
      {sourcePurpose && (
        <Text style={styles.hint}>Available: {fmt(sourcePurpose.total)}</Text>
      )}
      <TextInput
        style={styles.input}
        keyboardType="decimal-pad"
        placeholder="0.00"
        value={amountStr}
        onChangeText={setAmountStr}
        returnKeyType="done"
      />

      <View style={styles.actions}>
        <TouchableOpacity style={styles.cancelBtn} onPress={closeModal}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.primaryBtn} onPress={handleConfirm}>
          <Text style={styles.primaryText}>Confirm</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 4,
  },
  hint: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 6,
  },
  purposeList: {
    maxHeight: 120,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    backgroundColor: '#f8fafc',
  },
  purposeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  itemSelected: { backgroundColor: '#dbeafe' },
  itemText: { fontSize: 14, color: '#1e293b' },
  itemTextSelected: { color: '#1d4ed8', fontWeight: '600' },
  itemAmount: { fontSize: 14, color: '#64748b' },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 15,
    color: '#1e293b',
    backgroundColor: '#f8fafc',
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 4,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  cancelText: { color: '#475569', fontWeight: '500' },
  primaryBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
    backgroundColor: '#3b82f6',
  },
  primaryText: { color: '#ffffff', fontWeight: '600' },
});
