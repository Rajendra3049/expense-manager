"use client";

import type { BudgetMonthOverview } from "@/features/budget/types";
import {
  budgetWarningLevel,
  formatBudgetPercent,
} from "@/lib/budget/warnings";

function formatMoney(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n);
}

function catName(row: BudgetMonthOverview["categoryBudgets"][number]): string {
  const c = row.categories;
  if (!c) return "—";
  const first = Array.isArray(c) ? c[0] : c;
  return first?.name ?? "—";
}

function num(v: string | number): number {
  return typeof v === "number" ? v : Number.parseFloat(v);
}

function badge(level: ReturnType<typeof budgetWarningLevel>) {
  if (level === "over")
    return (
      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-950/60 dark:text-red-200">
        Over budget
      </span>
    );
  if (level === "warn")
    return (
      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-950/50 dark:text-amber-100">
        Near limit
      </span>
    );
  return (
    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
      On track
    </span>
  );
}

type BudgetStatusPanelProps = {
  overview: BudgetMonthOverview | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
};

export function BudgetStatusPanel({
  overview,
  isLoading,
  isError,
  error,
}: BudgetStatusPanelProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-6 dark:border-zinc-800 dark:bg-zinc-900/40">
        <p className="text-sm text-zinc-500">Loading budget status…</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div
        className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950/30"
        role="alert"
      >
        <p className="text-sm text-red-800 dark:text-red-200">
          {error?.message ?? "Could not load budget."}
        </p>
      </div>
    );
  }

  if (!overview) return null;

  const totalLimit = overview.budget ? num(overview.budget.total_limit) : 0;
  const spent = overview.spentTotal;
  const totalLevel = budgetWarningLevel(spent, totalLimit);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Monthly total
          </h3>
          {overview.budget ? badge(totalLevel) : (
            <span className="text-xs text-zinc-500">No monthly cap set</span>
          )}
        </div>
        <p className="mt-1 text-2xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
          {formatMoney(spent)}
          {overview.budget ? (
            <span className="text-base font-normal text-zinc-500 dark:text-zinc-400">
              {" "}
              / {formatMoney(totalLimit)}
            </span>
          ) : null}
        </p>
        {overview.budget ? (
          <>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
              <div
                className={`h-full rounded-full transition-all ${
                  totalLevel === "over"
                    ? "bg-red-500"
                    : totalLevel === "warn"
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                }`}
                style={{
                  width: `${Math.min(100, totalLimit > 0 ? (spent / totalLimit) * 100 : spent > 0 ? 100 : 0)}%`,
                }}
              />
            </div>
            <p className="mt-2 text-xs text-zinc-500">
              {formatBudgetPercent(spent, totalLimit)} of monthly budget used
            </p>
          </>
        ) : (
          <p className="mt-2 text-xs text-zinc-500">
            Set a total budget below to track spending against a monthly cap.
          </p>
        )}
      </div>

      {overview.categoryBudgets.length > 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Category limits
          </h3>
          <ul className="mt-3 divide-y divide-zinc-100 dark:divide-zinc-800">
            {overview.categoryBudgets.map((row) => {
              const cap = num(row.limit_amount);
              const s = overview.spentByCategory[row.category_id] ?? 0;
              const lvl = budgetWarningLevel(s, cap);
              return (
                <li
                  key={row.id}
                  className="flex flex-col gap-2 py-3 first:pt-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-zinc-100">
                      {catName(row)}
                    </p>
                    <p className="text-sm tabular-nums text-zinc-600 dark:text-zinc-400">
                      {formatMoney(s)} / {formatMoney(cap)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {badge(lvl)}
                    <div className="h-2 w-full max-w-[140px] overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800 sm:w-28">
                      <div
                        className={`h-full rounded-full ${
                          lvl === "over"
                            ? "bg-red-500"
                            : lvl === "warn"
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                        }`}
                        style={{
                          width: `${Math.min(100, cap > 0 ? (s / cap) * 100 : s > 0 ? 100 : 0)}%`,
                        }}
                      />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
