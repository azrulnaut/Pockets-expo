import { create } from 'zustand';
import type { SQLiteDatabase } from 'expo-sqlite';
import type { DimensionValue, Fund, ModalConfig, ModalType, SliceRow } from '../types';
import { getState, getSlicesForDimensionValue } from '../db/queries';
import { DIM_ACCOUNTS, DIM_PURPOSE } from '../constants';

interface AppState {
  // App data
  fund: Fund | null;
  accounts: DimensionValue[];
  purposes: DimensionValue[];

  // UI state
  activeTab: 'accounts' | 'purposes';
  expandedAccounts: Set<number>;
  expandedPurposes: Set<number>;
  sliceCache: Record<string, SliceRow[]>;

  // Modal state
  modal: ModalConfig;
  toastMessage: string | null;

  // Actions
  loadState: (db: SQLiteDatabase) => Promise<void>;
  setActiveTab: (tab: 'accounts' | 'purposes') => void;
  toggleExpand: (db: SQLiteDatabase, type: 'account' | 'purpose', dvId: number) => Promise<void>;
  invalidateSliceCache: () => void;
  openModal: (config: ModalConfig) => void;
  closeModal: () => void;
  showToast: (message: string) => void;
  clearToast: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  fund: null,
  accounts: [],
  purposes: [],

  activeTab: 'accounts',
  expandedAccounts: new Set(),
  expandedPurposes: new Set(),
  sliceCache: {},

  modal: { type: 'none' },
  toastMessage: null,

  // Actions
  loadState: async (db) => {
    try {
      const data = await getState(db);
      set({ fund: data.fund, accounts: data.accounts, purposes: data.purposes });
    } catch (e: any) {
      get().showToast('Failed to load state: ' + e.message);
    }
  },

  setActiveTab: (tab) => set({ activeTab: tab }),

  toggleExpand: async (db, type, dvId) => {
    const { expandedAccounts, expandedPurposes, sliceCache } = get();
    const expandedSet = type === 'account' ? expandedAccounts : expandedPurposes;
    const cacheKey = `${type === 'account' ? 'a' : 'p'}-${dvId}`;

    if (expandedSet.has(dvId)) {
      const newSet = new Set(expandedSet);
      newSet.delete(dvId);
      const newCache = { ...sliceCache };
      delete newCache[cacheKey];
      if (type === 'account') {
        set({ expandedAccounts: newSet, sliceCache: newCache });
      } else {
        set({ expandedPurposes: newSet, sliceCache: newCache });
      }
      return;
    }

    // Optimistically add to expanded set
    const newSet = new Set(expandedSet);
    newSet.add(dvId);
    if (type === 'account') {
      set({ expandedAccounts: newSet });
    } else {
      set({ expandedPurposes: newSet });
    }

    // Fetch slices
    try {
      const otherDimId = type === 'account' ? DIM_PURPOSE : DIM_ACCOUNTS;
      const slices = await getSlicesForDimensionValue(db, dvId, otherDimId);
      set((state) => ({ sliceCache: { ...state.sliceCache, [cacheKey]: slices } }));
    } catch (e: any) {
      set((state) => ({ sliceCache: { ...state.sliceCache, [cacheKey]: [] } }));
      get().showToast('Failed to load slices: ' + e.message);
    }
  },

  invalidateSliceCache: () => set({ sliceCache: {} }),

  openModal: (config) => set({ modal: config }),

  closeModal: () => set({ modal: { type: 'none' } }),

  showToast: (message) => {
    set({ toastMessage: message });
    setTimeout(() => {
      set((state) => state.toastMessage === message ? { toastMessage: null } : {});
    }, 3500);
  },

  clearToast: () => set({ toastMessage: null }),
}));
