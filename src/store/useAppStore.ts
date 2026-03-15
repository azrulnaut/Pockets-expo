import { create } from 'zustand';
import type { SQLiteDatabase } from 'expo-sqlite';
import type { ActiveScreen, AppSettings, DimensionValue, Fund, ModalConfig, SliceRow } from '../types';
import { getState, getSlicesForDimensionValue, getSettings, setSetting } from '../db/queries';
import { createFormatter, createParser } from '../utils/format';
import { DIM_ACCOUNTS, DIM_PURPOSE } from '../constants';

const DEFAULT_SETTINGS: AppSettings = { currency: 'MYR', symbolDisplay: 'show', numberFormat: 'english' };

interface AppState {
  // App data
  fund: Fund | null;
  accounts: DimensionValue[];
  purposes: DimensionValue[];

  // UI state
  activeTab: 'accounts' | 'purposes';
  activeScreen: ActiveScreen;
  expandedAccounts: Set<number>;
  expandedPurposes: Set<number>;
  sliceCache: Record<string, SliceRow[]>;

  // Modal state
  modal: ModalConfig;
  toastMessage: string | null;

  // Settings
  settings: AppSettings;
  fmt: (cents: number) => string;
  parse: (str: string) => number | null;

  // Actions
  loadState: (db: SQLiteDatabase) => Promise<void>;
  loadSettings: (db: SQLiteDatabase) => Promise<void>;
  updateSetting: (db: SQLiteDatabase, key: string, value: string) => Promise<void>;
  setActiveTab: (tab: 'accounts' | 'purposes') => void;
  setActiveScreen: (screen: ActiveScreen) => void;
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
  activeScreen: 'main',
  expandedAccounts: new Set(),
  expandedPurposes: new Set(),
  sliceCache: {},

  modal: { type: 'none' },
  toastMessage: null,

  settings: DEFAULT_SETTINGS,
  fmt: createFormatter(DEFAULT_SETTINGS),
  parse: createParser(DEFAULT_SETTINGS),

  // Actions
  loadState: async (db) => {
    try {
      const data = await getState(db);
      const { expandedAccounts, expandedPurposes } = get();

      // Refresh slice cache for all currently expanded rows in-place (no spinner)
      const sliceCache: Record<string, SliceRow[]> = {};
      for (const dvId of expandedAccounts) {
        sliceCache[`a-${dvId}`] = await getSlicesForDimensionValue(db, dvId, DIM_PURPOSE);
      }
      for (const dvId of expandedPurposes) {
        sliceCache[`p-${dvId}`] = await getSlicesForDimensionValue(db, dvId, DIM_ACCOUNTS);
      }

      set({ fund: data.fund, accounts: data.accounts, purposes: data.purposes, sliceCache });
    } catch (e: any) {
      get().showToast('Failed to load state: ' + e.message);
    }
  },

  loadSettings: async (db) => {
    try {
      const settings = await getSettings(db);
      set({ settings, fmt: createFormatter(settings), parse: createParser(settings) });
    } catch (e: any) {
      get().showToast('Failed to load settings: ' + e.message);
    }
  },

  updateSetting: async (db, key, value) => {
    try {
      await setSetting(db, key, value);
      await get().loadSettings(db);
    } catch (e: any) {
      get().showToast('Failed to save setting: ' + e.message);
    }
  },

  setActiveTab: (tab) => set({ activeTab: tab }),

  setActiveScreen: (screen) => set({ activeScreen: screen }),

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
