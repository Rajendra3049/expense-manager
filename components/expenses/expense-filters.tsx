"use client";

import { useMemo, useState } from "react";
import { useCategoriesQuery } from "@/features/expenses/use-expense-data";
import type { ExpenseListFilters } from "@/lib/expenses/filters";

type ExpenseFiltersProps = {
  value: ExpenseListFilters;
  onChange: (next: ExpenseListFilters) => void;
};

export function ExpenseFilters({ value, onChange }: ExpenseFiltersProps) {
  const { data: categories = [] } = useCategoriesQuery();
  const expenseCategories = useMemo(
    () => categories.filter((c) => c.type === "expense"),
    [categories],
  );

  const [draftFrom, setDraftFrom] = useState(value.from ?? "");
  const [draftTo, setDraftTo] = useState(value.to ?? "");
  const [draftCategory, setDraftCategory] = useState(value.categoryId ?? "");

  function apply() {
    onChange({
      from: draftFrom.trim() || undefined,
      to: draftTo.trim() || undefined,
      categoryId: draftCategory || undefined,
    });
  }

  function clear() {
    setDraftFrom("");
    setDraftTo("");
    setDraftCategory("");
    onChange({});
  }

  return (
    <section
      className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 sm:p-5"
      aria-labelledby="expense-filters-heading"
    >
      <h2
        id="expense-filters-heading"
        className="text-sm font-semibold text-zinc-900 dark:text-zinc-50"
      >
        Filters
      </h2>
      <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
        Filter by date range and/or category. Leave dates empty to show all
        dates.
      </p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div>
          <label
            htmlFor="filter-from"
            className="block text-xs font-medium text-zinc-600 dark:text-zinc-400"
          >
            From
          </label>
          <input
            id="filter-from"
            type="date"
            value={draftFrom}
            onChange={(e) => setDraftFrom(e.target.value)}
            className="mt-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <div>
          <label
            htmlFor="filter-to"
            className="block text-xs font-medium text-zinc-600 dark:text-zinc-400"
          >
            To
          </label>
          <input
            id="filter-to"
            type="date"
            value={draftTo}
            onChange={(e) => setDraftTo(e.target.value)}
            className="mt-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <div className="min-w-0 sm:min-w-[200px]">
          <label
            htmlFor="filter-category"
            className="block text-xs font-medium text-zinc-600 dark:text-zinc-400"
          >
            Category
          </label>
          <select
            id="filter-category"
            value={draftCategory}
            onChange={(e) => setDraftCategory(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="">All categories</option>
            {expenseCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2 pt-1 sm:pt-0">
          <button
            type="button"
            onClick={apply}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Apply
          </button>
          <button
            type="button"
            onClick={clear}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-900"
          >
            Clear
          </button>
        </div>
      </div>
    </section>
  );
}
