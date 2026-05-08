export type CategoryTotalRow = {
  category_id: string;
  category_name: string;
  total_amount: number;
};

export type MonthlyTrendRow = {
  year: number;
  month: number;
  total_amount: number;
};

export type AnalyticsExpenseRow = {
  id: string;
  amount: number;
  date: string;
  category_id: string;
  category_name: string;
  note: string | null;
};
