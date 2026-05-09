"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useConfirm } from "@/components/providers/confirm-provider";
import {
  linkedExpenseAccountLabel,
  linkedExpenseCategoryLabel,
  useInvestmentLinkedExpensesQuery,
} from "@/features/expenses/use-linked-entity-expenses-query";
import {
  formatInvestmentMoney,
  useDeleteInvestmentMutation,
  useInsertInvestmentMutation,
  useInvestmentsQuery,
} from "@/features/investments/use-investment-data";
import type { InvestmentRow } from "@/features/investments/types";
import {
  investmentFormSchema,
  type InvestmentFormInput,
  type InvestmentFormValues,
} from "@/lib/investments/schemas";
import { getSupabaseRequestErrorMessage } from "@/lib/supabase/error-message";

const TYPE_LABELS: Record<InvestmentRow["type"], string> = {
  stock: "Stock",
  mutual_fund: "Mutual fund",
  fd: "Fixed deposit",
  crypto: "Crypto",
  other: "Other",
};

function formatDisplayDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return isoDate;
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function InvestmentManager() {
  const confirm = useConfirm();
  const { data: rows = [], isLoading, isError, error } = useInvestmentsQuery();
  const insertInv = useInsertInvestmentMutation();
  const deleteInv = useDeleteInvestmentMutation();
  const [contribOpen, setContribOpen] = useState(false);
  const invIds = useMemo(() => rows.map((r) => r.id), [rows]);
  const { data: invLinked = [], isLoading: invLinkedLoading } =
    useInvestmentLinkedExpensesQuery(invIds);
  const invNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of rows) m.set(r.id, r.name);
    return m;
  }, [rows]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InvestmentFormInput, unknown, InvestmentFormValues>({
    resolver: zodResolver(investmentFormSchema),
    defaultValues: {
      name: "",
      type: "mutual_fund",
      currentValue: "",
      note: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await insertInv.mutateAsync({
        name: values.name,
        type: values.type,
        currentValue: values.currentValue,
        note: values.note,
      });
      toast.success("Investment added.");
      reset({
        name: "",
        type: values.type,
        currentValue: "",
        note: "",
      });
    } catch (mutationError) {
      toast.error(getSupabaseRequestErrorMessage(mutationError));
    }
  });

  async function onDeleteInvestment(id: string, name: string) {
    const ok = await confirm({
      title: `Delete "${name}"?`,
      description:
        "This removes the investment record. Linked expenses remain in Expenses; unlink or archive them separately if needed.",
      confirmText: "Delete investment",
      cancelText: "Cancel",
      intent: "danger",
    });
    if (!ok) return;
    try {
      await deleteInv.mutateAsync(id);
      toast.success(`Investment "${name}" deleted.`);
    } catch (mutationError) {
      toast.error(getSupabaseRequestErrorMessage(mutationError));
    }
  }

  const totalTracked = rows.reduce(
    (sum, r) =>
      sum +
      (typeof r.current_value === "number"
        ? r.current_value
        : Number.parseFloat(String(r.current_value)) || 0),
    0,
  );

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Investments
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Track holdings with an opening position and a single contribution ledger
          (account-wise) from linked expenses. Portfolio total sums{" "}
          <span className="font-medium">current value</span> per line.
        </p>
      </header>

      <section
        className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:p-5"
        aria-labelledby="add-inv-heading"
      >
        <h2
          id="add-inv-heading"
          className="text-base font-semibold text-zinc-900 dark:text-zinc-50"
        >
          Add investment
        </h2>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Start with the instrument name, type, and latest value.
        </p>
        <form onSubmit={onSubmit} className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-1">
            <label
              htmlFor="inv-name"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Name
            </label>
            <input
              id="inv-name"
              type="text"
              placeholder="e.g. Nifty 50 Index Fund"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              {...register("name")}
            />
            {errors.name ? (
              <p className="mt-1 text-xs text-red-600" role="alert">
                {errors.name.message}
              </p>
            ) : null}
          </div>

          <div className="sm:col-span-1">
            <label
              htmlFor="inv-type"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Type
            </label>
            <select
              id="inv-type"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              {...register("type")}
            >
              {(Object.keys(TYPE_LABELS) as InvestmentRow["type"][]).map(
                (t) => (
                  <option key={t} value={t}>
                    {TYPE_LABELS[t]}
                  </option>
                ),
              )}
            </select>
            {errors.type ? (
              <p className="mt-1 text-xs text-red-600" role="alert">
                {errors.type.message}
              </p>
            ) : null}
          </div>

          <div className="sm:col-span-1">
            <label
              htmlFor="inv-value"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Current value
            </label>
            <input
              id="inv-value"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              placeholder="0.00"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              {...register("currentValue")}
            />
            {errors.currentValue ? (
              <p className="mt-1 text-xs text-red-600" role="alert">
                {errors.currentValue.message}
              </p>
            ) : null}
          </div>

          <div className="sm:col-span-2">
            <label
              htmlFor="inv-note"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Note{" "}
              <span className="font-normal text-zinc-500">(optional)</span>
            </label>
            <textarea
              id="inv-note"
              rows={2}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              {...register("note")}
            />
            {errors.note ? (
              <p className="mt-1 text-xs text-red-600" role="alert">
                {errors.note.message}
              </p>
            ) : null}
          </div>

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={isSubmitting || insertInv.isPending}
              className="w-full cursor-pointer rounded-lg bg-zinc-900 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-[140px] dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {insertInv.isPending ? "Saving…" : "Add investment"}
            </button>
          </div>
        </form>
      </section>

      <section
        className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
        aria-labelledby="inv-list-heading"
      >
        <div className="flex flex-col gap-1 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h2
              id="inv-list-heading"
              className="text-base font-semibold text-zinc-900 dark:text-zinc-50"
            >
              Portfolio
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Values come from the amount you set when adding each line plus
              contributions recorded as linked expenses.
            </p>
          </div>
          {rows.length > 0 ? (
            <p className="text-sm font-medium tabular-nums text-zinc-800 dark:text-zinc-200">
              Total: {formatInvestmentMoney(totalTracked)}
            </p>
          ) : null}
        </div>

        {isLoading ? (
          <div className="p-6">
            <p className="text-sm text-zinc-500">Loading…</p>
          </div>
        ) : isError ? (
          <div
            className="border-t border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950/30"
            role="alert"
          >
            <p className="text-sm text-red-800 dark:text-red-200">
              {getSupabaseRequestErrorMessage(error)}
            </p>
          </div>
        ) : rows.length === 0 ? (
          <div className="border-t border-dashed border-zinc-200 p-8 text-center dark:border-zinc-700">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              No investments yet. Add one above.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-medium uppercase tracking-wide text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
                <tr>
                  <th className="px-4 py-3 sm:px-5">Name</th>
                  <th className="px-4 py-3 sm:px-5">Type</th>
                  <th className="px-4 py-3 text-right sm:px-5">Value</th>
                  <th className="px-4 py-3 sm:px-5">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    className="hover:bg-zinc-50/80 dark:hover:bg-zinc-900/30"
                  >
                    <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-50 sm:px-5">
                      <div>{r.name}</div>
                      {r.note ? (
                        <p className="mt-0.5 max-w-[240px] truncate text-xs font-normal text-zinc-500">
                          {r.note}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300 sm:px-5">
                      {TYPE_LABELS[r.type]}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-zinc-900 dark:text-zinc-50 sm:px-5">
                      {formatInvestmentMoney(r.current_value)}
                    </td>
                    <td className="px-4 py-3 sm:px-5">
                      <button
                        type="button"
                        disabled={deleteInv.isPending}
                        onClick={() => void onDeleteInvestment(r.id, r.name)}
                        className="cursor-pointer rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-800 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900/60 dark:text-red-200 dark:hover:bg-red-950/40"
                      >
                        {deleteInv.isPending ? "Deleting…" : "Delete"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section
        className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:p-5"
        aria-labelledby="inv-contrib-heading"
      >
        <button
          type="button"
          className="flex w-full cursor-pointer items-center justify-between rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:focus-visible:ring-zinc-600"
          aria-expanded={contribOpen}
          aria-controls="inv-contrib-panel"
          onClick={() => setContribOpen((v) => !v)}
        >
          <div>
            <h2
              id="inv-contrib-heading"
              className="text-base font-semibold text-zinc-900 dark:text-zinc-50"
            >
              Contribution ledger (account-wise)
            </h2>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Single place for every investment top-up tied to an expense: same
              rows whether you link from Expenses or elsewhere, with the account
              that funded each amount.
            </p>
          </div>
          <span
            className={`ml-4 text-lg leading-none text-zinc-500 transition-transform duration-300 dark:text-zinc-400 ${
              contribOpen ? "rotate-180" : ""
            }`}
            aria-hidden="true"
          >
            ▾
          </span>
        </button>
        <div
          id="inv-contrib-panel"
          className={`grid overflow-hidden transition-all duration-300 ease-in-out ${
            contribOpen
              ? "mt-4 grid-rows-[1fr] opacity-100"
              : "mt-0 grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="min-h-0">
            {invIds.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Add an investment first.
              </p>
            ) : invLinkedLoading ? (
              <p className="text-sm text-zinc-500">Loading…</p>
            ) : invLinked.length === 0 ? (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                No linked contributions yet. On the Expenses page, use &quot;Also
                link to&quot; and select an investment to record the account and
                amount here.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-medium uppercase tracking-wide text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
                    <tr>
                      <th className="px-4 py-3 sm:px-5">Investment</th>
                      <th className="px-4 py-3 sm:px-5">Date</th>
                      <th className="px-4 py-3 sm:px-5">Account</th>
                      <th className="px-4 py-3 sm:px-5">Category</th>
                      <th className="px-4 py-3 text-right sm:px-5">Amount</th>
                      <th className="px-4 py-3 sm:px-5">Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {invLinked.map((row) => (
                      <tr
                        key={row.id}
                        className="hover:bg-zinc-50/80 dark:hover:bg-zinc-900/30"
                      >
                        <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-50 sm:px-5">
                          {row.investment_id
                            ? invNameById.get(row.investment_id) ?? "—"
                            : "—"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-zinc-700 dark:text-zinc-300 sm:px-5">
                          {formatDisplayDate(row.date)}
                        </td>
                        <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300 sm:px-5">
                          {linkedExpenseAccountLabel(row)}
                        </td>
                        <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300 sm:px-5">
                          {linkedExpenseCategoryLabel(row)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-zinc-900 dark:text-zinc-50 sm:px-5">
                          {formatInvestmentMoney(row.amount)}
                        </td>
                        <td className="max-w-[200px] truncate px-4 py-3 text-zinc-600 dark:text-zinc-400 sm:px-5">
                          {row.note?.trim() ? row.note : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
