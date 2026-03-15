import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../store/useAppStore';
import type { AppSettings } from '../types';

const CURRENCIES = ['MYR', 'AUD', 'CAD', 'CHF', 'CNY', 'EUR', 'GBP', 'HKD', 'NZD', 'SGD', 'USD'];

const SYMBOL_DISPLAY_LABELS: Record<AppSettings['symbolDisplay'], string> = {
  show: 'Show symbol',
  hide: 'Hide symbol',
  iso: 'ISO code',
};

const NUMBER_FORMAT_LABELS: Record<AppSettings['numberFormat'], string> = {
  english: 'English (1,234.56)',
  european: 'European (1.234,56)',
  swiss: 'Swiss (1 234.56)',
};

const SYMBOL_CYCLE: AppSettings['symbolDisplay'][] = ['show', 'hide', 'iso'];
const FORMAT_CYCLE: AppSettings['numberFormat'][] = ['english', 'european', 'swiss'];

export function SettingsScreen() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const settings = useAppStore((s) => s.settings);
  const updateSetting = useAppStore((s) => s.updateSetting);
  const fmt = useAppStore((s) => s.fmt);

  const [currencyPickerVisible, setCurrencyPickerVisible] = useState(false);

  const cycleSymbolDisplay = () => {
    const idx = SYMBOL_CYCLE.indexOf(settings.symbolDisplay);
    const next = SYMBOL_CYCLE[(idx + 1) % SYMBOL_CYCLE.length];
    updateSetting(db, 'symbolDisplay', next);
  };

  const cycleNumberFormat = () => {
    const idx = FORMAT_CYCLE.indexOf(settings.numberFormat);
    const next = FORMAT_CYCLE[(idx + 1) % FORMAT_CYCLE.length];
    updateSetting(db, 'numberFormat', next);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f3f4f6' }}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <Text style={styles.sectionLabel}>DISPLAY</Text>

        <TouchableOpacity style={styles.row} onPress={() => setCurrencyPickerVisible(true)}>
          <View style={styles.rowLeft}>
            <Ionicons name="cash-outline" size={20} color="#374151" style={styles.rowIcon} />
            <Text style={styles.rowTitle}>Currency</Text>
          </View>
          <View style={styles.rowRight}>
            <Text style={styles.rowValue}>{settings.currency}</Text>
            <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.row} onPress={cycleSymbolDisplay}>
          <View style={styles.rowLeft}>
            <Ionicons name="pricetag-outline" size={20} color="#374151" style={styles.rowIcon} />
            <Text style={styles.rowTitle}>Currency Symbol</Text>
          </View>
          <View style={styles.rowRight}>
            <Text style={styles.rowValue}>{SYMBOL_DISPLAY_LABELS[settings.symbolDisplay]}</Text>
            <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.row, styles.rowLast]} onPress={cycleNumberFormat}>
          <View style={styles.rowLeft}>
            <Ionicons name="options-outline" size={20} color="#374151" style={styles.rowIcon} />
            <Text style={styles.rowTitle}>Number Format</Text>
          </View>
          <View style={styles.rowRight}>
            <Text style={styles.rowValue}>{NUMBER_FORMAT_LABELS[settings.numberFormat]}</Text>
            <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
          </View>
        </TouchableOpacity>

        <View style={styles.previewBox}>
          <Text style={styles.previewLabel}>Preview</Text>
          <Text style={styles.previewValue}>{fmt(123456)}</Text>
        </View>
      </ScrollView>

      {/* Currency picker modal */}
      <Modal
        transparent
        visible={currencyPickerVisible}
        animationType="slide"
        onRequestClose={() => setCurrencyPickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setCurrencyPickerVisible(false)}
        />
        <View style={[styles.pickerSheet, { paddingBottom: insets.bottom + 16 }]}>
          <Text style={styles.pickerTitle}>Select Currency</Text>
          <ScrollView>
            {CURRENCIES.map((code, idx) => {
              const isMYR = code === 'MYR';
              return (
                <React.Fragment key={code}>
                  {idx === 1 && <View style={styles.pickerSeparator} />}
                  <TouchableOpacity
                    style={[styles.pickerItem, settings.currency === code && styles.pickerItemSelected]}
                    onPress={() => {
                      updateSetting(db, 'currency', code);
                      setCurrencyPickerVisible(false);
                    }}
                  >
                    <Text style={[styles.pickerItemText, settings.currency === code && styles.pickerItemTextSelected]}>
                      {code}
                      {isMYR ? ' (default)' : ''}
                    </Text>
                    {settings.currency === code && (
                      <Ionicons name="checkmark" size={18} color="#374151" />
                    )}
                  </TouchableOpacity>
                </React.Fragment>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#374151',
    paddingBottom: 16,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6b7280',
    letterSpacing: 0.8,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowIcon: {
    marginRight: 12,
  },
  rowTitle: {
    fontSize: 15,
    color: '#111827',
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowValue: {
    fontSize: 14,
    color: '#6b7280',
  },
  previewBox: {
    marginHorizontal: 16,
    marginTop: 20,
    backgroundColor: '#e5e7eb',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  previewLabel: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  previewValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  pickerSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: 400,
    paddingTop: 16,
  },
  pickerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  pickerSeparator: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 4,
    marginHorizontal: 16,
  },
  pickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  pickerItemSelected: {
    backgroundColor: '#f3f4f6',
  },
  pickerItemText: {
    fontSize: 15,
    color: '#111827',
  },
  pickerItemTextSelected: {
    fontWeight: '700',
  },
});
