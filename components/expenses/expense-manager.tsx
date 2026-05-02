"use client";

import { AddCategoryForm } from "@/components/expenses/add-category-form";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { ExpenseList } from "@/components/expenses/expense-list";
import { MonthlyTotalCard } from "@/components/expenses/monthly-total-card";

export function ExpenseManager() {
  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Expenses
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Add categories, record spending, and track this month&apos;s total.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1fr_minmax(0,280px)] lg:items-start">
        <div className="space-y-6">
          <AddCategoryForm />
          <ExpenseForm />
          <ExpenseList />
        </div>
        <MonthlyTotalCard />
      </div>
    </div>
  );
}
