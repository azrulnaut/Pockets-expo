import type { SQLiteDatabase } from 'expo-sqlite';
import { SCHEMA_SQL } from './schema';
import { syncFundTotal } from './queries';
import type { Transfer } from '../types';
import { FUND_ID } from '../constants';

export async function initializeDatabase(db: SQLiteDatabase): Promise<void> {
  // Run PRAGMA separately so it takes effect on the connection before DDL
  await db.execAsync('PRAGMA foreign_keys = ON;');
  await db.execAsync(SCHEMA_SQL);
  // Migration: add sort_order column for existing installs
  try {
    await db.execAsync('ALTER TABLE dimension_values ADD COLUMN sort_order INTEGER');
  } catch (_) { /* column already exists */ }
  await db.execAsync('UPDATE dimension_values SET sort_order = id WHERE sort_order IS NULL');

  // Migration: add is_protected column for existing installs
  try {
    await db.execAsync(
      'ALTER TABLE dimension_values ADD COLUMN is_protected INTEGER NOT NULL DEFAULT 0'
    );
  } catch (_) { /* column already exists */ }

  // Seed protected Unallocated purpose (runs after migration so column exists)
  await db.execAsync(
    `INSERT OR IGNORE INTO dimension_values (dimension_id, label, is_protected) VALUES (2, 'Unallocated', 1)`
  );
}

// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------

/**
 * Rebalance an account — adjusts fund total (deposit/withdraw/rebalance).
 * Each transfer: portion > 0 grows (account + purpose) slice, < 0 shrinks it.
 * Net sum of all portions must equal delta (enforced by UI before calling).
 */
export async function executeAccountRebalance(
  db: SQLiteDatabase,
  accountDvId: number,
  transfers: Transfer[]
): Promise<number> {
  let newFundTotal = 0;
  await db.withTransactionAsync(async () => {
    for (const { purposeId, portion } of transfers) {
      if (portion === 0) continue;

      const target = await db.getFirstAsync<{ id: number; amount: number }>(
        `SELECT s.id, s.amount FROM allocation_slices s
         JOIN slice_dimensions sd1 ON sd1.slice_id = s.id AND sd1.dimension_value_id = ?
         JOIN slice_dimensions sd2 ON sd2.slice_id = s.id AND sd2.dimension_value_id = ?
         WHERE s.fund_id = ? LIMIT 1`,
        [accountDvId, purposeId, FUND_ID]
      );

      if (portion > 0) {
        if (target) {
          await db.runAsync(
            'UPDATE allocation_slices SET amount = amount + ? WHERE id = ?',
            [portion, target.id]
          );
        } else {
          const result = await db.runAsync(
            'INSERT INTO allocation_slices (fund_id, amount) VALUES (?, ?)',
            [FUND_ID, portion]
          );
          const sliceId = result.lastInsertRowId;
          await db.runAsync(
            'INSERT OR IGNORE INTO slice_dimensions (slice_id, dimension_value_id) VALUES (?, ?)',
            [sliceId, accountDvId]
          );
          await db.runAsync(
            'INSERT OR IGNORE INTO slice_dimensions (slice_id, dimension_value_id) VALUES (?, ?)',
            [sliceId, purposeId]
          );
        }
      } else {
        // portion < 0
        if (target) {
          const newAmount = target.amount + portion;
          if (newAmount <= 0) {
            await db.runAsync('DELETE FROM allocation_slices WHERE id = ?', [target.id]);
          } else {
            await db.runAsync(
              'UPDATE allocation_slices SET amount = amount + ? WHERE id = ?',
              [portion, target.id]
            );
          }
        }
      }
    }
    newFundTotal = await syncFundTotal(db);
  });
  return newFundTotal;
}

/**
 * Move money from one account to another, preserving purpose tags.
 * Fund total is unchanged (net zero operation).
 */
export async function executeAccountTransfer(
  db: SQLiteDatabase,
  sourceAccountDvId: number,
  targetAccountDvId: number,
  transfers: Transfer[]
): Promise<number> {
  let newFundTotal = 0;
  await db.withTransactionAsync(async () => {
    for (const { purposeId, portion } of transfers) {
      if (portion === 0) continue;

      // Shrink / delete source slice
      const source = await db.getFirstAsync<{ id: number; amount: number }>(
        `SELECT s.id, s.amount FROM allocation_slices s
         JOIN slice_dimensions sd1 ON sd1.slice_id = s.id AND sd1.dimension_value_id = ?
         JOIN slice_dimensions sd2 ON sd2.slice_id = s.id AND sd2.dimension_value_id = ?
         WHERE s.fund_id = ? LIMIT 1`,
        [sourceAccountDvId, purposeId, FUND_ID]
      );
      if (source) {
        const newAmount = source.amount - portion;
        if (newAmount <= 0) {
          await db.runAsync('DELETE FROM allocation_slices WHERE id = ?', [source.id]);
        } else {
          await db.runAsync(
            'UPDATE allocation_slices SET amount = amount + ? WHERE id = ?',
            [-portion, source.id]
          );
        }
      }

      // Grow / create target slice
      const target = await db.getFirstAsync<{ id: number; amount: number }>(
        `SELECT s.id, s.amount FROM allocation_slices s
         JOIN slice_dimensions sd1 ON sd1.slice_id = s.id AND sd1.dimension_value_id = ?
         JOIN slice_dimensions sd2 ON sd2.slice_id = s.id AND sd2.dimension_value_id = ?
         WHERE s.fund_id = ? LIMIT 1`,
        [targetAccountDvId, purposeId, FUND_ID]
      );
      if (target) {
        await db.runAsync(
          'UPDATE allocation_slices SET amount = amount + ? WHERE id = ?',
          [portion, target.id]
        );
      } else {
        const result = await db.runAsync(
          'INSERT INTO allocation_slices (fund_id, amount) VALUES (?, ?)',
          [FUND_ID, portion]
        );
        const sliceId = result.lastInsertRowId;
        await db.runAsync(
          'INSERT OR IGNORE INTO slice_dimensions (slice_id, dimension_value_id) VALUES (?, ?)',
          [sliceId, targetAccountDvId]
        );
        await db.runAsync(
          'INSERT OR IGNORE INTO slice_dimensions (slice_id, dimension_value_id) VALUES (?, ?)',
          [sliceId, purposeId]
        );
      }
    }
    newFundTotal = await syncFundTotal(db);
  });
  return newFundTotal;
}

/**
 * Redistribute funds from one purpose to another, per selected account slice.
 * Each transfer: { accountDvId, amount } moves `amount` from the
 * (sourcePurposeId + accountDvId) slice to the (targetPurposeId + accountDvId) slice.
 * Fund total is unchanged (net zero).
 */
export async function executePurposeTransfer(
  db: SQLiteDatabase,
  sourcePurposeId: number,
  targetPurposeId: number,
  transfers: Array<{ accountDvId: number; amount: number }>
): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (const { accountDvId, amount } of transfers) {
      if (amount <= 0) continue;

      // Find source slice (sourcePurpose + account)
      const source = await db.getFirstAsync<{ id: number; amount: number }>(
        `SELECT s.id, s.amount FROM allocation_slices s
         JOIN slice_dimensions sd1 ON sd1.slice_id = s.id AND sd1.dimension_value_id = ?
         JOIN slice_dimensions sd2 ON sd2.slice_id = s.id AND sd2.dimension_value_id = ?
         WHERE s.fund_id = ? LIMIT 1`,
        [sourcePurposeId, accountDvId, FUND_ID]
      );
      if (!source || amount > source.amount) continue;

      // Reduce / delete source slice
      if (amount === source.amount) {
        await db.runAsync('DELETE FROM allocation_slices WHERE id = ?', [source.id]);
      } else {
        await db.runAsync(
          'UPDATE allocation_slices SET amount = amount - ? WHERE id = ?',
          [amount, source.id]
        );
      }

      // Grow / create target slice (targetPurpose + account)
      const target = await db.getFirstAsync<{ id: number }>(
        `SELECT s.id FROM allocation_slices s
         JOIN slice_dimensions sd1 ON sd1.slice_id = s.id AND sd1.dimension_value_id = ?
         JOIN slice_dimensions sd2 ON sd2.slice_id = s.id AND sd2.dimension_value_id = ?
         WHERE s.fund_id = ? LIMIT 1`,
        [targetPurposeId, accountDvId, FUND_ID]
      );
      if (target) {
        await db.runAsync(
          'UPDATE allocation_slices SET amount = amount + ? WHERE id = ?',
          [amount, target.id]
        );
      } else {
        const result = await db.runAsync(
          'INSERT INTO allocation_slices (fund_id, amount) VALUES (?, ?)',
          [FUND_ID, amount]
        );
        const sliceId = result.lastInsertRowId;
        await db.runAsync(
          'INSERT OR IGNORE INTO slice_dimensions (slice_id, dimension_value_id) VALUES (?, ?)',
          [sliceId, targetPurposeId]
        );
        await db.runAsync(
          'INSERT OR IGNORE INTO slice_dimensions (slice_id, dimension_value_id) VALUES (?, ?)',
          [sliceId, accountDvId]
        );
      }
    }
    // Fund total unchanged (net zero)
  });
}
