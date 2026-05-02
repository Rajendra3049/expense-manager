"use client";

import { useMemo } from "react";
import { useCurrentMonthExpenseTotalQuery } from "@/features/expenses/use-expense-data";
import { localMonthBounds } from "@/lib/expenses/dates";

function formatMoney(n: number): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(n);
}

export function MonthlyTotalCard() {
  const now = useMemo(() => new Date(), []);
  const { label } = localMonthBounds(now);
  const { data: total = 0, isLoading, isError, error } =
    useCurrentMonthExpenseTotalQuery();

  return (
    <aside
      className="h-fit rounded-xl border border-zinc-200 bg-gradient-to-b from-zinc-50 to-white p-5 shadow-sm dark:border-zinc-800 dark:from-zinc-900 dark:to-zinc-950 lg:sticky lg:top-6"
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
        <p className="mt-4 text-2xl font-semibold tabular-nums text-zinc-400">
          …
        </p>
      ) : isError ? (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error instanceof Error ? error.message : "Could not load total."}
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
    </aside>
  );
}
