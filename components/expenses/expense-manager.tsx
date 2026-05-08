"use client";

import { useState } from "react";
import { AddCategoryForm } from "@/components/expenses/add-category-form";
import { ExpenseFilters } from "@/components/expenses/expense-filters";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { ExpenseList } from "@/components/expenses/expense-list";
import { MonthlyTotalCard } from "@/components/expenses/monthly-total-card";
import { RecurringDueProcessor } from "@/components/recurring/recurring-due-processor";
import {
  expenseFiltersKey,
  type ExpenseListFilters,
} from "@/lib/expenses/filters";

export function ExpenseManager() {
  const [listFilters, setListFilters] = useState<ExpenseListFilters>({});
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(true);

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Expenses
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Capture daily spending quickly, organize categories, and monitor this
          month&apos;s total in one place.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(260px,320px)] lg:items-start">
        <div className="space-y-6">
          <RecurringDueProcessor />
          <ExpenseForm />
          <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:p-5">
            <button
              type="button"
              className="flex w-full cursor-pointer items-center justify-between rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:focus-visible:ring-zinc-600"
              aria-expanded={categoriesOpen}
              aria-controls="manage-categories-panel"
              onClick={() => setCategoriesOpen((v) => !v)}
            >
              <div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  Manage categories
                </p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Set up categories once or edit them occasionally.
                </p>
              </div>
              <span
                className={`ml-4 text-lg leading-none text-zinc-500 transition-transform duration-300 dark:text-zinc-400 ${
                  categoriesOpen ? "rotate-180" : ""
                }`}
                aria-hidden="true"
              >
                ▾
              </span>
            </button>
            <div
              id="manage-categories-panel"
              className={`grid overflow-hidden transition-all duration-300 ease-in-out ${
                categoriesOpen
                  ? "mt-4 grid-rows-[1fr] opacity-100"
                  : "mt-0 grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="min-h-0">
                <AddCategoryForm />
              </div>
            </div>
          </section>
          <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:p-5">
            <button
              type="button"
              className="flex w-full cursor-pointer items-center justify-between rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:focus-visible:ring-zinc-600"
              aria-expanded={historyOpen}
              aria-controls="expense-history-panel"
              onClick={() => setHistoryOpen((v) => !v)}
            >
              <div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  Expense history
                </p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Filter and review your recorded expenses.
                </p>
              </div>
              <span
                className={`ml-4 text-lg leading-none text-zinc-500 transition-transform duration-300 dark:text-zinc-400 ${
                  historyOpen ? "rotate-180" : ""
                }`}
                aria-hidden="true"
              >
                ▾
              </span>
            </button>
            <div
              id="expense-history-panel"
              className={`grid overflow-hidden transition-all duration-300 ease-in-out ${
                historyOpen
                  ? "mt-4 grid-rows-[1fr] opacity-100"
                  : "mt-0 grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="min-h-0 min-w-0 space-y-4">
                <ExpenseFilters
                  key={expenseFiltersKey(listFilters)}
                  value={listFilters}
                  onChange={setListFilters}
                />
                <ExpenseList filters={listFilters} />
              </div>
            </div>
          </section>
        </div>
        <MonthlyTotalCard />
      </div>
    </div>
  );
}
