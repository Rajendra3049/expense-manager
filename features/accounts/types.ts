export type AccountRow = {
  id: string;
  name: string;
  type: "cash" | "bank" | "wallet";
  balance: string | number;
  created_at: string;
};

export type RecurringAccountAdjustmentRow = {
  id: string;
  account_id: string;
  direction: "credit" | "debit";
  amount: string | number;
  day_of_month: number;
  note: string | null;
  is_active: boolean;
  last_applied_on: string | null;
  created_at: string;
};

export type AccountAdjustmentRow = {
  id: string;
  account_id: string | null;
  account_name_snapshot: string;
  direction: "credit" | "debit";
  amount: string | number;
  note: string | null;
  effective_date: string;
  created_at: string;
};
