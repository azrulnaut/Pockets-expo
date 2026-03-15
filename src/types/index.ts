export interface Fund {
  id: number;
  name: string;
  total_amount: number;
}

export interface DimensionValue {
  id: number;
  label: string;
  total: number;
  targetAmount?: number;
}

export interface SliceRow {
  id: number;
  amount: number;
  other_label: string | null;
  other_dv_id: number | null;
}

export interface RebalanceCandidate {
  id: number;
  label: string;
  total: number;
  currentInAccount: number;
}

export interface Transfer {
  purposeId: number;
  portion: number;
}

export type ModalType =
  | 'none'
  | 'add'
  | 'edit'
  | 'rebalance'
  | 'deposit'
  | 'spend'
  | 'accountTransfer'
  | 'purposeTransfer';

export interface ModalPayload {
  type?: 'account' | 'purpose';
  dvId?: number;
  label?: string;
  currentTotal?: number;
  mode?: 'deposit' | 'spend' | 'rebalance';
  targetAmount?: number;
  total?: number;
}

export interface ModalConfig {
  type: ModalType;
  payload?: ModalPayload;
}
