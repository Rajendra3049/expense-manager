"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useAccountsQuery } from "@/features/accounts/use-account-data";
import {
  linkedExpenseAccountLabel,
  linkedExpenseCategoryLabel,
  useEmiLinkedExpensesQuery,
} from "@/features/expenses/use-linked-entity-expenses-query";
import { useConfirm } from "@/components/providers/confirm-provider";
import {
  formatEmiMoney,
  useDeleteEmiMutation,
  useEmisQuery,
  useInsertEmiMutation,
} from "@/features/emis/use-emi-data";
import {
  useCategoriesQuery,
  useInsertExpenseMutation,
} from "@/features/expenses/use-expense-data";
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

function numEmi(v: string | number): number {
  return typeof v === "number" ? v : Number.parseFloat(String(v));
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
  const { data: accounts = [], isLoading: accountsLoading } =
    useAccountsQuery();
  const { data: categories = [], isLoading: categoriesLoading } =
    useCategoriesQuery();
  const expenseCategories = useMemo(
    () => categories.filter((c) => c.type === "expense"),
    [categories],
  );
  const insertEmi = useInsertEmiMutation();
  const insertExpense = useInsertExpenseMutation();
  const deleteEmi = useDeleteEmiMutation();
  const [emiExpensesOpen, setEmiExpensesOpen] = useState(false);
  const [payTarget, setPayTarget] = useState<(typeof emis)[number] | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState(() => toLocalDateString(new Date()));
  const [payCategoryId, setPayCategoryId] = useState("");
  const [payAccountId, setPayAccountId] = useState("");
  const [payNote, setPayNote] = useState("");
  const emiIds = useMemo(() => emis.map((e) => e.id), [emis]);
  const { data: emiLinked = [], isLoading: emiLinkedLoading } =
    useEmiLinkedExpensesQuery(emiIds);
  const emiNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of emis) m.set(e.id, e.name);
    return m;
  }, [emis]);
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

  function openPayDialog(e: (typeof emis)[number]) {
    const rem = numEmi(e.remaining_amount);
    const mon = numEmi(e.monthly_amount);
    const def =
      rem > 0 ? Math.min(rem, mon > 0 ? mon : rem) : 0;
    setPayTarget(e);
    setPayAmount(def > 0 ? String(def) : "");
    setPayDate(toLocalDateString(new Date()));
    setPayCategoryId(expenseCategories[0]?.id ?? "");
    setPayAccountId(accounts[0]?.id ?? "");
    setPayNote("");
  }

  function closePayDialog() {
    setPayTarget(null);
  }

  async function submitEmiPayment() {
    if (!payTarget) return;
    const amt = Number.parseFloat(payAmount);
    if (!Number.isFinite(amt) || amt <= 0) {
      toast.error("Enter a valid payment amount.");
      return;
    }
    if (!payCategoryId) {
      toast.error("Select an expense category.");
      return;
    }
    if (!payAccountId) {
      toast.error("Select an account to pay from.");
      return;
    }
    try {
      await insertExpense.mutateAsync({
        amount: amt,
        categoryId: payCategoryId,
        accountId: payAccountId,
        tripId: "",
        emiId: payTarget.id,
        investmentId: "",
        debtAccountId: "",
        date: payDate,
        note: payNote.trim(),
        tags: [],
      });
      toast.success("EMI payment recorded. It appears in Expenses and updates this EMI.");
      closePayDialog();
    } catch (mutationError) {
      toast.error(getSupabaseRequestErrorMessage(mutationError));
    }
  }

  async function onDeleteEmi(id: string, name: string) {
    const ok = await confirm({
      title: `Delete EMI "${name}"?`,
      description:
        "This removes the EMI record. Linked expense history remains in Expenses.",
      confirmText: "Delete EMI",
      cancelText: "Cancel",
      intent: "danger",
    });
    if (!ok) return;
    try {
      await deleteEmi.mutateAsync(id);
      toast.success(`EMI "${name}" deleted.`);
    } catch (mutationError) {
      toast.error(getSupabaseRequestErrorMessage(mutationError));
    }
  }

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
              placeholder="e.g. Vehicle Loan Account"
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
              className="w-full cursor-pointer rounded-lg bg-zinc-900 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-[140px] dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
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
            Remaining starts equal to total. Use Record payment for a scheduled
            installment, or link an expense from the Expenses page to reduce
            remaining by that payment amount.
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
                    <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-start sm:pt-0.5">
                      {!remainingZero ? (
                        <button
                          type="button"
                          disabled={
                            insertExpense.isPending ||
                            accountsLoading ||
                            categoriesLoading ||
                            accounts.length === 0 ||
                            expenseCategories.length === 0
                          }
                          title={
                            accounts.length === 0
                              ? "Add an account before recording payments."
                              : expenseCategories.length === 0
                                ? "Add an expense category before recording payments."
                                : undefined
                          }
                          onClick={() => openPayDialog(e)}
                          className="cursor-pointer rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-900"
                        >
                          {insertExpense.isPending && payTarget?.id === e.id
                            ? "Saving…"
                            : "Record payment"}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        disabled={deleteEmi.isPending}
                        onClick={() => void onDeleteEmi(e.id, e.name)}
                        className="cursor-pointer rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-800 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900/60 dark:text-red-200 dark:hover:bg-red-950/40"
                      >
                        {deleteEmi.isPending ? "Deleting…" : "Delete EMI"}
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

      </section>

      <section
        className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:p-5"
        aria-labelledby="emi-linked-exp-heading"
      >
        <button
          type="button"
          className="flex w-full cursor-pointer items-center justify-between rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:focus-visible:ring-zinc-600"
          aria-expanded={emiExpensesOpen}
          aria-controls="emi-linked-exp-panel"
          onClick={() => setEmiExpensesOpen((v) => !v)}
        >
          <div>
            <h2
              id="emi-linked-exp-heading"
              className="text-base font-semibold text-zinc-900 dark:text-zinc-50"
            >
              EMI payment history
            </h2>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Every payment linked to this EMI appears here, whether you record
              it from Expenses or from Record payment. Principal reduces up to
              the outstanding balance; your account balance updates from the
              linked expense.
            </p>
          </div>
          <span
            className={`ml-4 text-lg leading-none text-zinc-500 transition-transform duration-300 dark:text-zinc-400 ${
              emiExpensesOpen ? "rotate-180" : ""
            }`}
            aria-hidden="true"
          >
            ▾
          </span>
        </button>
        <div
          id="emi-linked-exp-panel"
          className={`grid overflow-hidden transition-all duration-300 ease-in-out ${
            emiExpensesOpen
              ? "mt-4 grid-rows-[1fr] opacity-100"
              : "mt-0 grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="min-h-0">
            {emiIds.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Add an EMI first.
              </p>
            ) : emiLinkedLoading ? (
              <p className="text-sm text-zinc-500">Loading…</p>
            ) : emiLinked.length === 0 ? (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                No linked payments yet. Record a payment above or on the
                Expenses page using &quot;Also link to&quot; and select this EMI.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-medium uppercase tracking-wide text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
                    <tr>
                      <th className="px-4 py-3 sm:px-5">EMI</th>
                      <th className="px-4 py-3 sm:px-5">Date</th>
                      <th className="px-4 py-3 sm:px-5">Account</th>
                      <th className="px-4 py-3 sm:px-5">Category</th>
                      <th className="px-4 py-3 text-right sm:px-5">Amount</th>
                      <th className="px-4 py-3 sm:px-5">Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {emiLinked.map((row) => (
                      <tr
                        key={row.id}
                        className="hover:bg-zinc-50/80 dark:hover:bg-zinc-900/30"
                      >
                        <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-50 sm:px-5">
                          {row.emi_id ? emiNameById.get(row.emi_id) ?? "—" : "—"}
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
                          {formatEmiMoney(row.amount)}
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

      {payTarget ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="presentation"
          onClick={closePayDialog}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="emi-pay-dialog-title"
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-950"
            onClick={(ev) => ev.stopPropagation()}
          >
            <h3
              id="emi-pay-dialog-title"
              className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
            >
              Record EMI payment
            </h3>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Creates an expense linked to{" "}
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {payTarget.name}
              </span>{" "}
              (remaining {formatEmiMoney(payTarget.remaining_amount)}). The
              payment appears in Expenses and in EMI payment history below.
            </p>
            <div className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="emi-pay-amount"
                  className="block text-sm font-medium text-zinc-800 dark:text-zinc-200"
                >
                  Amount (INR)
                </label>
                <input
                  id="emi-pay-amount"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  value={payAmount}
                  onChange={(ev) => setPayAmount(ev.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50 dark:focus-visible:ring-zinc-600"
                />
              </div>
              <div>
                <label
                  htmlFor="emi-pay-date"
                  className="block text-sm font-medium text-zinc-800 dark:text-zinc-200"
                >
                  Date
                </label>
                <input
                  id="emi-pay-date"
                  type="date"
                  value={payDate}
                  onChange={(ev) => setPayDate(ev.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50 dark:focus-visible:ring-zinc-600"
                />
              </div>
              <div>
                <label
                  htmlFor="emi-pay-account"
                  className="block text-sm font-medium text-zinc-800 dark:text-zinc-200"
                >
                  Paid from account
                </label>
                <select
                  id="emi-pay-account"
                  value={payAccountId}
                  onChange={(ev) => setPayAccountId(ev.target.value)}
                  className="mt-1 w-full cursor-pointer rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50 dark:focus-visible:ring-zinc-600"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="emi-pay-category"
                  className="block text-sm font-medium text-zinc-800 dark:text-zinc-200"
                >
                  Expense category
                </label>
                <select
                  id="emi-pay-category"
                  value={payCategoryId}
                  onChange={(ev) => setPayCategoryId(ev.target.value)}
                  className="mt-1 w-full cursor-pointer rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50 dark:focus-visible:ring-zinc-600"
                >
                  {expenseCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="emi-pay-note"
                  className="block text-sm font-medium text-zinc-800 dark:text-zinc-200"
                >
                  Note{" "}
                  <span className="font-normal text-zinc-500">(optional)</span>
                </label>
                <textarea
                  id="emi-pay-note"
                  rows={2}
                  value={payNote}
                  onChange={(ev) => setPayNote(ev.target.value)}
                  placeholder="Reference or context for this payment"
                  className="mt-1 w-full resize-y rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-50 dark:focus-visible:ring-zinc-600"
                />
              </div>
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={closePayDialog}
                disabled={insertExpense.isPending}
                className="cursor-pointer rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submitEmiPayment()}
                disabled={
                  insertExpense.isPending ||
                  !payAccountId ||
                  !payCategoryId
                }
                title={
                  !payAccountId
                    ? "Select the account this payment is drawn from."
                    : !payCategoryId
                      ? "Select an expense category."
                      : undefined
                }
                className="cursor-pointer rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {insertExpense.isPending ? "Saving…" : "Save payment"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
