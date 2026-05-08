"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useConfirm } from "@/components/providers/confirm-provider";
import { useAccountsQuery } from "@/features/accounts/use-account-data";
import { useCategoriesQuery } from "@/features/expenses/use-expense-data";
import {
  useDeleteRecurringExpenseMutation,
  useInsertRecurringExpenseMutation,
  useProcessDueRecurringMutation,
  useRecurringExpensesQuery,
  useToggleRecurringActiveMutation,
  useUpdateRecurringExpenseMutation,
} from "@/features/recurring/use-recurring-data";
import type { RecurringExpenseRow } from "@/features/recurring/types";
import { toLocalDateString } from "@/lib/expenses/dates";
import {
  recurringExpenseFormSchema,
  type RecurringExpenseFormInput,
  type RecurringExpenseFormValues,
} from "@/lib/recurring/schemas";
import { getSupabaseRequestErrorMessage } from "@/lib/supabase/error-message";

const FREQ_LABELS: Record<RecurringExpenseRow["frequency"], string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
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

function formatMoney(value: string | number): string {
  const n = typeof value === "number" ? value : Number.parseFloat(String(value));
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);
}

export function RecurringManager() {
  const confirm = useConfirm();
  const { data: categories = [], isLoading: catLoading } = useCategoriesQuery();
  const { data: accounts = [], isLoading: accLoading } = useAccountsQuery();
  const expenseCategories = useMemo(
    () => categories.filter((c) => c.type === "expense"),
    [categories],
  );

  const { data: rules = [], isLoading, isError, error } = useRecurringExpensesQuery();
  const insertRule = useInsertRecurringExpenseMutation();
  const processDue = useProcessDueRecurringMutation();
  const toggle = useToggleRecurringActiveMutation();
  const remove = useDeleteRecurringExpenseMutation();
  const updateRule = useUpdateRecurringExpenseMutation();
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const today = useMemo(() => toLocalDateString(new Date()), []);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<
    RecurringExpenseFormInput,
    unknown,
    RecurringExpenseFormValues
  >({
    resolver: zodResolver(recurringExpenseFormSchema),
    defaultValues: {
      label: "",
      amount: "",
      categoryId: "",
      accountId: "",
      frequency: "monthly",
      nextDate: today,
      note: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    if (editingRuleId) {
      await updateRule.mutateAsync({
        id: editingRuleId,
        label: values.label,
        amount: values.amount,
        categoryId: values.categoryId,
        accountId: values.accountId ?? "",
        frequency: values.frequency,
        nextDate: values.nextDate,
        note: values.note,
      });
      setEditingRuleId(null);
    } else {
      await insertRule.mutateAsync({
        label: values.label,
        amount: values.amount,
        categoryId: values.categoryId,
        accountId: values.accountId ?? "",
        frequency: values.frequency,
        nextDate: values.nextDate,
        note: values.note,
      });
    }
    reset({
      label: "",
      amount: "",
      categoryId: "",
      accountId: "",
      frequency: values.frequency,
      nextDate: values.nextDate,
      note: "",
    });
  });

  function onEditRule(rule: RecurringExpenseRow) {
    setEditingRuleId(rule.id);
    reset({
      label: rule.label,
      amount: String(rule.amount),
      categoryId: rule.category_id,
      accountId: rule.account_id ?? "",
      frequency: rule.frequency,
      nextDate: rule.next_date,
      note: rule.note ?? "",
    });
  }

  function onCancelEdit() {
    setEditingRuleId(null);
    reset({
      label: "",
      amount: "",
      categoryId: "",
      accountId: "",
      frequency: "monthly",
      nextDate: today,
      note: "",
    });
  }

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Recurring expenses
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Create recurring rules once and auto-add due expenses. You can also
          process due items directly from this page.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/30">
        <button
          type="button"
          disabled={processDue.isPending}
          onClick={async () => {
            try {
              const result = await processDue.mutateAsync();
              if (result.addedExpenses > 0) {
                toast.success(
                  `Added ${result.addedExpenses} due recurring ${
                    result.addedExpenses === 1 ? "expense" : "expenses"
                  }.`,
                );
              } else {
                toast.info("No action taken. No recurring expenses are due today.");
              }
            } catch (error) {
              toast.error(getSupabaseRequestErrorMessage(error));
            }
          }}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {processDue.isPending ? "Processing…" : "Run due recurring now"}
        </button>
      </div>

      <section
        className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:p-5"
        aria-labelledby="new-recurring-heading"
      >
        <h2
          id="new-recurring-heading"
          className="text-base font-semibold text-zinc-900 dark:text-zinc-50"
        >
          {editingRuleId ? "Edit rule" : "New rule"}
        </h2>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Define frequency, amount, and due date for automatic expense entries.
        </p>
        <form onSubmit={onSubmit} className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label
              htmlFor="rec-label"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Label
            </label>
            <input
              id="rec-label"
              type="text"
              placeholder="e.g. Rent, Netflix"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              {...register("label")}
            />
            {errors.label ? (
              <p className="mt-1 text-xs text-red-600" role="alert">
                {errors.label.message}
              </p>
            ) : null}
          </div>

          <div className="sm:col-span-1">
            <label
              htmlFor="rec-amount"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Amount
            </label>
            <input
              id="rec-amount"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              {...register("amount")}
            />
            {errors.amount ? (
              <p className="mt-1 text-xs text-red-600" role="alert">
                {errors.amount.message}
              </p>
            ) : null}
          </div>

          <div className="sm:col-span-1">
            <label
              htmlFor="rec-freq"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Frequency
            </label>
            <select
              id="rec-freq"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              {...register("frequency")}
            >
              {(Object.keys(FREQ_LABELS) as RecurringExpenseRow["frequency"][]).map(
                (f) => (
                  <option key={f} value={f}>
                    {FREQ_LABELS[f]}
                  </option>
                ),
              )}
            </select>
            {errors.frequency ? (
              <p className="mt-1 text-xs text-red-600" role="alert">
                {errors.frequency.message}
              </p>
            ) : null}
          </div>

          <div className="sm:col-span-1">
            <label
              htmlFor="rec-cat"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Category
            </label>
            <select
              id="rec-cat"
              disabled={catLoading || expenseCategories.length === 0}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              {...register("categoryId")}
            >
              <option value="">
                {catLoading
                  ? "Loading…"
                  : expenseCategories.length === 0
                    ? "Add an expense category first"
                    : "Select category"}
              </option>
              {expenseCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {errors.categoryId ? (
              <p className="mt-1 text-xs text-red-600" role="alert">
                {errors.categoryId.message}
              </p>
            ) : null}
          </div>

          <div className="sm:col-span-1">
            <label
              htmlFor="rec-acc"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Account{" "}
              <span className="font-normal text-zinc-500">(optional)</span>
            </label>
            <select
              id="rec-acc"
              disabled={accLoading}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              {...register("accountId")}
            >
              <option value="">{accLoading ? "Loading…" : "None"}</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            {errors.accountId ? (
              <p className="mt-1 text-xs text-red-600" role="alert">
                {errors.accountId.message}
              </p>
            ) : null}
          </div>

          <div className="sm:col-span-1">
            <label
              htmlFor="rec-next"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Next due date
            </label>
            <input
              id="rec-next"
              type="date"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              {...register("nextDate")}
            />
            {errors.nextDate ? (
              <p className="mt-1 text-xs text-red-600" role="alert">
                {errors.nextDate.message}
              </p>
            ) : null}
          </div>

          <div className="sm:col-span-2">
            <label
              htmlFor="rec-note"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Note{" "}
              <span className="font-normal text-zinc-500">(optional)</span>
            </label>
            <textarea
              id="rec-note"
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
              disabled={
                isSubmitting ||
                insertRule.isPending ||
                updateRule.isPending ||
                expenseCategories.length === 0
              }
              className="w-full rounded-lg bg-zinc-900 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-[140px] dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {insertRule.isPending || updateRule.isPending
                ? "Saving…"
                : editingRuleId
                  ? "Update rule"
                  : "Add rule"}
            </button>
            {editingRuleId ? (
              <button
                type="button"
                onClick={onCancelEdit}
                className="mt-2 w-full rounded-lg border border-zinc-300 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 sm:ml-2 sm:mt-0 sm:w-auto sm:min-w-[120px] dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-900"
              >
                Cancel edit
              </button>
            ) : null}
          </div>
        </form>

        {insertRule.isError || updateRule.isError ? (
          <p className="mt-3 text-sm text-red-600" role="alert">
            {getSupabaseRequestErrorMessage(
              insertRule.isError ? insertRule.error : updateRule.error,
            )}
          </p>
        ) : null}
      </section>

      <section
        className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
        aria-labelledby="recurring-list-heading"
      >
        <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800 sm:px-5">
          <h2
            id="recurring-list-heading"
            className="text-base font-semibold text-zinc-900 dark:text-zinc-50"
          >
            Your rules
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Review status, update details, pause, resume, or delete rules.
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
        ) : rules.length === 0 ? (
          <div className="border-t border-dashed border-zinc-200 p-8 text-center dark:border-zinc-700">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              No recurring rules yet.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-medium uppercase tracking-wide text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
                <tr>
                  <th className="px-4 py-3 sm:px-5">Label</th>
                  <th className="px-4 py-3 sm:px-5">Frequency</th>
                  <th className="px-4 py-3 text-right sm:px-5">Amount</th>
                  <th className="px-4 py-3 sm:px-5">Next due</th>
                  <th className="px-4 py-3 sm:px-5">Status</th>
                  <th className="px-4 py-3 sm:px-5">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {rules.map((r) => (
                  <tr
                    key={r.id}
                    className="hover:bg-zinc-50/80 dark:hover:bg-zinc-900/30"
                  >
                    <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-50 sm:px-5">
                      {r.label}
                      {r.note ? (
                        <p className="mt-0.5 max-w-[200px] truncate text-xs font-normal text-zinc-500">
                          {r.note}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300 sm:px-5">
                      {FREQ_LABELS[r.frequency]}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-zinc-900 dark:text-zinc-50 sm:px-5">
                      {formatMoney(r.amount)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-zinc-700 dark:text-zinc-300 sm:px-5">
                      {formatDisplayDate(r.next_date)}
                    </td>
                    <td className="px-4 py-3 sm:px-5">
                      {r.is_active ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200">
                          Active
                        </span>
                      ) : (
                        <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-600 dark:text-zinc-200">
                          Paused
                        </span>
                      )}
                    </td>
                    <td className="space-x-2 px-4 py-3 sm:px-5">
                      <button
                        type="button"
                        disabled={updateRule.isPending}
                        onClick={() => onEditRule(r)}
                        className="rounded-lg border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-900"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={toggle.isPending}
                        onClick={() =>
                          void toggle.mutateAsync({
                            id: r.id,
                            isActive: !r.is_active,
                          })
                        }
                        className="rounded-lg border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-900"
                      >
                        {r.is_active ? "Pause" : "Resume"}
                      </button>
                      <button
                        type="button"
                        disabled={remove.isPending}
                        onClick={async () => {
                          const ok = await confirm({
                            title: "Delete this recurring rule?",
                            description:
                              "Past expenses stay in your ledger.",
                            confirmText: "Delete",
                            cancelText: "Cancel",
                            intent: "danger",
                          });
                          if (!ok) return;
                          void remove.mutateAsync(r.id);
                        }}
                        className="rounded-lg border border-red-200 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
