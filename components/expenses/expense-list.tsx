"use client";

import {
  useDeleteExpenseMutation,
  useExpensesListQuery,
} from "@/features/expenses/use-expense-data";
import type { ExpenseListFilters } from "@/lib/expenses/filters";
import {
  expenseAccountName,
  expenseCategoryName,
  expenseTripName,
  type ExpenseListRow,
} from "@/lib/expenses/types";

function formatMoney(value: string | number): string {
  const n = typeof value === "number" ? value : Number.parseFloat(value);
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);
}

function formatDisplayDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return isoDate;
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function ExpenseRowCard({
  row,
  onDelete,
  isDeleting,
}: {
  row: ExpenseListRow;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}) {
  return (
    <article className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800 md:hidden">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
            {formatMoney(row.amount)}
          </p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {expenseCategoryName(row)}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-500">
            {formatDisplayDate(row.date)}
            {expenseAccountName(row) !== "—" ? (
              <> · {expenseAccountName(row)}</>
            ) : null}
            {expenseTripName(row) !== "—" ? (
              <> · Trip: {expenseTripName(row)}</>
            ) : null}
          </p>
          {row.note ? (
            <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
              {row.note}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          disabled={isDeleting}
          onClick={() => {
            onDelete(row.id);
          }}
          className="shrink-0 rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40"
        >
          Delete
        </button>
      </div>
    </article>
  );
}

type ExpenseListProps = {
  filters?: ExpenseListFilters;
};

export function ExpenseList({ filters }: ExpenseListProps) {
  const { data: rows = [], isLoading, isError, error } =
    useExpensesListQuery(filters);
  const deleteExpense = useDeleteExpenseMutation();

  function handleDelete(id: string) {
    const ok = window.confirm(
      "Delete this expense? This cannot be undone.",
    );
    if (!ok) return;
    void deleteExpense.mutateAsync(id);
  }

  if (isLoading) {
    return (
      <section
        className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950"
        aria-busy="true"
      >
        <p className="text-sm text-zinc-500">Loading expenses…</p>
      </section>
    );
  }

  if (isError) {
    return (
      <section
        className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950/30"
        role="alert"
      >
        <p className="text-sm text-red-800 dark:text-red-200">
          {error instanceof Error ? error.message : "Could not load expenses."}
        </p>
      </section>
    );
  }

  if (rows.length === 0) {
    return (
      <section className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/80 p-8 text-center dark:border-zinc-700 dark:bg-zinc-900/40">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No expenses yet. Add your first expense above.
        </p>
      </section>
    );
  }

  return (
    <section
      className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
      aria-labelledby="expense-list-heading"
    >
      <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800 sm:px-5">
        <h2
          id="expense-list-heading"
          className="text-base font-semibold text-zinc-900 dark:text-zinc-50"
        >
          Expenses
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Newest first by date
        </p>
      </div>

      <div className="flex flex-col gap-3 p-4 md:hidden">
        {rows.map((row) => (
          <ExpenseRowCard
            key={row.id}
            row={row}
            onDelete={handleDelete}
            isDeleting={deleteExpense.isPending}
          />
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-medium uppercase tracking-wide text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
            <tr>
              <th className="px-4 py-3 sm:px-5">Date</th>
              <th className="px-4 py-3 sm:px-5">Category</th>
              <th className="px-4 py-3 sm:px-5">Account</th>
              <th className="px-4 py-3 sm:px-5">Trip</th>
              <th className="px-4 py-3 sm:px-5">Note</th>
              <th className="px-4 py-3 text-right sm:px-5">Amount</th>
              <th className="px-4 py-3 sm:px-5">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-900/30">
                <td className="whitespace-nowrap px-4 py-3 text-zinc-700 dark:text-zinc-300 sm:px-5">
                  {formatDisplayDate(row.date)}
                </td>
                <td className="px-4 py-3 text-zinc-800 dark:text-zinc-200 sm:px-5">
                  {expenseCategoryName(row)}
                </td>
                <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300 sm:px-5">
                  {expenseAccountName(row)}
                </td>
                <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300 sm:px-5">
                  {expenseTripName(row)}
                </td>
                <td className="max-w-[200px] truncate px-4 py-3 text-zinc-600 dark:text-zinc-400 sm:px-5">
                  {row.note || "—"}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums text-zinc-900 dark:text-zinc-50 sm:px-5">
                  {formatMoney(row.amount)}
                </td>
                <td className="px-4 py-3 sm:px-5">
                  <button
                    type="button"
                    disabled={deleteExpense.isPending}
                    onClick={() => handleDelete(row.id)}
                    className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
