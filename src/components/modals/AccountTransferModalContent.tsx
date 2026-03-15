import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useAppStore } from '../../store/useAppStore';
import { getRebalanceCandidates } from '../../db/queries';
import { executeAccountTransfer } from '../../db/database';
import { fmt, parseDollars } from '../../utils/format';
import type { Transfer } from '../../types';
import { PurposeGrid, PurposeRowState } from './PurposeGrid';

export function AccountTransferModalContent() {
  const db = useSQLiteContext();
  const closeModal = useAppStore((s) => s.closeModal);
  const loadState = useAppStore((s) => s.loadState);
  const showToast = useAppStore((s) => s.showToast);
  const accounts = useAppStore((s) => s.accounts);

  const [sourceId, setSourceId] = useState(accounts[0]?.id ?? 0);
  const [targetId, setTargetId] = useState(accounts[1]?.id ?? 0);
  const [rows, setRows] = useState<PurposeRowState[]>([]);
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<'select' | 'grid'>('select');

  const sourceAccount = accounts.find((a) => a.id === sourceId);
  const targetAccount = accounts.find((a) => a.id === targetId);

  const handleContinue = async () => {
    if (sourceId === targetId) return showToast('Source and target must differ');
    if (!sourceAccount || sourceAccount.total <= 0)
      return showToast(`${sourceAccount?.label ?? 'Source'} has no balance to transfer`);

    setLoading(true);
    try {
      const data = await getRebalanceCandidates(db, sourceId, sourceAccount.total);
      const eligible = data.purposes.filter((p) => p.currentInAccount > 0);
      setRows(eligible.map((p) => ({ purpose: p, mode: '+', value: '' })));
      setPhase('grid');
    } catch (e: any) {
      showToast(e.message);
    } finally {
      setLoading(false);
    }
  };

  const totalCents = rows.reduce((sum, r) => {
    return sum + (parseDollars(r.value) ?? 0);
  }, 0);

  const handleConfirm = async () => {
    if (totalCents <= 0) return showToast('Enter at least one amount to transfer');

    const transfers: Transfer[] = [];
    for (const r of rows) {
      const cents = parseDollars(r.value) ?? 0;
      if (cents <= 0) continue;
      if (cents > r.purpose.currentInAccount) {
        showToast(
          `Transfer of ${fmt(cents)} exceeds available ${fmt(r.purpose.currentInAccount)} for ${r.purpose.label}`
        );
        return;
      }
      transfers.push({ purposeId: r.purpose.id, portion: cents });
    }
    if (transfers.length === 0) return;

    try {
      await executeAccountTransfer(db, sourceId, targetId, transfers);
      closeModal();
      await loadState(db);
    } catch (e: any) {
      showToast(e.message);
    }
  };

  if (phase === 'select') {
    return (
      <View>
        <Text style={styles.fieldLabel}>From account</Text>
        <ScrollView style={styles.accountList} nestedScrollEnabled>
          {accounts.map((a) => (
            <TouchableOpacity
              key={a.id}
              style={[styles.accountItem, sourceId === a.id && styles.accountItemSelected]}
              onPress={() => setSourceId(a.id)}
            >
              <Text style={[styles.accountItemText, sourceId === a.id && styles.accountItemTextSelected]}>
                {a.label}
              </Text>
              <Text style={styles.accountItemAmount}>{fmt(a.total)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <Text style={[styles.fieldLabel, { marginTop: 12 }]}>To account</Text>
        <ScrollView style={styles.accountList} nestedScrollEnabled>
          {accounts.map((a) => (
            <TouchableOpacity
              key={a.id}
              style={[styles.accountItem, targetId === a.id && styles.accountItemSelected]}
              onPress={() => setTargetId(a.id)}
            >
              <Text style={[styles.accountItemText, targetId === a.id && styles.accountItemTextSelected]}>
                {a.label}
              </Text>
              <Text style={styles.accountItemAmount}>{fmt(a.total)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={styles.actions}>
          <TouchableOpacity style={styles.cancelBtn} onPress={closeModal}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryBtn} onPress={handleContinue} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.primaryText}>Continue →</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View>
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          From <Text style={styles.bold}>{sourceAccount?.label}</Text> ({fmt(sourceAccount?.total ?? 0)})
          {'  →  '}
          <Text style={styles.bold}>{targetAccount?.label}</Text>
        </Text>
      </View>
      {rows.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No allocated purposes in this account to transfer.</Text>
        </View>
      ) : (
        <PurposeGrid
          rows={rows}
          onChangeValue={(id, v) =>
            setRows((prev) => prev.map((r) => (r.purpose.id === id ? { ...r, value: v } : r)))
          }
          onChangeMode={() => {}}
          showModeButtons={false}
          showMaxButton={false}
          remainder={-totalCents}
          remainderLabel="Total to transfer"
        />
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
  accountList: {
    maxHeight: 120,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    backgroundColor: '#f8fafc',
  },
  accountItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  accountItemSelected: {
    backgroundColor: '#dbeafe',
  },
  accountItemText: {
    fontSize: 14,
    color: '#1e293b',
  },
  accountItemTextSelected: {
    color: '#1d4ed8',
    fontWeight: '600',
  },
  accountItemAmount: {
    fontSize: 14,
    color: '#64748b',
  },
  infoBox: {
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
    padding: 10,
    marginBottom: 12,
  },
  infoText: { fontSize: 13, color: '#475569' },
  bold: { fontWeight: '700', color: '#1e293b' },
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
