# Pockets-expo

Offline Android financial allocation tracker — Expo/React Native port of [azrulnaut/Pockets-project](https://github.com/azrulnaut/Pockets-project).

## Purpose

Multi-dimensional financial allocation tracking. Money is stored as **allocation slices**, each tagged with an account dimension value and a purpose dimension value. The fund total is always the sum of all slices. No server, no network — fully local SQLite.

## Tech Stack

| Concern | Technology |
|---|---|
| Framework | Expo SDK 55 (managed workflow) |
| Language | TypeScript |
| Database | expo-sqlite v15 (async API) |
| State | Zustand v5 |
| Navigation | None — single screen, manual tab state |
| Safe area | react-native-safe-area-context |
| Icons | @expo/vector-icons (Ionicons) |

## Dev Commands

```bash
npx expo start          # Start dev server
npx expo start --android  # Start with Android emulator
eas build --platform android  # Production build
```

> **Emulator connectivity**: If the emulator shows the Expo Go splash but never loads the bundle, run `adb reverse tcp:8081 tcp:8081` then reopen via `adb shell am start -a android.intent.action.VIEW -d "exp://localhost:8081" host.exp.exponent`. Metro uses the LAN IP by default which Android emulators can't always reach.

## Project Structure

```
App.tsx                         ← SQLiteProvider + SafeAreaProvider root
src/
  constants.ts                  ← FUND_ID=1, DIM_ACCOUNTS=1, DIM_PURPOSE=2
  types/index.ts                ← Fund, DimensionValue, AppSettings, ActiveScreen, SliceRow, Transfer, ModalConfig...
  utils/format.ts               ← createFormatter(settings), createParser(settings); default fmt/parseDollars exports
  db/
    schema.ts                   ← SCHEMA_SQL template literal (verbatim from source repo)
    database.ts                 ← initializeDatabase, executeAccountRebalance,
                                   executeAccountTransfer, executePurposeTransfer
    queries.ts                  ← getState, getDimensionTotals, getSlicesForDimensionValue,
                                   getRebalanceCandidates, createDimensionValue,
                                   renameDimensionValue, deleteDimensionValue,
                                   getAccountTotal, getPurposeTotal, syncFundTotal,
                                   setTargetAmount, getSettings, setSetting
  store/
    useAppStore.ts              ← Zustand store (AppState + UIState + ModalState + SettingsState slices)
                                   Exposes `fmt` and `parse` as computed functions derived from `settings`
  screens/
    MainScreen.tsx              ← Main screen, assembles all components; shown when `activeScreen === 'main'`
    EditModeScreen.tsx          ← Edit Mode screen (orange header); shown when `activeScreen === 'editMode'`
    SettingsScreen.tsx          ← Settings screen (gray-700 header); shown when `activeScreen === 'settings'`
  components/
    BalanceHeader.tsx           ← Fund name + total (dark header)
    TabBar.tsx                  ← Accounts | Purposes tab switcher (wallet-outline / cube-outline icons)
    AddBar.tsx                  ← "+ Add" button
    DimensionList.tsx           ← Renders account or purpose list
    DimensionRow.tsx            ← Expandable row with Ionicons gear (settings-outline) + chevron toggle
    SliceSubRow.tsx             ← Indented slice breakdown row
    Taskbar.tsx                 ← 4 icon buttons (Home, Transact, Re-tag, Tools); Transact + Tools each open animated sub-menu pills
    EditModeRow.tsx             ← Row in Edit Mode: side-by-side ▲▼ rounded-square chevrons + orange Edit button
    Toast.tsx                   ← Animated fade notification overlay
    AppModal.tsx                ← Single Modal shell (bottom sheet style)
    modals/
      AddModalContent.tsx       ← Add account/purpose form
      EditModalContent.tsx      ← Rename + delete with Alert.alert confirmation
      RebalanceModalContent.tsx ← Handles rebalance, deposit, and spend modes
      PurposeGrid.tsx           ← Purpose rows with MAX button, +/- toggle, and amount inputs
      AccountTransferModalContent.tsx  ← Transfer between accounts
      PurposeTransferModalContent.tsx  ← Re-tag between purposes
```

## Database Schema (7 tables)

```sql
funds                 -- id, name, total_amount (kept in sync), currency
dimensions            -- id, name, is_balancing, allows_multiple
  Seeded: 1=Accounts, 2=Purpose, 3=Notes
dimension_values      -- id, dimension_id, label, sort_order, is_protected (UNIQUE per dimension)
  Seeded protected: (dimension_id=2, label='Unallocated', is_protected=1)
allocation_slices     -- id, fund_id, amount (INTEGER cents), note
slice_dimensions      -- slice_id → dimension_value_id  (junction, UNIQUE pair)
purpose_targets       -- dimension_value_id (FK → dimension_values, CASCADE), target_amount (INTEGER cents, UNIQUE per dv)
settings              -- key TEXT PRIMARY KEY, value TEXT (currency, symbolDisplay, numberFormat)
  Defaults: currency='MYR', symbolDisplay='show', numberFormat='english'
```

## Key Business Rules

1. **Integer cents** — all amounts stored as INTEGER, never float. `parse()` (from store) converts user input via `Math.round(v * 100)`. Respects `numberFormat` setting for European decimal comma.
2. **syncFundTotal** — must be called after any slice mutation. Recalculates `funds.total_amount` as `SUM(allocation_slices.amount)`.
3. **Rebalance validation** — `portionSum === delta` must hold before calling `executeAccountRebalance`. The UI enforces this by disabling Confirm until remainder === 0.
4. **Account delete** — deletes all slices tagged with that account first, then the dimension_value, then calls syncFundTotal.
5. **Purpose transfer** — fund total is unchanged. Re-tags specific account slices from one purpose to another on a per-account basis.

## Transaction Functions

### `executeAccountRebalance(db, accountDvId, transfers)`
- Each `transfer = { purposeId, portion }` where portion is signed (+ grow, − shrink)
- Creates new slice if `(account + purpose)` pair doesn't exist; deletes if amount reaches 0
- Calls `syncFundTotal` at end

### `executeAccountTransfer(db, sourceId, targetId, transfers)`
- Portions always positive; shrinks source, grows target
- Net-zero fund operation; `syncFundTotal` called for accuracy

### `executePurposeTransfer(db, sourcePurposeId, targetPurposeId, transfers)`
- Each `transfer = { accountDvId, amount }` — moves `amount` from `(sourcePurpose + account)` slice to `(targetPurpose + account)` slice
- User explicitly selects which account slices to re-tag (shown in a grid after purpose selection)
- Does NOT call syncFundTotal (net zero)

## Modal System

Single `AppModal` component reads `modal.type` from Zustand and renders the correct content:
- `'none'` → not visible
- `'add'` → AddModalContent (payload: `{ type: 'account' | 'purpose' }`)
- `'edit'` → EditModalContent (payload: `{ type, dvId, label, targetAmount? }`)
- `'rebalance'` → RebalanceModalContent (payload: `{ dvId, label, currentTotal }`) — opens directly to purpose grid with new-total input
- `'deposit'` / `'spend'` → RebalanceModalContent (no payload required) — phase 1: pick account + enter delta; phase 2: purpose distribution grid
- `'accountTransfer'` → AccountTransferModalContent
- `'purposeTransfer'` → PurposeTransferModalContent

## expo-sqlite API Mapping

| better-sqlite3 (source) | expo-sqlite v15 (this project) |
|---|---|
| `stmt.get(args)` | `await db.getFirstAsync(sql, args)` |
| `stmt.all(args)` | `await db.getAllAsync(sql, args)` |
| `stmt.run(args)` | `await db.runAsync(sql, args)` |
| `db.transaction(fn)()` | `await db.withTransactionAsync(async () => {...})` |
| `result.lastInsertRowid` | `result.lastInsertRowId` (capital **I**) |

## Known Gotchas

- **`lastInsertRowId`** — capital I, not lowercase i. Using the wrong case silently returns undefined.
- **No nested transactions** — `withTransactionAsync` cannot be nested. Keep all db calls in a single flat async block.
- **Async-only db calls** — expo-sqlite v15 is fully async. Never call db methods without `await`.
- **Safe area insets** — `Taskbar` uses `useSafeAreaInsets()` to add bottom padding above the system navigation bar.
- **Foreign keys** — `PRAGMA foreign_keys = ON` is run as a separate `execAsync` call in `initializeDatabase` before the DDL. SQLite ignores this PRAGMA when set inside an implicit transaction, so it must not be bundled with the schema SQL.
- **UNIQUE constraint** on `(dimension_id, label)` in `dimension_values` — catch SQLite error in catch block and show toast if message includes 'UNIQUE'.
- **ErrorBoundary** — `App.tsx` wraps `<Suspense>` in a class-based `ErrorBoundary`. Without it, any error thrown during DB initialization crashes the React tree silently and the native splash screen never dismisses.
- **Slice cache refresh** — `loadState` re-fetches slices for all currently expanded rows as part of its state update. Do NOT call `invalidateSliceCache()` before `loadState` in modal confirm handlers — doing so causes a spinner flash. Let `loadState` own the full refresh.
- **`modal.type` as mode source** — `RebalanceModalContent` reads `modal.type` (not `modal.payload.mode`) to determine rebalance/deposit/spend mode. `modal.payload.mode` was removed.
- **Re-tag modal** — `PurposeTransferModalContent` is 2-phase: select source/target purposes → account slice grid. `executePurposeTransfer` now takes per-account transfers, not a single drain amount.
- **MAX button in PurposeGrid** — each row has a MAX button that fills the row with the entire remaining delta and sets the mode to match the sign of the remainder. Disabled (greyed) when `remainder === 0`. `onMaxPress` handler lives in `RebalanceModalContent` and is passed as a prop.
- **Taskbar sub-menus** — `Taskbar` has two transparent RN `Modal` sub-menus: Transact (Deposit/Spend/Transfer) and Tools (Edit Mode/Settings). `taskbarHeight` is captured via `onLayout` so pills position correctly above the bar. Animation uses `Animated.spring` (open) and `Animated.timing` 100ms (close); `setSubMenuOpen(false)` is called in the animation callback, not immediately.
- **Taskbar switches to main before modals** — Deposit, Spend, Transfer (account), and Re-tag all call `setActiveScreen('main')` before `openModal(...)`. This ensures the modal appears over the main screen even if the user triggered it from Edit Mode.
- **Edit Mode orange theme** — `EditModeScreen` header is `#c2410c`; `TabBar` and `AddBar` read `activeScreen` from the store and switch their accent color to `#ea580c` when `activeScreen === 'editMode'`. `EditModeRow` chevron squares are `#ea580c` (active) / `#fed7aa` (disabled); Edit button is `#fff7ed` bg / `#ea580c` text.
- **EditModeRow chevrons** — two side-by-side 29×29 rounded squares (`borderRadius: 6`), icon size 18, always white icon color; active bg `#ea580c`, disabled bg `#fed7aa`.
- **Dimension value ordering** — `getDimensionTotals` uses `ORDER BY dv.is_protected ASC, COALESCE(dv.sort_order, dv.id) ASC`. Protected items always sort last. `swapDimensionValueOrder` filters `AND is_protected = 0` so protected rows never participate in swaps.
- **Purpose targets** — `purpose_targets` table stores optional target amounts for purposes. `getDimensionTotals` LEFT JOINs this table, so `DimensionValue.targetAmount` is always present (0 = no target). `setTargetAmount(db, dvId, cents)` uses INSERT OR REPLACE for `> 0` and DELETE for `0`. `ON DELETE CASCADE` ensures rows are removed when the purpose is deleted — no manual cleanup needed. The `purpose_targets` table is added via `CREATE TABLE IF NOT EXISTS` so existing installs gain it on next launch without a migration.
- **Unallocated protected purpose** — seeded as `(dimension_id=2, label='Unallocated', is_protected=1)` in `initializeDatabase` (after `is_protected` migration). Always appears last in purposes list. `EditModeRow` disables both chevrons and the Edit button when `item.isProtected`. `EditModeScreen` passes `movableCount` (non-protected items only) as `total` to each `EditModeRow`.
- **`fmt` and `parse` from store** — all components must use `const fmt = useAppStore((s) => s.fmt)` and `const parse = useAppStore((s) => s.parse)` rather than importing directly from `format.ts`. The store recomputes these when settings change via `createFormatter(settings)` / `createParser(settings)`.
- **Settings screen** — `activeScreen === 'settings'` renders `SettingsScreen` (gray-700 header `#374151`). Currency cycles via a bottom-sheet Modal (11 curated 2-decimal currencies: MYR first, then AUD/CAD/CHF/CNY/EUR/GBP/HKD/NZD/SGD/USD). Symbol display and number format cycle on tap. Live preview box shows `fmt(123456)` with current settings.
- **Settings persistence** — `settings` table with key/value rows. `getSettings` / `setSetting` in `queries.ts`. Store actions: `loadSettings(db)` (called on init alongside `loadState`), `updateSetting(db, key, value)`. Only 2-decimal-place currencies supported (JPY and 0-decimal currencies excluded — existing cent-based storage is incompatible).
- **Taskbar navigation** — each top-level button always navigates first: Home → `setActiveTab('accounts')` + `setActiveScreen('main')`; Transact → same nav then toggles sub-menu (Deposit/Spend/Transfer handlers no longer repeat nav); Edit Mode → `setActiveTab('accounts')` + `setActiveScreen('editMode')`; Settings → `setActiveScreen('settings')`.
