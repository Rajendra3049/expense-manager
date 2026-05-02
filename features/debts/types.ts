export type DebtRow = {
  id: string;
  counterparty: string;
  type: "give" | "take";
  status: "active" | "settled";
  amount: string | number;
  note: string;
  settled_at: string | null;
  created_at: string;
};
