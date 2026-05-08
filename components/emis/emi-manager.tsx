"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useConfirm } from "@/components/providers/confirm-provider";
import {
  formatEmiMoney,
  useEmisQuery,
  useInsertEmiMutation,
  useRecordEmiPaymentMutation,
} from "@/features/emis/use-emi-data";
import {
  emiFormSchema,
  type EmiFormInput,
  type EmiFormValues,
} from "@/lib/emis/schemas";
import { toLocalDateString } from "@/lib/expenses/dates";
import { getSupabaseRequestErrorMessage } from "@/lib/supabase/error-message";

function formatDisplayDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return isoDate;
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function progressPercent(
  total: string | number,
  remaining: string | number,
): number {
  const t =
    typeof total === "number" ? total : Number.parseFloat(String(total));
  const r =
    typeof remaining === "number"
      ? remaining
      : Number.parseFloat(String(remaining));
  if (!Number.isFinite(t) || t <= 0) return 0;
  const paid = Math.max(0, t - Math.max(0, r));
  return Math.min(100, Math.round((paid / t) * 100));
}

export function EmiManager() {
  const confirm = useConfirm();
  const { data: emis = [], isLoading, isError, error } = useEmisQuery();
  const insertEmi = useInsertEmiMutation();
  const recordPayment = useRecordEmiPaymentMutation();
  const today = toLocalDateString(new Date());

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EmiFormInput, unknown, EmiFormValues>({
    resolver: zodResolver(emiFormSchema),
    defaultValues: {
      name: "",
      totalAmount: "",
      monthlyAmount: "",
      dueDate: today,
      note: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    await insertEmi.mutateAsync({
      name: values.name,
      totalAmount: values.totalAmount,
      monthlyAmount: values.monthlyAmount,
      dueDate: values.dueDate,
      note: values.note,
    });
    reset({
      name: "",
      totalAmount: "",
      monthlyAmount: "",
      dueDate: values.dueDate,
      note: "",
    });
  });

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          EMIs
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Track loan totals, monthly installments, outstanding balances, and due
          dates. Record each payment to reduce balance and move the due date
          forward.
        </p>
      </header>

      <section
        className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:p-5"
        aria-labelledby="add-emi-heading"
      >
        <h2
          id="add-emi-heading"
          className="text-base font-semibold text-zinc-900 dark:text-zinc-50"
        >
          New EMI
        </h2>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Add loan details once and keep the repayment progress updated over
          time.
        </p>
        <form onSubmit={onSubmit} className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label
              htmlFor="emi-name"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Name
            </label>
            <input
              id="emi-name"
              type="text"
              placeholder="e.g. Car loan"
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
              htmlFor="emi-total"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Total amount
            </label>
            <input
              id="emi-total"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              placeholder="0.00"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              {...register("totalAmount")}
            />
            {errors.totalAmount ? (
              <p className="mt-1 text-xs text-red-600" role="alert">
                {errors.totalAmount.message}
              </p>
            ) : null}
          </div>

          <div className="sm:col-span-1">
            <label
              htmlFor="emi-monthly"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Monthly EMI
            </label>
            <input
              id="emi-monthly"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              placeholder="0.00"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              {...register("monthlyAmount")}
            />
            {errors.monthlyAmount ? (
              <p className="mt-1 text-xs text-red-600" role="alert">
                {errors.monthlyAmount.message}
              </p>
            ) : null}
          </div>

          <div className="sm:col-span-1">
            <label
              htmlFor="emi-due"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Next due date
            </label>
            <input
              id="emi-due"
              type="date"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              {...register("dueDate")}
            />
            {errors.dueDate ? (
              <p className="mt-1 text-xs text-red-600" role="alert">
                {errors.dueDate.message}
              </p>
            ) : null}
          </div>

          <div className="sm:col-span-2">
            <label
              htmlFor="emi-note"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Note{" "}
              <span className="font-normal text-zinc-500">(optional)</span>
            </label>
            <textarea
              id="emi-note"
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
              disabled={isSubmitting || insertEmi.isPending}
              className="w-full rounded-lg bg-zinc-900 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-[140px] dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {insertEmi.isPending ? "Saving…" : "Add EMI"}
            </button>
          </div>
        </form>

        {insertEmi.isError ? (
          <p className="mt-3 text-sm text-red-600" role="alert">
            {getSupabaseRequestErrorMessage(insertEmi.error)}
          </p>
        ) : null}
      </section>

      <section
        className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
        aria-labelledby="emi-list-heading"
      >
        <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800 sm:px-5">
          <h2
            id="emi-list-heading"
            className="text-base font-semibold text-zinc-900 dark:text-zinc-50"
          >
            Your EMIs
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Remaining starts equal to total; use Record payment after each
            installment.
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
        ) : emis.length === 0 ? (
          <div className="border-t border-dashed border-zinc-200 p-8 text-center dark:border-zinc-700">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              No EMIs yet. Add one above.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {emis.map((e) => {
              const pct = progressPercent(e.total_amount, e.remaining_amount);
              const remainingZero =
                Number.parseFloat(String(e.remaining_amount)) <= 0;
              return (
                <li key={e.id} className="p-4 sm:p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                          {e.name}
                        </h3>
                        {remainingZero ? (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200">
                            Paid off
                          </span>
                        ) : null}
                      </div>
                      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
                        <div>
                          <dt className="text-zinc-500">Total</dt>
                          <dd className="font-medium tabular-nums text-zinc-900 dark:text-zinc-50">
                            {formatEmiMoney(e.total_amount)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-zinc-500">Monthly</dt>
                          <dd className="font-medium tabular-nums text-zinc-900 dark:text-zinc-50">
                            {formatEmiMoney(e.monthly_amount)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-zinc-500">Remaining</dt>
                          <dd className="font-medium tabular-nums text-zinc-900 dark:text-zinc-50">
                            {formatEmiMoney(e.remaining_amount)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-zinc-500">Due</dt>
                          <dd className="font-medium text-zinc-900 dark:text-zinc-50">
                            {formatDisplayDate(e.due_date)}
                          </dd>
                        </div>
                      </dl>
                      <div className="max-w-md">
                        <div className="flex justify-between text-xs text-zinc-500">
                          <span>Paid down</span>
                          <span>{pct}%</span>
                        </div>
                        <div className="mt-1 h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                          <div
                            className="h-full rounded-full bg-zinc-800 dark:bg-zinc-200"
                            style={{ width: `${pct}%` }}
                            role="progressbar"
                            aria-valuenow={pct}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label="Principal paid progress"
                          />
                        </div>
                      </div>
                      {e.note ? (
                        <p className="text-xs text-zinc-600 dark:text-zinc-400">
                          {e.note}
                        </p>
                      ) : null}
                    </div>
                    <div className="shrink-0 sm:pt-0.5">
                      {!remainingZero ? (
                        <button
                          type="button"
                          disabled={recordPayment.isPending}
                          onClick={async () => {
                            const ok = await confirm({
                              title: "Record one EMI payment?",
                              description:
                                "Remaining balance and due date will update.",
                              confirmText: "Record payment",
                              cancelText: "Cancel",
                              intent: "default",
                            });
                            if (!ok) return;
                            void recordPayment.mutateAsync(e);
                          }}
                          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-900"
                        >
                          {recordPayment.isPending
                            ? "Updating…"
                            : "Record payment"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {recordPayment.isError ? (
          <p
            className="border-t border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200 sm:px-5"
            role="alert"
          >
            {getSupabaseRequestErrorMessage(recordPayment.error)}
          </p>
        ) : null}
      </section>
    </div>
  );
}
