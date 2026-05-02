export type CategoryRow = {
  id: string;
  name: string;
  type: "expense" | "income";
};

export type ExpenseListRow = {
  id: string;
  amount: string | number;
  date: string;
  note: string;
  created_at: string;
  category_id: string;
  account_id: string | null;
  categories: { id: string; name: string } | { id: string; name: string }[] | null;
  accounts: { id: string; name: string } | { id: string; name: string }[] | null;
};

export function expenseCategoryName(row: ExpenseListRow): string {
  const c = row.categories;
  if (!c) return "—";
  const first = Array.isArray(c) ? c[0] : c;
  return first?.name ?? "—";
}

export function expenseAccountName(row: ExpenseListRow): string {
  const a = row.accounts;
  if (!a) return "—";
  const first = Array.isArray(a) ? a[0] : a;
  return first?.name ?? "—";
}
