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

## Dev Commands

```bash
npx expo start          # Start dev server
npx expo start --android  # Start with Android emulator
eas build --platform android  # Production build
```

## Project Structure

```
App.tsx                         ← SQLiteProvider + SafeAreaProvider root
src/
  constants.ts                  ← FUND_ID=1, DIM_ACCOUNTS=1, DIM_PURPOSE=2
  types/index.ts                ← Fund, DimensionValue, SliceRow, Transfer, ModalConfig...
  utils/format.ts               ← fmt(cents), parseDollars(str)
  db/
    schema.ts                   ← SCHEMA_SQL template literal (verbatim from source repo)
    database.ts                 ← initializeDatabase, executeAccountRebalance,
                                   executeAccountTransfer, executePurposeTransfer
    queries.ts                  ← getState, getDimensionTotals, getSlicesForDimensionValue,
                                   getRebalanceCandidates, createDimensionValue,
                                   renameDimensionValue, deleteDimensionValue,
                                   getAccountTotal, getPurposeTotal, syncFundTotal
  store/
    useAppStore.ts              ← Zustand store (AppState + UIState + ModalState slices)
  screens/
    MainScreen.tsx              ← Single screen, assembles all components
  components/
    BalanceHeader.tsx           ← Fund name + total (dark header)
    TabBar.tsx                  ← Accounts | Purposes tab switcher
    AddBar.tsx                  ← "+ Add" button
    DimensionList.tsx           ← Renders account or purpose list
    DimensionRow.tsx            ← Expandable row with gear + action button
    SliceSubRow.tsx             ← Indented slice breakdown row
    Taskbar.tsx                 ← Deposit | Transfer | Spend | Re-tag (bottom bar)
    Toast.tsx                   ← Animated fade notification overlay
    AppModal.tsx                ← Single Modal shell (bottom sheet style)
    modals/
      AddModalContent.tsx       ← Add account/purpose form
      EditModalContent.tsx      ← Rename + delete with Alert.alert confirmation
      RebalanceModalContent.tsx ← Handles rebalance, deposit, and spend modes
      PurposeGrid.tsx           ← Purpose rows with +/- toggle and amount inputs
      AccountTransferModalContent.tsx  ← Transfer between accounts
      PurposeTransferModalContent.tsx  ← Re-tag between purposes
```

## Database Schema (5 tables)

```sql
funds                 -- id, name, total_amount (kept in sync), currency
dimensions            -- id, name, is_balancing, allows_multiple
  Seeded: 1=Accounts, 2=Purpose, 3=Notes
dimension_values      -- id, dimension_id, label  (UNIQUE per dimension)
allocation_slices     -- id, fund_id, amount (INTEGER cents), note
slice_dimensions      -- slice_id → dimension_value_id  (junction, UNIQUE pair)
```

## Key Business Rules

1. **Integer cents** — all amounts stored as INTEGER, never float. `parseDollars()` converts user input via `Math.round(v * 100)`.
2. **syncFundTotal** — must be called after any slice mutation. Recalculates `funds.total_amount` as `SUM(allocation_slices.amount)`.
3. **Rebalance validation** — `portionSum === delta` must hold before calling `executeAccountRebalance`. The UI enforces this by disabling Confirm until remainder === 0.
4. **Account delete** — deletes all slices tagged with that account first, then the dimension_value, then calls syncFundTotal.
5. **Purpose transfer** — fund total is unchanged. Only re-tags slices from one purpose to another, inheriting all other tags from the source.

## Transaction Functions

### `executeAccountRebalance(db, accountDvId, transfers)`
- Each `transfer = { purposeId, portion }` where portion is signed (+ grow, − shrink)
- Creates new slice if `(account + purpose)` pair doesn't exist; deletes if amount reaches 0
- Calls `syncFundTotal` at end

### `executeAccountTransfer(db, sourceId, targetId, transfers)`
- Portions always positive; shrinks source, grows target
- Net-zero fund operation; `syncFundTotal` called for accuracy

### `executePurposeTransfer(db, sourcePurposeId, targetPurposeId, amount)`
- Drains source slices largest-first
- Creates target slices inheriting all tags except sourcePurposeId, adds targetPurposeId
- Does NOT call syncFundTotal (net zero)

## Modal System

Single `AppModal` component reads `modal.type` from Zustand and renders the correct content:
- `'none'` → not visible
- `'add'` → AddModalContent (payload: `{ type: 'account' | 'purpose' }`)
- `'edit'` → EditModalContent (payload: `{ type, dvId, label }`)
- `'rebalance'` / `'deposit'` / `'spend'` → RebalanceModalContent (payload: `{ dvId, label, currentTotal, mode }`)
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
- **Foreign keys** — enabled in schema via `PRAGMA foreign_keys = ON`. Deleting a dimension_value that has slices tagged to it will fail unless those slices are deleted first.
- **UNIQUE constraint** on `(dimension_id, label)` in `dimension_values` — catch SQLite error in catch block and show toast if message includes 'UNIQUE'.
