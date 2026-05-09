"use client";

import { useMemo, useState } from "react";
import { BudgetEditorForm } from "@/components/budget/budget-editor-form";
import { BudgetStatusPanel } from "@/components/budget/budget-status-panel";
import { useBudgetMonthOverviewQuery } from "@/features/budget/use-budget-data";
import { useCategoriesQuery } from "@/features/expenses/use-expense-data";

function num(v: string | number): number {
  return typeof v === "number" ? v : Number.parseFloat(String(v));
}

const YEAR_OPTS = (() => {
  const y = new Date().getFullYear();
  return Array.from({ length: 9 }, (_, i) => y - 4 + i);
})();

export function BudgetManager() {
  const now = useMemo(() => new Date(), []);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const overview = useBudgetMonthOverviewQuery(year, month);
  const { data: categories = [] } = useCategoriesQuery();
  const expenseCategories = useMemo(
    () => categories.filter((c) => c.type === "expense"),
    [categories],
  );

  const editorInitials = useMemo(() => {
    if (!overview.data) {
      return {
        total: "0",
        categoryLimits: {} as Record<string, string>,
      };
    }
    const b = overview.data.budget;
    const total = b ? String(num(b.total_limit)) : "0";
    const categoryLimits: Record<string, string> = {};
    for (const cat of expenseCategories) {
      const row = overview.data.categoryBudgets.find(
        (r) => r.category_id === cat.id,
      );
      categoryLimits[cat.id] = row ? String(num(row.limit_amount)) : "";
    }
    return { total, categoryLimits };
  }, [overview.data, expenseCategories]);

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Budgets
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Set monthly budget limits for total spend and categories. Get early
          warnings at 80% and alerts at 100% usage.
        </p>
      </header>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/30">
        <div>
          <label
            htmlFor="budget-year"
            className="block text-xs font-medium text-zinc-600 dark:text-zinc-400"
          >
            Year
          </label>
          <select
            id="budget-year"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="native-select mt-1 min-w-[5.5rem] rounded-lg border border-zinc-300 bg-white py-2 pl-3 pr-10 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            {YEAR_OPTS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="budget-month"
            className="block text-xs font-medium text-zinc-600 dark:text-zinc-400"
          >
            Month
          </label>
          <select
            id="budget-month"
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="native-select mt-1 min-w-[9rem] rounded-lg border border-zinc-300 bg-white py-2 pl-3 pr-10 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(2000, i, 1).toLocaleString(undefined, {
                  month: "long",
                })}
              </option>
            ))}
          </select>
        </div>
      </div>

      <BudgetStatusPanel
        overview={overview.data}
        isLoading={overview.isLoading}
        isError={overview.isError}
        error={overview.error instanceof Error ? overview.error : null}
      />

      {overview.isError ? (
        <p className="text-sm text-red-600" role="alert">
          Could not load budget editor. Try again later.
        </p>
      ) : overview.isSuccess ? (
        <BudgetEditorForm
          key={`${year}-${month}-${overview.dataUpdatedAt}`}
          year={year}
          month={month}
          initialTotal={editorInitials.total}
          initialCategoryLimits={editorInitials.categoryLimits}
          expenseCategories={expenseCategories}
        />
      ) : (
        <p className="text-sm text-zinc-500">Loading editor…</p>
      )}
    </div>
  );
}
