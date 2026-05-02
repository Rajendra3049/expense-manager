export type InvestmentRow = {
  id: string;
  name: string;
  type: "stock" | "mutual_fund" | "fd" | "crypto" | "other";
  current_value: string | number;
  note: string;
  created_at: string;
};
