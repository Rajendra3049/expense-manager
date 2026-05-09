"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { useAccountsQuery } from "@/features/accounts/use-account-data";
import { useDebtsQuery } from "@/features/debts/use-debt-data";
import { useEmisQuery } from "@/features/emis/use-emi-data";
import {
  useCategoriesQuery,
  useInsertExpenseMutation,
  toLocalDateString,
} from "@/features/expenses/use-expense-data";
import { useInvestmentsQuery } from "@/features/investments/use-investment-data";
import { useTripsQuery } from "@/features/trips/use-trip-data";
import {
  expenseFormSchema,
  parseExpenseAmount,
  type ExpenseFormValues,
} from "@/lib/expenses/schemas";
import { getSupabaseRequestErrorMessage } from "@/lib/supabase/error-message";

function linkPayloadFromForm(values: ExpenseFormValues): {
  tripId: string;
  emiId: string;
  investmentId: string;
  debtAccountId: string;
} {
  const id = values.linkTargetId?.trim() ?? "";
  const empty = { tripId: "", emiId: "", investmentId: "", debtAccountId: "" };
  if (!values.linkKind || !id) return empty;
  switch (values.linkKind) {
    case "trip":
      return { ...empty, tripId: id };
    case "emi":
      return { ...empty, emiId: id };
    case "investment":
      return { ...empty, investmentId: id };
    case "debt":
      return { ...empty, debtAccountId: id };
    default:
      return empty;
  }
}

export function ExpenseForm() {
  const { data: categories = [], isLoading: categoriesLoading } =
    useCategoriesQuery();
  const { data: accounts = [], isLoading: accountsLoading } =
    useAccountsQuery();
  const { data: trips = [], isLoading: tripsLoading } = useTripsQuery();
  const { data: emis = [], isLoading: emisLoading } = useEmisQuery();
  const { data: investments = [], isLoading: investmentsLoading } =
    useInvestmentsQuery();
  const { data: debtAccounts = [], isLoading: debtsLoading } = useDebtsQuery();
  const expenseCategories = useMemo(
    () => categories.filter((c) => c.type === "expense"),
    [categories],
  );

  const insertExpense = useInsertExpenseMutation();
  const today = useMemo(() => toLocalDateString(new Date()), []);

  const {
    register,
    control,
    handleSubmit,
    reset,
    resetField,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      amount: "",
      categoryId: "",
      accountId: "",
      linkKind: "",
      linkTargetId: "",
      date: today,
      note: "",
      tags: "",
    },
  });

  const linkKind = useWatch({ control, name: "linkKind", defaultValue: "" });

  const linkKindRegister = register("linkKind");

  const linkTargetListLoading =
    (linkKind === "trip" && tripsLoading) ||
    (linkKind === "emi" && emisLoading) ||
    (linkKind === "investment" && investmentsLoading) ||
    (linkKind === "debt" && debtsLoading);

  const linkTargetEmpty =
    (linkKind === "trip" && trips.length === 0) ||
    (linkKind === "emi" && emis.length === 0) ||
    (linkKind === "investment" && investments.length === 0) ||
    (linkKind === "debt" && debtAccounts.length === 0);

  const onSubmit = handleSubmit(async (values) => {
    const links = linkPayloadFromForm(values);
    await insertExpense.mutateAsync({
      amount: parseExpenseAmount(values.amount),
      categoryId: values.categoryId,
      accountId: values.accountId ?? "",
      ...links,
      date: values.date,
      note: values.note?.trim() ?? "",
      tags: values.tags ?? [],
    });
    toast.success("Expense saved.");
    reset({
      amount: "",
      categoryId: "",
      accountId: "",
      linkKind: "",
      linkTargetId: "",
      date: values.date,
      note: "",
      tags: "",
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
            <p className="mt-1 min-h-4 text-xs text-red-600" role="alert">
              {errors.amount.message}
            </p>
          ) : (
            <p className="mt-1 min-h-4" aria-hidden="true" />
          )}
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
            className="mt-1 w-full cursor-pointer rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
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
            <p className="mt-1 min-h-4 text-xs text-red-600" role="alert">
              {errors.categoryId.message}
            </p>
          ) : (
            <p className="mt-1 min-h-4" aria-hidden="true" />
          )}
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
            className="mt-1 w-full cursor-pointer rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
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
            <p className="mt-1 min-h-4 text-xs text-red-600" role="alert">
              {errors.accountId.message}
            </p>
          ) : (
            <p className="mt-1 min-h-4" aria-hidden="true" />
          )}
        </div>

        <div className="sm:col-span-1">
          <label
            htmlFor="exp-link-kind"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Also link to{" "}
            <span className="font-normal text-zinc-500">(optional)</span>
          </label>
          <select
            id="exp-link-kind"
            className="mt-1 w-full cursor-pointer rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            {...linkKindRegister}
            onChange={(e) => {
              linkKindRegister.onChange(e);
              resetField("linkTargetId");
            }}
          >
            <option value="">None</option>
            <option value="trip">Trip</option>
            <option value="emi">EMI</option>
            <option value="investment">Investment</option>
            <option value="debt">Debt account</option>
          </select>
          <p className="mt-1 min-h-4 text-xs text-zinc-500 dark:text-zinc-400">
            Linking records the same payment on the trip, EMI, investment, or
            debt ledger. Only one link applies per expense.
          </p>
        </div>

        {linkKind ? (
          <div className="sm:col-span-2">
            <label
              htmlFor="exp-link-target"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              {linkKind === "trip"
                ? "Trip"
                : linkKind === "emi"
                  ? "EMI"
                  : linkKind === "investment"
                    ? "Investment"
                    : "Debt account"}
            </label>
            <select
              id="exp-link-target"
              disabled={linkTargetListLoading || linkTargetEmpty}
              title={
                linkTargetEmpty
                  ? `Create a ${linkKind === "debt" ? "debt account" : linkKind} first, then link it here.`
                  : undefined
              }
              aria-describedby={
                linkTargetEmpty ? "exp-link-target-hint" : undefined
              }
              className="mt-1 w-full cursor-pointer rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              {...register("linkTargetId")}
            >
              <option value="">
                {linkTargetListLoading
                  ? "Loading…"
                  : linkTargetEmpty
                    ? "No records available yet"
                    : "Select one"}
              </option>
              {linkKind === "trip"
                ? trips.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))
                : null}
              {linkKind === "emi"
                ? emis.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.name}
                    </option>
                  ))
                : null}
              {linkKind === "investment"
                ? investments.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.name}
                    </option>
                  ))
                : null}
              {linkKind === "debt"
                ? debtAccounts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                      {d.is_settled ? " (settled)" : ""}
                    </option>
                  ))
                : null}
            </select>
            {linkTargetEmpty ? (
              <p
                id="exp-link-target-hint"
                className="mt-1 min-h-4 text-xs text-zinc-600 dark:text-zinc-400"
              >
                Add this record under its page in the app, then return here to
                link the expense.
              </p>
            ) : errors.linkTargetId ? (
              <p className="mt-1 min-h-4 text-xs text-red-600" role="alert">
                {errors.linkTargetId.message}
              </p>
            ) : (
              <p className="mt-1 min-h-4" aria-hidden="true" />
            )}
          </div>
        ) : null}

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
            <p className="mt-1 min-h-4 text-xs text-red-600" role="alert">
              {errors.date.message}
            </p>
          ) : (
            <p className="mt-1 min-h-4" aria-hidden="true" />
          )}
        </div>

        <div className="sm:col-span-2">
          <label
            htmlFor="exp-tags"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Tags{" "}
            <span className="font-normal text-zinc-500">
              (optional, comma-separated)
            </span>
          </label>
          <input
            id="exp-tags"
            type="text"
            placeholder="e.g. quarterly, project-a"
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            {...register("tags")}
          />
          {errors.tags?.message ? (
            <p className="mt-1 min-h-4 text-xs text-red-600" role="alert">
              {errors.tags.message}
            </p>
          ) : (
            <p className="mt-1 min-h-4" aria-hidden="true" />
          )}
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
            placeholder="Add context for this expense"
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            {...register("note")}
          />
          {errors.note ? (
            <p className="mt-1 min-h-4 text-xs text-red-600" role="alert">
              {errors.note.message}
            </p>
          ) : (
            <p className="mt-1 min-h-4" aria-hidden="true" />
          )}
        </div>

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={
              isSubmitting ||
              insertExpense.isPending ||
              expenseCategories.length === 0 ||
              (Boolean(linkKind) &&
                (linkTargetEmpty ||
                  linkTargetListLoading))
            }
            title={
              Boolean(linkKind) && linkTargetEmpty
                ? "Create the selected record type first, or set link to None."
                : undefined
            }
            className="w-full cursor-pointer rounded-lg bg-zinc-900 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-[140px] dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
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
