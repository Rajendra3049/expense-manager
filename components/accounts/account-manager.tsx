"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  formatAccountBalance,
  useAccountsQuery,
  useInsertAccountMutation,
} from "@/features/accounts/use-account-data";
import {
  accountFormSchema,
  type AccountFormInput,
  type AccountFormValues,
} from "@/lib/accounts/schemas";
import { getSupabaseRequestErrorMessage } from "@/lib/supabase/error-message";

const TYPE_LABELS: Record<AccountFormInput["type"], string> = {
  cash: "Cash",
  bank: "Bank",
  wallet: "Wallet",
};

export function AccountManager() {
  const { data: accounts = [], isLoading, isError, error } = useAccountsQuery();
  const insertAccount = useInsertAccountMutation();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AccountFormInput, unknown, AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: { name: "", type: "cash", balance: "0" },
  });

  const onSubmit = handleSubmit(async (values) => {
    await insertAccount.mutateAsync({
      name: values.name,
      type: values.type,
      balance: values.balance,
    });
    reset({ name: "", type: values.type, balance: "0" });
  });

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Accounts
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Track balances per wallet or bank account. Expenses linked to an
          account update its balance automatically.
        </p>
      </header>

      <section
        className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:p-5"
        aria-labelledby="add-account-heading"
      >
        <h2
          id="add-account-heading"
          className="text-base font-semibold text-zinc-900 dark:text-zinc-50"
        >
          New account
        </h2>
        <form onSubmit={onSubmit} className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-1">
            <label
              htmlFor="acc-name"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Name
            </label>
            <input
              id="acc-name"
              type="text"
              placeholder="e.g. Checking"
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
              htmlFor="acc-type"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Type
            </label>
            <select
              id="acc-type"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              {...register("type")}
            >
              <option value="cash">{TYPE_LABELS.cash}</option>
              <option value="bank">{TYPE_LABELS.bank}</option>
              <option value="wallet">{TYPE_LABELS.wallet}</option>
            </select>
            {errors.type ? (
              <p className="mt-1 text-xs text-red-600" role="alert">
                {errors.type.message}
              </p>
            ) : null}
          </div>

          <div className="sm:col-span-2">
            <label
              htmlFor="acc-balance"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Starting balance
            </label>
            <input
              id="acc-balance"
              type="number"
              inputMode="decimal"
              step="0.01"
              className="mt-1 w-full max-w-xs rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              {...register("balance")}
            />
            {errors.balance ? (
              <p className="mt-1 text-xs text-red-600" role="alert">
                {errors.balance.message}
              </p>
            ) : null}
          </div>

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={isSubmitting || insertAccount.isPending}
              className="w-full rounded-lg bg-zinc-900 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-[140px] dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {insertAccount.isPending ? "Saving…" : "Add account"}
            </button>
          </div>
        </form>

        {insertAccount.isError ? (
          <p className="mt-3 text-sm text-red-600" role="alert">
            {getSupabaseRequestErrorMessage(insertAccount.error)}
          </p>
        ) : null}
      </section>

      <section
        className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
        aria-labelledby="accounts-list-heading"
      >
        <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800 sm:px-5">
          <h2
            id="accounts-list-heading"
            className="text-base font-semibold text-zinc-900 dark:text-zinc-50"
          >
            Your accounts
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Balance reflects starting amount minus expenses linked here.
          </p>
        </div>

        {isLoading ? (
          <div className="p-6">
            <p className="text-sm text-zinc-500">Loading accounts…</p>
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
        ) : accounts.length === 0 ? (
          <div className="border-t border-dashed border-zinc-200 p-8 text-center dark:border-zinc-700">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              No accounts yet. Add one above, then pick it when logging
              expenses.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-medium uppercase tracking-wide text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
                <tr>
                  <th className="px-4 py-3 sm:px-5">Name</th>
                  <th className="px-4 py-3 sm:px-5">Type</th>
                  <th className="px-4 py-3 text-right sm:px-5">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {accounts.map((a) => (
                  <tr
                    key={a.id}
                    className="hover:bg-zinc-50/80 dark:hover:bg-zinc-900/30"
                  >
                    <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-50 sm:px-5">
                      {a.name}
                    </td>
                    <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300 sm:px-5">
                      {TYPE_LABELS[a.type]}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-zinc-900 dark:text-zinc-50 sm:px-5">
                      {formatAccountBalance(a.balance)}
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
