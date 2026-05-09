"use client";

import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useBudgetMonthOverviewQuery } from "@/features/budget/use-budget-data";
import { useCurrentMonthExpenseTotalQuery } from "@/features/expenses/use-expense-data";
import { localMonthBounds } from "@/lib/expenses/dates";
import { getFriendlyErrorMessage } from "@/lib/errors/friendly-message";

function formatMoney(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n);
}

function num(v: string | number): number {
  const parsed = typeof v === "number" ? v : Number.parseFloat(String(v));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function MonthlyTotalCard() {
  const now = useMemo(() => new Date(), []);
  const { label } = localMonthBounds(now);
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const { data: total = 0, isLoading, isError, error } =
    useCurrentMonthExpenseTotalQuery();
  const {
    data: budgetOverview,
    isLoading: budgetLoading,
    isError: budgetIsError,
    error: budgetError,
  } = useBudgetMonthOverviewQuery(year, month);

  const rawMonthlyLimit = budgetOverview?.budget
    ? num(budgetOverview.budget.total_limit)
    : null;
  /** Zero or unset total limit means no spendable cap — do not derive negative "remaining". */
  const hasEffectiveMonthlyLimit =
    rawMonthlyLimit !== null && rawMonthlyLimit > 0;
  const spentTotal = budgetOverview?.spentTotal ?? total;
  const remaining =
    hasEffectiveMonthlyLimit && rawMonthlyLimit !== null
      ? rawMonthlyLimit - spentTotal
      : null;
  const usedPct =
    hasEffectiveMonthlyLimit && rawMonthlyLimit !== null
      ? Math.min(100, (spentTotal / rawMonthlyLimit) * 100)
      : null;

  const categoryRows = useMemo(() => {
    if (!budgetOverview) return [];
    return budgetOverview.categoryBudgets
      .map((row) => {
        const limit = num(row.limit_amount);
        const spent = budgetOverview.spentByCategory[row.category_id] ?? 0;
        const pct = limit > 0 ? Math.min(100, (spent / limit) * 100) : 0;
        return {
          id: row.id,
          name: row.categories?.name ?? "Unknown category",
          spent,
          limit,
          pct,
        };
      })
      .sort((a, b) => b.pct - a.pct);
  }, [budgetOverview]);

  const categoryLimitsSection = (
    <div>
      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
        Category limits
      </p>
      {categoryRows.length === 0 ? (
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          No category caps set for this month.
        </p>
      ) : (
        <ul className="mt-2 space-y-2">
          {categoryRows.slice(0, 4).map((row) => (
            <li key={row.id}>
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="truncate text-xs text-zinc-700 dark:text-zinc-300">
                  {row.name}
                </span>
                <span className="whitespace-nowrap text-[11px] tabular-nums text-zinc-600 dark:text-zinc-400">
                  {formatMoney(row.spent)} / {formatMoney(row.limit)}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                <div
                  className={`h-full ${
                    row.pct >= 100
                      ? "bg-red-500"
                      : row.pct >= 80
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                  }`}
                  style={{ width: `${Math.max(0, Math.min(100, row.pct))}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <aside
      className="h-fit w-full rounded-xl border border-zinc-200 bg-gradient-to-b from-zinc-50 to-white p-5 shadow-sm dark:border-zinc-800 dark:from-zinc-900 dark:to-zinc-950 lg:sticky lg:top-6"
      aria-labelledby="month-total-heading"
    >
      <h2
        id="month-total-heading"
        className="text-sm font-medium text-zinc-600 dark:text-zinc-400"
      >
        This month
      </h2>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">{label}</p>
      {isLoading ? (
        <Skeleton className="mt-4 h-9 w-36 max-w-full" rounded="lg" />
      ) : isError ? (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">
          {getFriendlyErrorMessage(error)}
        </p>
      ) : (
        <p className="mt-4 text-3xl font-bold tracking-tight tabular-nums text-zinc-900 dark:text-zinc-50">
          {formatMoney(total)}
        </p>
      )}
      <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
        Total of expenses with dates in this calendar month (your device
        timezone).
      </p>

      <div className="mt-5 border-t border-zinc-200 pt-4 dark:border-zinc-800">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Budget insights
        </h3>

        {budgetLoading ? (
          <div className="mt-3 space-y-2">
            <Skeleton className="h-6 w-full" rounded="md" />
            <Skeleton className="h-6 w-full" rounded="md" />
            <Skeleton className="h-16 w-full" rounded="md" />
          </div>
        ) : budgetIsError ? (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">
            {getFriendlyErrorMessage(budgetError)}
          </p>
        ) : !budgetOverview?.budget ? (
          <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
            No monthly budget set yet. Add one in Budgets to track limit usage
            here.
          </p>
        ) : !hasEffectiveMonthlyLimit ? (
          <div className="mt-3 space-y-3">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Set a{" "}
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                positive
              </span>{" "}
              total monthly limit in Budgets to see remaining balance and usage
              progress. A zero monthly total is treated as not configured.
            </p>
            {categoryLimitsSection}
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-700 dark:bg-zinc-900/60">
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Monthly limit
                </p>
                <p className="text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                  {formatMoney(rawMonthlyLimit ?? 0)}
                </p>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-700 dark:bg-zinc-900/60">
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Remaining
                </p>
                <p
                  className={`text-sm font-semibold tabular-nums ${
                    remaining !== null && remaining < 0
                      ? "text-red-600 dark:text-red-400"
                      : "text-zinc-900 dark:text-zinc-100"
                  }`}
                >
                  {remaining !== null ? formatMoney(remaining) : "—"}
                </p>
              </div>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Used from monthly limit
                </p>
                <p className="text-[11px] font-medium tabular-nums text-zinc-700 dark:text-zinc-300">
                  {formatMoney(spentTotal)}
                  {usedPct !== null ? ` (${usedPct.toFixed(1)}%)` : ""}
                </p>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                <div
                  className={`h-full ${
                    (usedPct ?? 0) >= 100
                      ? "bg-red-500"
                      : (usedPct ?? 0) >= 80
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                  }`}
                  style={{ width: `${Math.max(0, Math.min(100, usedPct ?? 0))}%` }}
                />
              </div>
            </div>

            {categoryLimitsSection}
          </div>
        )}
      </div>
    </aside>
  );
}
