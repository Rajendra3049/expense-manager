"use client";

import { useMemo, useState } from "react";
import { CategoryPieChart } from "@/components/analytics/category-pie-chart";
import { MonthlyBarChart } from "@/components/analytics/monthly-bar-chart";
import {
  useCategoryTotalsQuery,
  useMonthlyTrendsQuery,
} from "@/features/analytics/use-analytics-data";
import { toLocalDateString } from "@/lib/expenses/dates";
import { getSupabaseRequestErrorMessage } from "@/lib/supabase/error-message";

function defaultCategoryRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to.getFullYear(), to.getMonth() - 11, 1);
  return {
    from: toLocalDateString(from),
    to: toLocalDateString(to),
  };
}

export function AnalyticsDashboard() {
  const defaults = useMemo(() => defaultCategoryRange(), []);
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const [trendMonths] = useState(12);

  const categoryQuery = useCategoryTotalsQuery(from, to);
  const trendsQuery = useMonthlyTrendsQuery(trendMonths);

  const categoryError =
    categoryQuery.isError && categoryQuery.error
      ? getSupabaseRequestErrorMessage(categoryQuery.error)
      : null;
  const trendsError =
    trendsQuery.isError && trendsQuery.error
      ? getSupabaseRequestErrorMessage(trendsQuery.error)
      : null;

  return (
    <div className="space-y-10">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Analytics
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Spending by category (pie) and month-over-month totals (bar). Data
          comes from Supabase aggregation RPCs.
        </p>
      </header>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              By category
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Sums expenses in the selected date range.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div>
              <label
                htmlFor="analytics-from"
                className="block text-xs font-medium text-zinc-600 dark:text-zinc-400"
              >
                From
              </label>
              <input
                id="analytics-from"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="mt-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
            </div>
            <div>
              <label
                htmlFor="analytics-to"
                className="block text-xs font-medium text-zinc-600 dark:text-zinc-400"
              >
                To
              </label>
              <input
                id="analytics-to"
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="mt-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
            </div>
          </div>
        </div>

        {categoryError ? (
          <p className="mt-4 text-sm text-red-600" role="alert">
            {categoryError}
          </p>
        ) : categoryQuery.isLoading ? (
          <p className="mt-6 text-sm text-zinc-500">Loading chart…</p>
        ) : (
          <div className="mt-6">
            <CategoryPieChart data={categoryQuery.data ?? []} />
          </div>
        )}
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:p-6">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Monthly trends
        </h2>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Last {trendMonths} calendar months (including months with $0 spend).
        </p>

        {trendsError ? (
          <p className="mt-4 text-sm text-red-600" role="alert">
            {trendsError}
          </p>
        ) : trendsQuery.isLoading ? (
          <p className="mt-6 text-sm text-zinc-500">Loading chart…</p>
        ) : (
          <div className="mt-6">
            <MonthlyBarChart data={trendsQuery.data ?? []} />
          </div>
        )}
      </section>
    </div>
  );
}
