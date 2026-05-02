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
  categories: { id: string; name: string } | { id: string; name: string }[] | null;
};

export function expenseCategoryName(row: ExpenseListRow): string {
  const c = row.categories;
  if (!c) return "—";
  const first = Array.isArray(c) ? c[0] : c;
  return first?.name ?? "—";
}
