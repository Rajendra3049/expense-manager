export const budgetKeys = {
  all: ["budgets"] as const,
  monthOverview: (year: number, month: number) =>
    [...budgetKeys.all, "overview", year, month] as const,
};
