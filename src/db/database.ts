import type { SQLiteDatabase } from 'expo-sqlite';
import { SCHEMA_SQL } from './schema';
import { syncFundTotal } from './queries';
import type { Transfer } from '../types';
import { FUND_ID } from '../constants';

export async function initializeDatabase(db: SQLiteDatabase): Promise<void> {
  // Run PRAGMA separately so it takes effect on the connection before DDL
  await db.execAsync('PRAGMA foreign_keys = ON;');
  await db.execAsync(SCHEMA_SQL);
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
 * Redistribute funds from one purpose category to another.
 * Inherits source tags except the origin purpose. Fund total unchanged.
 */
export async function executePurposeTransfer(
  db: SQLiteDatabase,
  sourcePurposeId: number,
  targetPurposeId: number,
  amount: number
): Promise<void> {
  await db.withTransactionAsync(async () => {
    let remaining = amount;

    const sources = await db.getAllAsync<{ id: number; amount: number }>(
      `SELECT s.id, s.amount FROM allocation_slices s
       JOIN slice_dimensions sd ON sd.slice_id = s.id AND sd.dimension_value_id = ?
       WHERE s.fund_id = ?
       ORDER BY s.amount DESC`,
      [sourcePurposeId, FUND_ID]
    );

    for (const source of sources) {
      if (remaining <= 0) break;
      const take = Math.min(source.amount, remaining);

      const accountRow = await db.getFirstAsync<{ dvId: number }>(
        `SELECT sd.dimension_value_id AS dvId
         FROM slice_dimensions sd
         JOIN dimension_values dv ON dv.id = sd.dimension_value_id
         WHERE sd.slice_id = ? AND dv.dimension_id = 1
         LIMIT 1`,
        [source.id]
      );

      if (accountRow) {
        const target = await db.getFirstAsync<{ id: number }>(
          `SELECT s.id FROM allocation_slices s
           JOIN slice_dimensions sd1 ON sd1.slice_id = s.id AND sd1.dimension_value_id = ?
           JOIN slice_dimensions sd2 ON sd2.slice_id = s.id AND sd2.dimension_value_id = ?
           WHERE s.fund_id = ? LIMIT 1`,
          [accountRow.dvId, targetPurposeId, FUND_ID]
        );

        if (target) {
          await db.runAsync(
            'UPDATE allocation_slices SET amount = amount + ? WHERE id = ?',
            [take, target.id]
          );
        } else {
          // Inherit all tags from source except sourcePurposeId, add targetPurposeId
          const otherTags = await db.getAllAsync<{ dimension_value_id: number }>(
            `SELECT dimension_value_id FROM slice_dimensions
             WHERE slice_id = ? AND dimension_value_id != ?`,
            [source.id, sourcePurposeId]
          );
          const result = await db.runAsync(
            'INSERT INTO allocation_slices (fund_id, amount) VALUES (?, ?)',
            [FUND_ID, take]
          );
          const newSliceId = result.lastInsertRowId;
          for (const tag of otherTags) {
            await db.runAsync(
              'INSERT OR IGNORE INTO slice_dimensions (slice_id, dimension_value_id) VALUES (?, ?)',
              [newSliceId, tag.dimension_value_id]
            );
          }
          await db.runAsync(
            'INSERT OR IGNORE INTO slice_dimensions (slice_id, dimension_value_id) VALUES (?, ?)',
            [newSliceId, targetPurposeId]
          );
        }
      }

      if (take === source.amount) {
        await db.runAsync('DELETE FROM allocation_slices WHERE id = ?', [source.id]);
      } else {
        await db.runAsync(
          'UPDATE allocation_slices SET amount = amount + ? WHERE id = ?',
          [-take, source.id]
        );
      }
      remaining -= take;
    }
    // Fund total unchanged for purpose transfer
  });
}
