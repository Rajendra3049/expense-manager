export const analyticsKeys = {
  all: ["analytics"] as const,
  categoryTotals: (from: string, to: string) =>
    [...analyticsKeys.all, "category-totals", from, to] as const,
  monthlyTrends: (months: number) =>
    [...analyticsKeys.all, "monthly-trends", months] as const,
  expenseRows: (from: string, to: string) =>
    [...analyticsKeys.all, "expense-rows", from, to] as const,
};
