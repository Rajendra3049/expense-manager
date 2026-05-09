"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import {
  linkedExpenseCategoryLabel,
  useInvestmentLinkedExpensesQuery,
} from "@/features/expenses/use-linked-entity-expenses-query";
import {
  formatInvestmentMoney,
  useInsertInvestmentMutation,
  useInvestmentsQuery,
  useUpdateInvestmentValueMutation,
} from "@/features/investments/use-investment-data";
import type { InvestmentRow } from "@/features/investments/types";
import {
  investmentFormSchema,
  investmentValueFormSchema,
  type InvestmentFormInput,
  type InvestmentFormValues,
  type InvestmentValueFormInput,
  type InvestmentValueFormValues,
} from "@/lib/investments/schemas";
import { getSupabaseRequestErrorMessage } from "@/lib/supabase/error-message";

const TYPE_LABELS: Record<InvestmentRow["type"], string> = {
  stock: "Stock",
  mutual_fund: "Mutual fund",
  fd: "Fixed deposit",
  crypto: "Crypto",
  other: "Other",
};

function InvestmentValueEditor({
  row,
  onDone,
}: {
  row: InvestmentRow;
  onDone: () => void;
}) {
  const updateValue = useUpdateInvestmentValueMutation();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<InvestmentValueFormInput, unknown, InvestmentValueFormValues>({
    resolver: zodResolver(investmentValueFormSchema),
    defaultValues: {
      currentValue: String(row.current_value),
    },
  });

  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={handleSubmit(async (values) => {
        await updateValue.mutateAsync({
          id: row.id,
          currentValue: values.currentValue,
        });
        onDone();
      })}
    >
      <input
        type="number"
        inputMode="decimal"
        step="0.01"
        min="0"
        className="w-28 rounded-lg border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        {...register("currentValue")}
      />
      {errors.currentValue ? (
        <span className="text-xs text-red-600">{errors.currentValue.message}</span>
      ) : null}
      <button
        type="submit"
        disabled={updateValue.isPending}
        className="cursor-pointer rounded-lg bg-zinc-900 px-2 py-1 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        Save
      </button>
      <button
        type="button"
        onClick={onDone}
        className="cursor-pointer rounded-lg border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-600"
      >
        Cancel
      </button>
      {updateValue.isError ? (
        <span className="w-full text-xs text-red-600">
          {getSupabaseRequestErrorMessage(updateValue.error)}
        </span>
      ) : null}
    </form>
  );
}

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
  const { data: rows = [], isLoading, isError, error } = useInvestmentsQuery();
  const insertInv = useInsertInvestmentMutation();
  const [editingId, setEditingId] = useState<string | null>(null);
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
    await insertInv.mutateAsync({
      name: values.name,
      type: values.type,
      currentValue: values.currentValue,
      note: values.note,
    });
    reset({
      name: "",
      type: values.type,
      currentValue: "",
      note: "",
    });
  });

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
          Track your holdings and update current market values anytime. Portfolio
          totals below use <span className="font-medium">current value</span>.
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

        {insertInv.isError ? (
          <p className="mt-3 text-sm text-red-600" role="alert">
            {getSupabaseRequestErrorMessage(insertInv.error)}
          </p>
        ) : null}
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
              Update value anytime with Edit.
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
                    <span className="sr-only">Edit</span>
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
                      {editingId === r.id ? (
                        <InvestmentValueEditor
                          row={r}
                          onDone={() => setEditingId(null)}
                        />
                      ) : (
                        formatInvestmentMoney(r.current_value)
                      )}
                    </td>
                    <td className="px-4 py-3 sm:px-5">
                      {editingId === r.id ? null : (
                        <button
                          type="button"
                          onClick={() => setEditingId(r.id)}
                          className="cursor-pointer rounded-lg border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-900"
                        >
                          Edit value
                        </button>
                      )}
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
              Contributions from expenses
            </h2>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Expenses saved with an investment link increase tracked value and
              appear here.
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
                No linked expenses yet. On the Expenses page, use &quot;Also link
                to&quot; and select Investment.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-medium uppercase tracking-wide text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
                    <tr>
                      <th className="px-4 py-3 sm:px-5">Investment</th>
                      <th className="px-4 py-3 sm:px-5">Date</th>
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
