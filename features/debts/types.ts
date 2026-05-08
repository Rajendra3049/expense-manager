export type DebtAccountRow = {
  id: string;
  name: string;
  type: "given" | "taken";
  due_date: string | null;
  note: string;
  balance: string | number;
  is_settled: boolean;
  settled_at: string | null;
  created_at: string;
  updated_at: string;
};

export type DebtEntryRow = {
  id: string;
  debt_account_id: string;
  entry_type: "borrow" | "payment";
  amount: string | number;
  note: string;
  happened_on: string;
  created_at: string;
};
