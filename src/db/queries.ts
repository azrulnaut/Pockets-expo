import type { SQLiteDatabase } from 'expo-sqlite';
import type { DimensionValue, Fund, RebalanceCandidate, SliceRow } from '../types';
import { FUND_ID } from '../constants';

export async function getState(
  db: SQLiteDatabase
): Promise<{ fund: Fund; accounts: DimensionValue[]; purposes: DimensionValue[] }> {
  const fund = await db.getFirstAsync<Fund>(
    'SELECT id, name, total_amount FROM funds WHERE id = ?',
    [FUND_ID]
  );
  const accounts = await getDimensionTotals(db, 1);
  const purposes = await getDimensionTotals(db, 2);
  return { fund: fund!, accounts, purposes };
}

export async function getDimensionTotals(
  db: SQLiteDatabase,
  dimId: number
): Promise<DimensionValue[]> {
  return db.getAllAsync<DimensionValue>(
    `SELECT dv.id, dv.label, COALESCE(SUM(s.amount), 0) AS total
     FROM dimension_values dv
     LEFT JOIN slice_dimensions sd ON sd.dimension_value_id = dv.id
     LEFT JOIN allocation_slices s ON s.id = sd.slice_id AND s.fund_id = ?
     WHERE dv.dimension_id = ?
     GROUP BY dv.id, dv.label
     ORDER BY dv.label`,
    [FUND_ID, dimId]
  );
}

export async function getSlicesForDimensionValue(
  db: SQLiteDatabase,
  dvId: number,
  otherDimId: number
): Promise<SliceRow[]> {
  return db.getAllAsync<SliceRow>(
    `SELECT s.id, s.amount,
       (SELECT dv.label FROM slice_dimensions sd2
        JOIN dimension_values dv ON dv.id = sd2.dimension_value_id
        WHERE sd2.slice_id = s.id AND dv.dimension_id = ?
        LIMIT 1) AS other_label,
       (SELECT dv.id FROM slice_dimensions sd2
        JOIN dimension_values dv ON dv.id = sd2.dimension_value_id
        WHERE sd2.slice_id = s.id AND dv.dimension_id = ?
        LIMIT 1) AS other_dv_id
     FROM allocation_slices s
     JOIN slice_dimensions sd1 ON sd1.slice_id = s.id AND sd1.dimension_value_id = ?
     WHERE s.fund_id = ?
     ORDER BY s.amount DESC`,
    [otherDimId, otherDimId, dvId, FUND_ID]
  );
}

export async function getAccountTotal(db: SQLiteDatabase, accountDvId: number): Promise<number> {
  const row = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(s.amount), 0) AS total
     FROM allocation_slices s
     JOIN slice_dimensions sd ON sd.slice_id = s.id AND sd.dimension_value_id = ?
     WHERE s.fund_id = ?`,
    [accountDvId, FUND_ID]
  );
  return row?.total ?? 0;
}

export async function getPurposeTotal(db: SQLiteDatabase, purposeDvId: number): Promise<number> {
  const row = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(s.amount), 0) AS total
     FROM allocation_slices s
     JOIN slice_dimensions sd ON sd.slice_id = s.id AND sd.dimension_value_id = ?
     WHERE s.fund_id = ?`,
    [purposeDvId, FUND_ID]
  );
  return row?.total ?? 0;
}

export async function getRebalanceCandidates(
  db: SQLiteDatabase,
  accountDvId: number,
  newTotal: number
): Promise<{ delta: number; currentTotal: number; newTotal: number; purposes: RebalanceCandidate[] }> {
  const currentTotal = await getAccountTotal(db, accountDvId);
  const delta = newTotal - currentTotal;

  const allPurposes = await getDimensionTotals(db, 2);
  const purposes: RebalanceCandidate[] = await Promise.all(
    allPurposes.map(async (p) => {
      const row = await db.getFirstAsync<{ total: number }>(
        `SELECT COALESCE(SUM(s.amount), 0) AS total
         FROM allocation_slices s
         JOIN slice_dimensions sd1 ON sd1.slice_id = s.id AND sd1.dimension_value_id = ?
         JOIN slice_dimensions sd2 ON sd2.slice_id = s.id AND sd2.dimension_value_id = ?
         WHERE s.fund_id = ?`,
        [accountDvId, p.id, FUND_ID]
      );
      return { ...p, currentInAccount: row?.total ?? 0 };
    })
  );

  return { delta, currentTotal, newTotal, purposes };
}

export async function createDimensionValue(
  db: SQLiteDatabase,
  dimensionId: number,
  label: string
): Promise<number> {
  const result = await db.runAsync(
    'INSERT INTO dimension_values (dimension_id, label) VALUES (?, ?)',
    [dimensionId, label.trim()]
  );
  return result.lastInsertRowId;
}

export async function renameDimensionValue(
  db: SQLiteDatabase,
  dvId: number,
  dimensionId: number,
  label: string
): Promise<void> {
  await db.runAsync(
    'UPDATE dimension_values SET label = ? WHERE id = ? AND dimension_id = ?',
    [label.trim(), dvId, dimensionId]
  );
}

export async function deleteDimensionValue(
  db: SQLiteDatabase,
  dvId: number,
  dimensionId: number
): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'DELETE FROM allocation_slices WHERE id IN (SELECT slice_id FROM slice_dimensions WHERE dimension_value_id = ?)',
      [dvId]
    );
    await db.runAsync(
      'DELETE FROM dimension_values WHERE id = ? AND dimension_id = ?',
      [dvId, dimensionId]
    );
    await syncFundTotal(db);
  });
}

export async function syncFundTotal(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ total: number }>(
    'SELECT COALESCE(SUM(amount), 0) AS total FROM allocation_slices WHERE fund_id = ?',
    [FUND_ID]
  );
  const total = row?.total ?? 0;
  await db.runAsync('UPDATE funds SET total_amount = ? WHERE id = ?', [total, FUND_ID]);
  return total;
}
