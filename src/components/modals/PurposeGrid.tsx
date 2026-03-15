import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import type { RebalanceCandidate } from '../../types';
import { useAppStore } from '../../store/useAppStore';

export type PurposeMode = '+' | '-';

export interface PurposeRowState {
  purpose: RebalanceCandidate;
  mode: PurposeMode;
  value: string;
}

interface Props {
  rows: PurposeRowState[];
  onChangeValue: (purposeId: number, value: string) => void;
  onChangeMode: (purposeId: number, mode: PurposeMode) => void;
  onMaxPress?: (purposeId: number) => void;
  showModeButtons: boolean;
  showMaxButton?: boolean;
  remainder: number;
  remainderLabel: string;
}

export function PurposeGrid({
  rows,
  onChangeValue,
  onChangeMode,
  onMaxPress,
  showModeButtons,
  showMaxButton = true,
  remainder,
  remainderLabel,
}: Props) {
  const fmt = useAppStore((s) => s.fmt);
  const parse = useAppStore((s) => s.parse);
  if (rows.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No purposes defined yet — add some first.</Text>
      </View>
    );
  }

  const isZero = remainder === 0;

  return (
    <View>
      {rows.map(({ purpose, mode, value }) => {
        const signedCurrent = (mode === '+' ? 1 : -1) * (parse(value) ?? 0);
        const effectiveRemainder = remainder + signedCurrent;
        const isMaxDisabled =
          effectiveRemainder === 0 ||
          (effectiveRemainder < 0 && purpose.currentInAccount === 0);
        const isOverdrawn = mode === '-' && (parse(value) ?? 0) > purpose.currentInAccount;
        return (
          <View key={purpose.id} style={[styles.row, mode === '+' ? styles.rowPlus : styles.rowMinus]}>
            <View style={styles.labelCol}>
              <Text style={styles.purposeLabel} numberOfLines={1}>{purpose.label}</Text>
              <Text style={styles.purposeCurrent}>{fmt(purpose.currentInAccount)}</Text>
            </View>
            {showMaxButton && (
              <TouchableOpacity
                style={[styles.maxBtn, isMaxDisabled && styles.maxBtnDisabled]}
                onPress={() => onMaxPress?.(purpose.id)}
                disabled={isMaxDisabled}
              >
                <Text style={[styles.maxBtnText, isMaxDisabled && styles.maxBtnTextDisabled]}>MAX</Text>
              </TouchableOpacity>
            )}
            {showModeButtons && (
              <View style={styles.modeBtns}>
                <TouchableOpacity
                  style={[styles.modeBtn, mode === '+' && styles.modeBtnActive]}
                  onPress={() => onChangeMode(purpose.id, '+')}
                >
                  <Text style={[styles.modeBtnText, mode === '+' && styles.modeBtnTextActive]}>+</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modeBtn, mode === '-' && styles.modeBtnActiveMinus]}
                  onPress={() => onChangeMode(purpose.id, '-')}
                >
                  <Text style={[styles.modeBtnText, mode === '-' && styles.modeBtnTextActive]}>−</Text>
                </TouchableOpacity>
              </View>
            )}
            <TextInput
              style={[styles.input, isOverdrawn && styles.inputOverdrawn]}
              keyboardType="decimal-pad"
              placeholder="0.00"
              value={value}
              onChangeText={(v) => onChangeValue(purpose.id, v)}
            />
          </View>
        );
      })}
      <View style={[styles.remainderRow, isZero ? styles.remainderZero : styles.remainderNonzero]}>
        <Text style={styles.remainderLabel}>{remainderLabel}</Text>
        <Text style={[styles.remainderValue, isZero ? styles.remainderValueZero : styles.remainderValueNonzero]}>
          {remainder < 0 ? '−' : remainder > 0 ? '+' : ''}{fmt(Math.abs(remainder))}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    padding: 16,
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
    marginVertical: 8,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 14,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
    marginBottom: 4,
  },
  rowPlus: { backgroundColor: '#eff6ff' },
  rowMinus: { backgroundColor: '#fff1f2' },
  labelCol: {
    flex: 1,
    marginRight: 8,
  },
  purposeLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1e293b',
  },
  purposeCurrent: {
    fontSize: 11,
    color: '#64748b',
  },
  maxBtn: {
    height: 28,
    paddingHorizontal: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#d97706',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
    backgroundColor: '#ffffff',
  },
  maxBtnDisabled: {
    borderColor: '#cbd5e1',
  },
  maxBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#d97706',
  },
  maxBtnTextDisabled: {
    color: '#cbd5e1',
  },
  modeBtns: {
    flexDirection: 'row',
    marginRight: 6,
  },
  modeBtn: {
    width: 28,
    height: 28,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 2,
    backgroundColor: '#ffffff',
  },
  modeBtnActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  modeBtnActiveMinus: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
  },
  modeBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
  },
  modeBtnTextActive: {
    color: '#ffffff',
  },
  input: {
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
  remainderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 6,
    marginTop: 4,
  },
  remainderZero: { backgroundColor: '#dcfce7' },
  remainderNonzero: { backgroundColor: '#fef9c3' },
  remainderLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  remainderValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  remainderValueZero: { color: '#16a34a' },
  remainderValueNonzero: { color: '#ca8a04' },
  inputOverdrawn: {
    color: '#ef4444',
  },
});
