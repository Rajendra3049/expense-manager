export const expenseKeys = {
  all: ["expenses"] as const,
  list: () => [...expenseKeys.all, "list"] as const,
  monthTotal: (year: number, monthIndex: number) =>
    [...expenseKeys.all, "month-total", year, monthIndex] as const,
};

export const categoryKeys = {
  all: ["categories"] as const,
};
