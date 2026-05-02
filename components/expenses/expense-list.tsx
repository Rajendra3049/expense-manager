"use client";

import { ExpenseListSkeleton } from "@/components/ui/expense-list-skeleton";
import { Spinner } from "@/components/ui/spinner";
import {
  useDeleteExpenseMutation,
  useExpensesInfiniteQuery,
  useSetExpenseArchivedMutation,
} from "@/features/expenses/use-expense-data";
import { getFriendlyErrorMessage } from "@/lib/errors/friendly-message";
import { downloadExpensesCsv } from "@/lib/expenses/csv-export";
import type { ExpenseListFilters } from "@/lib/expenses/filters";
import {
  expenseAccountName,
  expenseCategoryName,
  expenseTagsList,
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

function hasListFilters(filters?: ExpenseListFilters): boolean {
  if (!filters) return false;
  return Boolean(
    filters.from ||
      filters.to ||
      filters.categoryId ||
      filters.search?.trim() ||
      (filters.archiveScope && filters.archiveScope !== "active"),
  );
}

function ExpenseRowCard({
  row,
  onDelete,
  onArchiveToggle,
  isDeleting,
  isArchiving,
}: {
  row: ExpenseListRow;
  onDelete: (id: string) => void;
  onArchiveToggle: (row: ExpenseListRow) => void;
  isDeleting: boolean;
  isArchiving: boolean;
}) {
  const tags = expenseTagsList(row);
  const archived = Boolean(row.archived_at);

  return (
    <article className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800 md:hidden">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
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
            {archived ? (
              <span className="ml-1 rounded bg-zinc-200 px-1 py-0.5 text-[10px] font-medium text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200">
                Archived
              </span>
            ) : null}
          </p>
          {tags.length > 0 ? (
            <p className="mt-1 flex flex-wrap gap-1 text-xs text-zinc-600 dark:text-zinc-400">
              {tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-zinc-100 px-2 py-0.5 dark:bg-zinc-800"
                >
                  {t}
                </span>
              ))}
            </p>
          ) : null}
          {row.note ? (
            <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
              {row.note}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col gap-1">
          <button
            type="button"
            disabled={isArchiving}
            onClick={() => onArchiveToggle(row)}
            className="rounded-lg border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-900"
          >
            {archived ? "Unarchive" : "Archive"}
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={() => {
              onDelete(row.id);
            }}
            className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40"
          >
            Delete
          </button>
        </div>
      </div>
    </article>
  );
}

type ExpenseListProps = {
  filters?: ExpenseListFilters;
};

export function ExpenseList({ filters }: ExpenseListProps) {
  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useExpensesInfiniteQuery(filters);
  const rows = data?.pages.flatMap((p) => p) ?? [];
  const deleteExpense = useDeleteExpenseMutation();
  const setArchived = useSetExpenseArchivedMutation();

  function handleDelete(id: string) {
    const ok = window.confirm(
      "Delete this expense? This cannot be undone.",
    );
    if (!ok) return;
    void deleteExpense.mutateAsync(id);
  }

  function handleArchiveToggle(row: ExpenseListRow) {
    const next = !row.archived_at;
    const ok = window.confirm(
      next
        ? "Archive this expense? It will be hidden from default lists and totals."
        : "Restore this expense from the archive?",
    );
    if (!ok) return;
    void setArchived.mutateAsync({ id: row.id, archived: next });
  }

  function handleExportCsv() {
    const stamp = new Date().toISOString().slice(0, 10);
    downloadExpensesCsv(
      rows,
      `expenses-loaded-${stamp}.csv`,
    );
  }

  if (isLoading) {
    return <ExpenseListSkeleton />;
  }

  if (isError) {
    return (
      <section
        className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950/30"
        role="alert"
      >
        <p className="text-sm text-red-800 dark:text-red-200">
          {getFriendlyErrorMessage(error)}
        </p>
      </section>
    );
  }

  if (rows.length === 0) {
    return (
      <section className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/80 p-8 text-center dark:border-zinc-700 dark:bg-zinc-900/40">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {hasListFilters(filters)
            ? "No expenses match your filters. Try adjusting search or dates."
            : "No expenses yet. Add your first expense above."}
        </p>
      </section>
    );
  }

  return (
    <section
      className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
      aria-labelledby="expense-list-heading"
    >
      <div className="flex flex-col gap-2 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div>
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
        <button
          type="button"
          title="Exports all rows loaded below (use Load more to include additional pages)"
          onClick={handleExportCsv}
          className="shrink-0 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-900"
        >
          Export loaded CSV
        </button>
      </div>

      <div className="flex flex-col gap-3 p-4 md:hidden">
        {rows.map((row) => (
          <ExpenseRowCard
            key={row.id}
            row={row}
            onDelete={handleDelete}
            onArchiveToggle={handleArchiveToggle}
            isDeleting={deleteExpense.isPending}
            isArchiving={setArchived.isPending}
          />
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-medium uppercase tracking-wide text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
            <tr>
              <th className="px-4 py-3 sm:px-5">Date</th>
              <th className="px-4 py-3 sm:px-5">Category</th>
              <th className="px-4 py-3 sm:px-5">Account</th>
              <th className="px-4 py-3 sm:px-5">Trip</th>
              <th className="px-4 py-3 sm:px-5">Tags</th>
              <th className="px-4 py-3 sm:px-5">Note</th>
              <th className="px-4 py-3 text-right sm:px-5">Amount</th>
              <th className="px-4 py-3 sm:px-5">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {rows.map((row) => {
              const tags = expenseTagsList(row);
              const archived = Boolean(row.archived_at);
              return (
                <tr
                  key={row.id}
                  className="hover:bg-zinc-50/80 dark:hover:bg-zinc-900/30"
                >
                  <td className="whitespace-nowrap px-4 py-3 text-zinc-700 dark:text-zinc-300 sm:px-5">
                    {formatDisplayDate(row.date)}
                    {archived ? (
                      <span className="ml-1 block text-[10px] font-medium uppercase text-zinc-500">
                        Archived
                      </span>
                    ) : null}
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
                  <td className="max-w-[140px] px-4 py-3 text-xs text-zinc-600 dark:text-zinc-400 sm:px-5">
                    {tags.length === 0 ? (
                      "—"
                    ) : (
                      <span className="flex flex-wrap gap-1">
                        {tags.map((t) => (
                          <span
                            key={t}
                            className="rounded-full bg-zinc-100 px-2 py-0.5 dark:bg-zinc-800"
                          >
                            {t}
                          </span>
                        ))}
                      </span>
                    )}
                  </td>
                  <td className="max-w-[160px] truncate px-4 py-3 text-zinc-600 dark:text-zinc-400 sm:px-5">
                    {row.note || "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums text-zinc-900 dark:text-zinc-50 sm:px-5">
                    {formatMoney(row.amount)}
                  </td>
                  <td className="space-x-1 px-4 py-3 sm:space-x-2 sm:px-5">
                    <button
                      type="button"
                      disabled={setArchived.isPending}
                      onClick={() => handleArchiveToggle(row)}
                      className="rounded-lg border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-900"
                    >
                      {archived ? "Unarchive" : "Archive"}
                    </button>
                    <button
                      type="button"
                      disabled={deleteExpense.isPending}
                      onClick={() => handleDelete(row.id)}
                      className="rounded-lg border border-red-200 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {hasNextPage ? (
        <div className="flex justify-center border-t border-zinc-200 p-4 dark:border-zinc-800">
          <button
            type="button"
            disabled={isFetchingNextPage}
            onClick={() => void fetchNextPage()}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-900"
          >
            {isFetchingNextPage ? (
              <>
                <Spinner label="Loading more expenses" />
                Loading…
              </>
            ) : (
              "Load more"
            )}
          </button>
        </div>
      ) : null}
    </section>
  );
}
