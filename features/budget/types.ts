export type BudgetRow = {
  id: string;
  user_id: string;
  year: number;
  month: number;
  total_limit: string | number;
  created_at: string;
};

export type CategoryBudgetRow = {
  id: string;
  budget_id: string;
  category_id: string;
  limit_amount: string | number;
  categories: { id: string; name: string } | null;
};

export type BudgetMonthOverview = {
  year: number;
  month: number;
  budget: BudgetRow | null;
  categoryBudgets: CategoryBudgetRow[];
  spentTotal: number;
  spentByCategory: Record<string, number>;
};
