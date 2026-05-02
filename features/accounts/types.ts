export type AccountRow = {
  id: string;
  name: string;
  type: "cash" | "bank" | "wallet";
  balance: string | number;
  created_at: string;
};
