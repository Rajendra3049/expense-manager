"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { useAccountsQuery } from "@/features/accounts/use-account-data";
import {
  useCategoriesQuery,
  useInsertExpenseMutation,
  toLocalDateString,
} from "@/features/expenses/use-expense-data";
import { useTripsQuery } from "@/features/trips/use-trip-data";
import { expenseFormSchema, parseExpenseAmount } from "@/lib/expenses/schemas";
import { getSupabaseRequestErrorMessage } from "@/lib/supabase/error-message";

export function ExpenseForm() {
  const { data: categories = [], isLoading: categoriesLoading } =
    useCategoriesQuery();
  const { data: accounts = [], isLoading: accountsLoading } =
    useAccountsQuery();
  const { data: trips = [], isLoading: tripsLoading } = useTripsQuery();
  const expenseCategories = useMemo(
    () => categories.filter((c) => c.type === "expense"),
    [categories],
  );

  const insertExpense = useInsertExpenseMutation();
  const today = useMemo(() => toLocalDateString(new Date()), []);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      amount: "",
      categoryId: "",
      accountId: "",
      tripId: "",
      date: today,
      note: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    await insertExpense.mutateAsync({
      amount: parseExpenseAmount(values.amount),
      categoryId: values.categoryId,
      accountId: values.accountId ?? "",
      tripId: values.tripId ?? "",
      date: values.date,
      note: values.note?.trim() ?? "",
    });
    reset({
      amount: "",
      categoryId: "",
      accountId: "",
      tripId: "",
      date: values.date,
      note: "",
    });
  });

  return (
    <section
      className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:p-5"
      aria-labelledby="add-expense-heading"
    >
      <h2
        id="add-expense-heading"
        className="text-base font-semibold text-zinc-900 dark:text-zinc-50"
      >
        Add expense
      </h2>

      <form onSubmit={onSubmit} className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-1">
          <label
            htmlFor="exp-amount"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Amount
          </label>
          <input
            id="exp-amount"
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

        <div className="sm:col-span-1">
          <label
            htmlFor="exp-category"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Category
          </label>
          <select
            id="exp-category"
            disabled={categoriesLoading || expenseCategories.length === 0}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            {...register("categoryId")}
          >
            <option value="">
              {categoriesLoading
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
            htmlFor="exp-account"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Account{" "}
            <span className="font-normal text-zinc-500">(optional)</span>
          </label>
          <select
            id="exp-account"
            disabled={accountsLoading}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            {...register("accountId")}
          >
            <option value="">
              {accountsLoading ? "Loading…" : "None"}
            </option>
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
            htmlFor="exp-trip"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Trip{" "}
            <span className="font-normal text-zinc-500">(optional)</span>
          </label>
          <select
            id="exp-trip"
            disabled={tripsLoading}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            {...register("tripId")}
          >
            <option value="">
              {tripsLoading ? "Loading…" : "None"}
            </option>
            {trips.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          {errors.tripId ? (
            <p className="mt-1 text-xs text-red-600" role="alert">
              {errors.tripId.message}
            </p>
          ) : null}
        </div>

        <div className="sm:col-span-1">
          <label
            htmlFor="exp-date"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Date
          </label>
          <input
            id="exp-date"
            type="date"
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            {...register("date")}
          />
          {errors.date ? (
            <p className="mt-1 text-xs text-red-600" role="alert">
              {errors.date.message}
            </p>
          ) : null}
        </div>

        <div className="sm:col-span-2">
          <label
            htmlFor="exp-note"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Note <span className="font-normal text-zinc-500">(optional)</span>
          </label>
          <textarea
            id="exp-note"
            rows={2}
            placeholder="What was this for?"
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
              insertExpense.isPending ||
              expenseCategories.length === 0
            }
            className="w-full rounded-lg bg-zinc-900 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-[140px] dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {insertExpense.isPending ? "Saving…" : "Save expense"}
          </button>
        </div>
      </form>

      {insertExpense.isError ? (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {getSupabaseRequestErrorMessage(insertExpense.error)}
        </p>
      ) : null}
    </section>
  );
}
