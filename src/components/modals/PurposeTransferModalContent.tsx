import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useAppStore } from '../../store/useAppStore';
import { getSlicesForDimensionValue } from '../../db/queries';
import { executePurposeTransfer } from '../../db/database';
import { fmt, parseDollars } from '../../utils/format';
import { DIM_ACCOUNTS } from '../../constants';

interface AccountSliceRow {
  accountDvId: number;
  accountLabel: string;
  available: number;
  value: string;
}

export function PurposeTransferModalContent() {
  const db = useSQLiteContext();
  const closeModal = useAppStore((s) => s.closeModal);
  const loadState = useAppStore((s) => s.loadState);
  const showToast = useAppStore((s) => s.showToast);
  const purposes = useAppStore((s) => s.purposes);

  const [sourceId, setSourceId] = useState(purposes[0]?.id ?? 0);
  const [targetId, setTargetId] = useState(purposes[1]?.id ?? 0);
  const [rows, setRows] = useState<AccountSliceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<'select' | 'grid'>('select');

  const sourcePurpose = purposes.find((p) => p.id === sourceId);
  const targetPurpose = purposes.find((p) => p.id === targetId);

  const handleContinue = async () => {
    if (sourceId === targetId) return showToast('Source and target must differ');
    if (!sourcePurpose || sourcePurpose.total <= 0) {
      return showToast(`${sourcePurpose?.label ?? 'Source'} has no balance to re-tag`);
    }
    setLoading(true);
    try {
      const slices = await getSlicesForDimensionValue(db, sourceId, DIM_ACCOUNTS);
      const eligible = slices.filter((s) => s.other_dv_id !== null && s.amount > 0);
      setRows(
        eligible.map((s) => ({
          accountDvId: s.other_dv_id!,
          accountLabel: s.other_label ?? '(unknown)',
          available: s.amount,
          value: '',
        }))
      );
      setPhase('grid');
    } catch (e: any) {
      showToast(e.message);
    } finally {
      setLoading(false);
    }
  };

  const totalCents = rows.reduce((sum, r) => sum + (parseDollars(r.value) ?? 0), 0);

  const handleConfirm = async () => {
    if (totalCents <= 0) return showToast('Enter at least one amount to re-tag');
    for (const r of rows) {
      const cents = parseDollars(r.value) ?? 0;
      if (cents > r.available) {
        return showToast(
          `Amount for ${r.accountLabel} exceeds available ${fmt(r.available)}`
        );
      }
    }
    const transfers = rows
      .map((r) => ({ accountDvId: r.accountDvId, amount: parseDollars(r.value) ?? 0 }))
      .filter((t) => t.amount > 0);

    try {
      await executePurposeTransfer(db, sourceId, targetId, transfers);
      closeModal();
      await loadState(db);
    } catch (e: any) {
      showToast(e.message);
    }
  };

  // Phase 1: pick source and target purpose
  if (phase === 'select') {
    return (
      <View>
        <Text style={styles.fieldLabel}>From purpose</Text>
        <ScrollView style={styles.list} nestedScrollEnabled>
          {purposes.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={[styles.item, sourceId === p.id && styles.itemSelected]}
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
        <ScrollView style={styles.list} nestedScrollEnabled>
          {purposes.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={[styles.item, targetId === p.id && styles.itemSelected]}
              onPress={() => setTargetId(p.id)}
            >
              <Text style={[styles.itemText, targetId === p.id && styles.itemTextSelected]}>
                {p.label}
              </Text>
              <Text style={styles.itemAmount}>{fmt(p.total)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.cancelBtn} onPress={closeModal}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.primaryBtn, loading && styles.disabledBtn]}
            onPress={handleContinue}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.primaryText}>Continue →</Text>
            }
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Phase 2: per-account slice grid
  return (
    <View>
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          From <Text style={styles.bold}>{sourcePurpose?.label}</Text>
          {'  →  '}
          <Text style={styles.bold}>{targetPurpose?.label}</Text>
        </Text>
      </View>

      {rows.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No account slices found in this purpose.</Text>
        </View>
      ) : (
        <>
          {rows.map((r) => (
            <View key={r.accountDvId} style={styles.gridRow}>
              <View style={styles.gridLabelCol}>
                <Text style={styles.gridLabel} numberOfLines={1}>{r.accountLabel}</Text>
                <Text style={styles.gridSub}>Available: {fmt(r.available)}</Text>
              </View>
              <TextInput
                style={styles.gridInput}
                keyboardType="decimal-pad"
                placeholder="0.00"
                value={r.value}
                onChangeText={(v) =>
                  setRows((prev) =>
                    prev.map((row) => row.accountDvId === r.accountDvId ? { ...row, value: v } : row)
                  )
                }
              />
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total to re-tag</Text>
            <Text style={styles.totalValue}>{fmt(totalCents)}</Text>
          </View>
        </>
      )}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.cancelBtn} onPress={closeModal}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.primaryBtn, totalCents <= 0 && styles.disabledBtn]}
          onPress={handleConfirm}
          disabled={totalCents <= 0}
        >
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
  list: {
    maxHeight: 120,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    backgroundColor: '#f8fafc',
  },
  item: {
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
  infoBox: {
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
    padding: 10,
    marginBottom: 12,
  },
  infoText: { fontSize: 13, color: '#475569' },
  bold: { fontWeight: '700', color: '#1e293b' },
  gridRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 4,
  },
  gridLabelCol: { flex: 1, marginRight: 8 },
  gridLabel: { fontSize: 13, fontWeight: '500', color: '#1e293b' },
  gridSub: { fontSize: 11, color: '#64748b' },
  gridInput: {
    width: 80,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
    fontSize: 13,
    textAlign: 'right',
    backgroundColor: '#ffffff',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: '#dcfce7',
    borderRadius: 6,
    marginTop: 4,
    marginBottom: 4,
  },
  totalLabel: { fontSize: 13, fontWeight: '600', color: '#475569' },
  totalValue: { fontSize: 13, fontWeight: '700', color: '#16a34a' },
  empty: {
    padding: 16,
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
    marginBottom: 12,
  },
  emptyText: { fontSize: 13, color: '#64748b', textAlign: 'center' },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 12,
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
  disabledBtn: { backgroundColor: '#94a3b8' },
  primaryText: { color: '#ffffff', fontWeight: '600' },
});
