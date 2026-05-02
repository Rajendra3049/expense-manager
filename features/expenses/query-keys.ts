import type { ExpenseListFilters } from "@/lib/expenses/filters";

const expenseFilterKeyParts = (filters?: ExpenseListFilters) =>
  [
    filters?.from ?? "",
    filters?.to ?? "",
    filters?.categoryId ?? "",
    filters?.search ?? "",
    filters?.archiveScope ?? "active",
  ] as const;

export const expenseKeys = {
  all: ["expenses"] as const,
  infiniteList: (filters?: ExpenseListFilters) =>
    [...expenseKeys.all, "infinite", ...expenseFilterKeyParts(filters)] as const,
  monthTotal: (year: number, monthIndex: number) =>
    [...expenseKeys.all, "month-total", year, monthIndex] as const,
};

export const categoryKeys = {
  all: ["categories"] as const,
};
