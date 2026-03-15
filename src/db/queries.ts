import type { SQLiteDatabase } from 'expo-sqlite';
import type { AppSettings, DimensionValue, Fund, RebalanceCandidate, SliceRow } from '../types';
import { DIM_ACCOUNTS, DIM_PURPOSE, FUND_ID } from '../constants';

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
  const rows = await db.getAllAsync<{
    id: number; label: string; total: number; targetAmount: number; is_protected: number;
  }>(
    `SELECT dv.id, dv.label,
            COALESCE(SUM(s.amount), 0) AS total,
            COALESCE(pt.target_amount, 0) AS targetAmount,
            dv.is_protected
     FROM dimension_values dv
     LEFT JOIN slice_dimensions sd ON sd.dimension_value_id = dv.id
     LEFT JOIN allocation_slices s  ON s.id = sd.slice_id AND s.fund_id = ?
     LEFT JOIN purpose_targets pt   ON pt.dimension_value_id = dv.id
     WHERE dv.dimension_id = ?
     GROUP BY dv.id, dv.label, pt.target_amount, dv.is_protected
     ORDER BY dv.is_protected ASC, COALESCE(dv.sort_order, dv.id) ASC`,
    [FUND_ID, dimId]
  );
  return rows.map((r) => ({ ...r, isProtected: r.is_protected === 1 }));
}

export async function setTargetAmount(
  db: SQLiteDatabase,
  dvId: number,
  targetAmount: number
): Promise<void> {
  if (targetAmount > 0) {
    await db.runAsync(
      'INSERT OR REPLACE INTO purpose_targets (dimension_value_id, target_amount) VALUES (?, ?)',
      [dvId, targetAmount]
    );
  } else {
    await db.runAsync(
      'DELETE FROM purpose_targets WHERE dimension_value_id = ?',
      [dvId]
    );
  }
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

export async function getSettings(db: SQLiteDatabase): Promise<AppSettings> {
  const rows = await db.getAllAsync<{ key: string; value: string }>(
    'SELECT key, value FROM settings'
  );
  const map: Record<string, string> = {};
  for (const row of rows) map[row.key] = row.value;
  return {
    currency: map.currency ?? 'MYR',
    symbolDisplay: (map.symbolDisplay ?? 'show') as AppSettings['symbolDisplay'],
    numberFormat: (map.numberFormat ?? 'english') as AppSettings['numberFormat'],
  };
}

export async function setSetting(db: SQLiteDatabase, key: string, value: string): Promise<void> {
  await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value]);
}

export async function swapDimensionValueOrder(
  db: SQLiteDatabase,
  movingId: number,
  neighbourIndex: number,
  type: 'account' | 'purpose'
): Promise<void> {
  const dimId = type === 'account' ? DIM_ACCOUNTS : DIM_PURPOSE;
  const rows = await db.getAllAsync<{ id: number }>(
    'SELECT id FROM dimension_values WHERE dimension_id = ? AND is_protected = 0 ORDER BY COALESCE(sort_order, id)',
    [dimId]
  );
  const neighbourId = rows[neighbourIndex]?.id;
  if (!neighbourId) return;

  const a = await db.getFirstAsync<{ sort_order: number | null }>('SELECT sort_order FROM dimension_values WHERE id = ?', [movingId]);
  const b = await db.getFirstAsync<{ sort_order: number | null }>('SELECT sort_order FROM dimension_values WHERE id = ?', [neighbourId]);
  const sortA = a?.sort_order ?? movingId;
  const sortB = b?.sort_order ?? neighbourId;

  await db.withTransactionAsync(async () => {
    await db.runAsync('UPDATE dimension_values SET sort_order = ? WHERE id = ?', [sortB, movingId]);
    await db.runAsync('UPDATE dimension_values SET sort_order = ? WHERE id = ?', [sortA, neighbourId]);
  });
}
