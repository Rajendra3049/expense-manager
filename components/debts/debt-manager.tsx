"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useConfirm } from "@/components/providers/confirm-provider";
import {
  formatDebtAmount,
  useDebtsQuery,
  useInsertDebtMutation,
  useSettleDebtMutation,
} from "@/features/debts/use-debt-data";
import {
  debtFormSchema,
  type DebtFormInput,
  type DebtFormValues,
} from "@/lib/debts/schemas";
import { getSupabaseRequestErrorMessage } from "@/lib/supabase/error-message";

const TYPE_LABELS: Record<DebtFormInput["type"], string> = {
  give: "I lent (they owe me)",
  take: "I borrowed (I owe them)",
};

function statusBadge(status: "active" | "settled") {
  if (status === "settled") {
    return (
      <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200">
        Settled
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
      Active
    </span>
  );
}

function formatDisplayDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function DebtManager() {
  const confirm = useConfirm();
  const { data: debts = [], isLoading, isError, error } = useDebtsQuery();
  const insertDebt = useInsertDebtMutation();
  const settleDebt = useSettleDebtMutation();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DebtFormInput, unknown, DebtFormValues>({
    resolver: zodResolver(debtFormSchema),
    defaultValues: {
      counterparty: "",
      type: "give",
      amount: "",
      note: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    await insertDebt.mutateAsync({
      counterparty: values.counterparty,
      type: values.type,
      amount: values.amount,
      note: values.note,
    });
    reset({
      counterparty: "",
      type: values.type,
      amount: "",
      note: "",
    });
  });

  async function onSettle(id: string) {
    const ok = await confirm({
      title: "Mark this debt as settled?",
      confirmText: "Mark settled",
      cancelText: "Cancel",
      intent: "default",
    });
    if (!ok) return;
    try {
      await settleDebt.mutateAsync(id);
    } catch {
      /* error surfaced via settleDebt.isError */
    }
  }

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Borrow & lend
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Track informal loans: money you lent or borrowed, and mark them
          settled when repaid.
        </p>
      </header>

      <section
        className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:p-5"
        aria-labelledby="add-debt-heading"
      >
        <h2
          id="add-debt-heading"
          className="text-base font-semibold text-zinc-900 dark:text-zinc-50"
        >
          New debt
        </h2>
        <form onSubmit={onSubmit} className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-1">
            <label
              htmlFor="debt-counterparty"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Who
            </label>
            <input
              id="debt-counterparty"
              type="text"
              placeholder="Name or label"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              {...register("counterparty")}
            />
            {errors.counterparty ? (
              <p className="mt-1 text-xs text-red-600" role="alert">
                {errors.counterparty.message}
              </p>
            ) : null}
          </div>

          <div className="sm:col-span-1">
            <label
              htmlFor="debt-type"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Type
            </label>
            <select
              id="debt-type"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              {...register("type")}
            >
              <option value="give">{TYPE_LABELS.give}</option>
              <option value="take">{TYPE_LABELS.take}</option>
            </select>
            {errors.type ? (
              <p className="mt-1 text-xs text-red-600" role="alert">
                {errors.type.message}
              </p>
            ) : null}
          </div>

          <div className="sm:col-span-1">
            <label
              htmlFor="debt-amount"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Amount
            </label>
            <input
              id="debt-amount"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              placeholder="0.00"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              {...register("amount")}
            />
            {errors.amount ? (
              <p className="mt-1 text-xs text-red-600" role="alert">
                {errors.amount.message}
              </p>
            ) : null}
          </div>

          <div className="sm:col-span-2">
            <label
              htmlFor="debt-note"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Note{" "}
              <span className="font-normal text-zinc-500">(optional)</span>
            </label>
            <textarea
              id="debt-note"
              rows={2}
              placeholder="Context or repayment terms"
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
              disabled={isSubmitting || insertDebt.isPending}
              className="w-full rounded-lg bg-zinc-900 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-[140px] dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {insertDebt.isPending ? "Saving…" : "Add debt"}
            </button>
          </div>
        </form>

        {insertDebt.isError ? (
          <p className="mt-3 text-sm text-red-600" role="alert">
            {getSupabaseRequestErrorMessage(insertDebt.error)}
          </p>
        ) : null}
      </section>

      <section
        className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
        aria-labelledby="debts-list-heading"
      >
        <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800 sm:px-5">
          <h2
            id="debts-list-heading"
            className="text-base font-semibold text-zinc-900 dark:text-zinc-50"
          >
            Your debts
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Settle when the loan is repaid or closed.
          </p>
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
        ) : debts.length === 0 ? (
          <div className="border-t border-dashed border-zinc-200 p-8 text-center dark:border-zinc-700">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              No debts recorded yet. Add one above.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-medium uppercase tracking-wide text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
                <tr>
                  <th className="px-4 py-3 sm:px-5">Who</th>
                  <th className="px-4 py-3 sm:px-5">Type</th>
                  <th className="px-4 py-3 text-right sm:px-5">Amount</th>
                  <th className="px-4 py-3 sm:px-5">Status</th>
                  <th className="px-4 py-3 sm:px-5">Created</th>
                  <th className="px-4 py-3 sm:px-5">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {debts.map((d) => (
                  <tr
                    key={d.id}
                    className="hover:bg-zinc-50/80 dark:hover:bg-zinc-900/30"
                  >
                    <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-50 sm:px-5">
                      <div>{d.counterparty}</div>
                      {d.note ? (
                        <p className="mt-0.5 max-w-[220px] truncate text-xs font-normal text-zinc-500 dark:text-zinc-400">
                          {d.note}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300 sm:px-5">
                      {TYPE_LABELS[d.type]}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-zinc-900 dark:text-zinc-50 sm:px-5">
                      {formatDebtAmount(d.amount)}
                    </td>
                    <td className="px-4 py-3 sm:px-5">
                      {statusBadge(d.status)}
                      {d.status === "settled" && d.settled_at ? (
                        <p className="mt-1 text-xs text-zinc-500">
                          {formatDisplayDate(d.settled_at)}
                        </p>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-zinc-600 dark:text-zinc-400 sm:px-5">
                      {formatDisplayDate(d.created_at)}
                    </td>
                    <td className="px-4 py-3 sm:px-5">
                      {d.status === "active" ? (
                        <button
                          type="button"
                          disabled={settleDebt.isPending}
                          onClick={() => void onSettle(d.id)}
                          className="rounded-lg border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-900"
                        >
                          Settle
                        </button>
                      ) : (
                        <span className="text-xs text-zinc-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {settleDebt.isError ? (
          <p
            className="border-t border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200 sm:px-5"
            role="alert"
          >
            {settleDebt.error instanceof Error
              ? settleDebt.error.message
              : getSupabaseRequestErrorMessage(settleDebt.error)}
          </p>
        ) : null}
      </section>
    </div>
  );
}
