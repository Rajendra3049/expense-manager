export type EmiRow = {
  id: string;
  name: string;
  total_amount: string | number;
  monthly_amount: string | number;
  remaining_amount: string | number;
  due_date: string;
  note: string;
  created_at: string;
};
