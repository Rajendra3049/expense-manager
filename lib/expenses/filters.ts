export type ExpenseArchiveScope = "active" | "archived" | "all";

export type ExpenseListFilters = {
  from?: string;
  to?: string;
  categoryId?: string;
  /** Matches note (ilike) or category name (ilike). */
  search?: string;
  archiveScope?: ExpenseArchiveScope;
};

export function expenseFiltersKey(f: ExpenseListFilters | undefined): string {
  if (!f) return "";
  return [
    f.from ?? "",
    f.to ?? "",
    f.categoryId ?? "",
    f.search ?? "",
    f.archiveScope ?? "active",
  ].join("|");
}
