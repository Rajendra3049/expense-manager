export type ExpenseListFilters = {
  from?: string;
  to?: string;
  categoryId?: string;
};

export function expenseFiltersKey(f: ExpenseListFilters | undefined): string {
  if (!f) return "";
  return [f.from ?? "", f.to ?? "", f.categoryId ?? ""].join("|");
}
