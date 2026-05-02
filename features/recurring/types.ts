import type { RecurringFrequency } from "@/lib/expenses/dates";

export type RecurringExpenseRow = {
  id: string;
  label: string;
  amount: string | number;
  category_id: string;
  account_id: string | null;
  frequency: RecurringFrequency;
  next_date: string;
  note: string;
  is_active: boolean;
  created_at: string;
};
