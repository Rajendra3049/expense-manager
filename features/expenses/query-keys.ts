import type { ExpenseListFilters } from "@/lib/expenses/filters";

export const expenseKeys = {
  all: ["expenses"] as const,
  list: (filters?: ExpenseListFilters) =>
    [
      ...expenseKeys.all,
      "list",
      filters?.from ?? "",
      filters?.to ?? "",
      filters?.categoryId ?? "",
    ] as const,
  monthTotal: (year: number, monthIndex: number) =>
    [...expenseKeys.all, "month-total", year, monthIndex] as const,
};

export const categoryKeys = {
  all: ["categories"] as const,
};
