import React, { useCallback, useEffect, useState } from 'react';
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
import { getRebalanceCandidates } from '../../db/queries';
import { executeAccountRebalance } from '../../db/database';
import { fmt, parseDollars } from '../../utils/format';
import type { RebalanceCandidate, Transfer } from '../../types';
import { PurposeGrid, PurposeMode, PurposeRowState } from './PurposeGrid';

export function RebalanceModalContent() {
  const db = useSQLiteContext();
  const modal = useAppStore((s) => s.modal);
  const closeModal = useAppStore((s) => s.closeModal);
  const loadState = useAppStore((s) => s.loadState);
  const showToast = useAppStore((s) => s.showToast);
  const invalidateSliceCache = useAppStore((s) => s.invalidateSliceCache);

  const dvId = modal.payload?.dvId ?? 0;
  const label = modal.payload?.label ?? '';
  const currentTotal = modal.payload?.currentTotal ?? 0;
  const modalMode = modal.payload?.mode ?? 'rebalance'; // 'rebalance' | 'deposit' | 'spend'

  // For deposit/spend, we collect amount first then derive newTotal
  const [amountStr, setAmountStr] = useState('');
  const [newTotalStr, setNewTotalStr] = useState(
    modalMode === 'rebalance' ? (currentTotal / 100).toFixed(2) : ''
  );
  const [candidates, setCandidates] = useState<{
    delta: number;
    currentTotal: number;
    newTotal: number;
    purposes: RebalanceCandidate[];
  } | null>(null);
  const [rows, setRows] = useState<PurposeRowState[]>([]);
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<'amount' | 'grid'>(
    modalMode === 'rebalance' ? 'grid' : 'amount'
  );

  const fetchCandidates = useCallback(
    async (nt: number) => {
      setLoading(true);
      try {
        const data = await getRebalanceCandidates(db, dvId, nt);
        setCandidates(data);
        const defaultMode: PurposeMode = data.delta < 0 ? '-' : '+';
        setRows(
          data.purposes.map((p) => ({ purpose: p, mode: defaultMode, value: '' }))
        );
      } catch (e: any) {
        showToast(e.message);
      } finally {
        setLoading(false);
      }
    },
    [db, dvId, showToast]
  );

  // Load grid immediately for rebalance mode
  useEffect(() => {
    if (modalMode === 'rebalance') {
      const nt = parseDollars(newTotalStr);
      if (nt !== null) fetchCandidates(nt);
    }
  }, []);

  const handleNewTotalChange = (v: string) => {
    setNewTotalStr(v);
    const cents = parseDollars(v);
    if (cents !== null && candidates) {
      setCandidates((prev) =>
        prev ? { ...prev, delta: cents - prev.currentTotal, newTotal: cents } : prev
      );
      const delta = cents - currentTotal;
      const defaultMode: PurposeMode = delta < 0 ? '-' : '+';
      setRows((prev) => prev.map((r) => ({ ...r, mode: defaultMode, value: '' })));
    }
  };

  const handleContinue = async () => {
    const amountCents = parseDollars(amountStr);
    if (!amountCents || amountCents <= 0) return showToast('Enter a valid amount');
    if (modalMode === 'spend' && amountCents > currentTotal) {
      return showToast(`Cannot spend more than ${fmt(currentTotal)}`);
    }
    const nt = modalMode === 'deposit' ? currentTotal + amountCents : currentTotal - amountCents;
    await fetchCandidates(nt);
    setPhase('grid');
  };

  const portionSum = rows.reduce((sum, r) => {
    const cents = parseDollars(r.value) ?? 0;
    return sum + (r.mode === '+' ? cents : -cents);
  }, 0);

  const delta = candidates?.delta ?? 0;
  const remainder = delta - portionSum;

  const handleConfirm = async () => {
    if (!candidates) return;
    if (remainder !== 0) return showToast('Remaining must be zero before confirming');

    const transfers: Transfer[] = rows
      .map((r) => {
        const cents = parseDollars(r.value) ?? 0;
        if (cents === 0) return null;
        return { purposeId: r.purpose.id, portion: r.mode === '+' ? cents : -cents };
      })
      .filter((t): t is Transfer => t !== null);

    if (transfers.length === 0 && delta !== 0) return showToast('No allocations entered');

    // Validate: reductions must not exceed available
    for (const t of transfers.filter((t) => t.portion < 0)) {
      const row = rows.find((r) => r.purpose.id === t.purposeId);
      if (row && -t.portion > row.purpose.currentInAccount) {
        return showToast(
          `Reduction of ${fmt(-t.portion)} exceeds available ${fmt(row.purpose.currentInAccount)} for ${row.purpose.label}`
        );
      }
    }

    try {
      await executeAccountRebalance(db, dvId, transfers);
      invalidateSliceCache();
      closeModal();
      await loadState(db);
    } catch (e: any) {
      showToast(e.message);
    }
  };

  const modeTitle =
    modalMode === 'deposit'
      ? `Deposit → ${label}`
      : modalMode === 'spend'
      ? `Spend ← ${label}`
      : `Rebalance: ${label}`;

  // Phase 1: amount entry for deposit/spend
  if (phase === 'amount') {
    return (
      <View>
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            Current total: <Text style={styles.bold}>{fmt(currentTotal)}</Text>
          </Text>
        </View>
        <Text style={styles.fieldLabel}>Amount ($)</Text>
        <TextInput
          style={styles.input}
          keyboardType="decimal-pad"
          placeholder="0.00"
          value={amountStr}
          onChangeText={setAmountStr}
          autoFocus
          returnKeyType="done"
        />
        <View style={styles.actions}>
          <TouchableOpacity style={styles.cancelBtn} onPress={closeModal}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryBtn} onPress={handleContinue}>
            <Text style={styles.primaryText}>Continue →</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Phase 2: purpose grid
  return (
    <View style={styles.gridContainer}>
      {modalMode === 'rebalance' && (
        <>
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              Current total: <Text style={styles.bold}>{fmt(currentTotal)}</Text>
            </Text>
          </View>
          <Text style={styles.fieldLabel}>New total ($)</Text>
          <TextInput
            style={styles.input}
            keyboardType="decimal-pad"
            value={newTotalStr}
            onChangeText={handleNewTotalChange}
            returnKeyType="done"
          />
        </>
      )}
      {candidates && !loading && (
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            {modalMode === 'deposit' ? 'Depositing' : modalMode === 'spend' ? 'Spending' : 'Delta'}:{' '}
            <Text style={styles.bold}>{delta >= 0 ? '+' : ''}{fmt(delta)}</Text>
            {'  '}New total: {fmt(candidates.newTotal)}
          </Text>
        </View>
      )}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#3b82f6" />
        </View>
      ) : candidates ? (
        <PurposeGrid
          rows={rows}
          onChangeValue={(id, v) =>
            setRows((prev) => prev.map((r) => (r.purpose.id === id ? { ...r, value: v } : r)))
          }
          onChangeMode={(id, mode) =>
            setRows((prev) => prev.map((r) => (r.purpose.id === id ? { ...r, mode } : r)))
          }
          showModeButtons={true}
          remainder={remainder}
          remainderLabel="Remaining to commit"
        />
      ) : null}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.cancelBtn} onPress={closeModal}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.primaryBtn, remainder !== 0 && styles.disabledBtn]}
          onPress={handleConfirm}
          disabled={remainder !== 0 || loading}
        >
          <Text style={styles.primaryText}>Confirm</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  gridContainer: { flex: 1 },
  infoBox: {
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
    padding: 10,
    marginBottom: 12,
  },
  infoText: { fontSize: 13, color: '#475569' },
  bold: { fontWeight: '700', color: '#1e293b' },
  fieldLabel: {
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
    marginBottom: 12,
  },
  loadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
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
