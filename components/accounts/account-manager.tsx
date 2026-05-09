"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useConfirm } from "@/components/providers/confirm-provider";
import {
  formatAccountBalance,
  useAccountAdjustmentsQuery,
  useDeleteAccountMutation,
  useDeleteRecurringAccountAdjustmentMutation,
  useAccountsQuery,
  useInsertAccountAdjustmentMutation,
  useInsertAccountMutation,
  useInsertRecurringAccountAdjustmentMutation,
  useProcessDueRecurringAccountAdjustmentsMutation,
  useRecurringAccountAdjustmentsQuery,
  useToggleRecurringAccountAdjustmentMutation,
  useUpdateAccountMutation,
} from "@/features/accounts/use-account-data";
import {
  accountAdjustmentSchema,
  accountFormSchema,
  accountRenameSchema,
  recurringAccountAdjustmentSchema,
  type AccountAdjustmentInput,
  type AccountAdjustmentValues,
  type AccountFormInput,
  type AccountFormValues,
  type AccountRenameInput,
  type AccountRenameValues,
  type RecurringAccountAdjustmentInput,
  type RecurringAccountAdjustmentValues,
} from "@/lib/accounts/schemas";
import { getSupabaseRequestErrorMessage } from "@/lib/supabase/error-message";

const TYPE_LABELS: Record<AccountFormInput["type"], string> = {
  cash: "Cash",
  bank: "Bank",
  wallet: "Wallet",
};

function normalizeAccountName(name: string): string {
  return name.trim().toLocaleLowerCase();
}

export function AccountManager() {
  const confirm = useConfirm();
  const { data: accounts = [], isLoading, isError, error } = useAccountsQuery();
  const {
    data: adjustments = [],
    isLoading: adjustmentsLoading,
    isError: adjustmentsError,
    error: adjustmentsQueryError,
  } = useAccountAdjustmentsQuery();
  const { data: recurringAdjustments = [] } = useRecurringAccountAdjustmentsQuery();
  const insertAccount = useInsertAccountMutation();
  const updateAccount = useUpdateAccountMutation();
  const deleteAccount = useDeleteAccountMutation();
  const insertAdjustment = useInsertAccountAdjustmentMutation();
  const insertRecurringAdjustment = useInsertRecurringAccountAdjustmentMutation();
  const toggleRecurringAdjustment = useToggleRecurringAccountAdjustmentMutation();
  const deleteRecurringAdjustment = useDeleteRecurringAccountAdjustmentMutation();
  const processDueAdjustments = useProcessDueRecurringAccountAdjustmentsMutation();
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [newAccountOpen, setNewAccountOpen] = useState(true);
  const [manualAdjustmentOpen, setManualAdjustmentOpen] = useState(false);
  const [recurringOpen, setRecurringOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    clearErrors,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<AccountFormInput, unknown, AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: { name: "", type: "cash", balance: "0" },
  });
  const renameForm = useForm<AccountRenameInput, unknown, AccountRenameValues>({
    resolver: zodResolver(accountRenameSchema),
    defaultValues: { name: "" },
  });
  const adjustmentForm = useForm<
    AccountAdjustmentInput,
    unknown,
    AccountAdjustmentValues
  >({
    resolver: zodResolver(accountAdjustmentSchema),
    defaultValues: {
      accountId: "",
      direction: "credit",
      amount: "0",
      note: "",
    },
  });
  const recurringForm = useForm<
    RecurringAccountAdjustmentInput,
    unknown,
    RecurringAccountAdjustmentValues
  >({
    resolver: zodResolver(recurringAccountAdjustmentSchema),
    defaultValues: {
      accountId: "",
      direction: "credit",
      amount: "0",
      dayOfMonth: "1",
      note: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    const normalizedName = normalizeAccountName(values.name);
    const duplicateExists = accounts.some(
      (account) => normalizeAccountName(account.name) === normalizedName,
    );
    if (duplicateExists) {
      setError("name", {
        type: "manual",
        message: "Account already exists (case-insensitive).",
      });
      return;
    }

    clearErrors("name");
    try {
      await insertAccount.mutateAsync({
        name: values.name,
        type: values.type,
        balance: values.balance,
      });
      toast.success(`Account "${values.name}" added.`);
      reset({ name: "", type: values.type, balance: "0" });
    } catch (mutationError) {
      toast.error(getSupabaseRequestErrorMessage(mutationError));
    }
  });

  const onSubmitAdjustment = adjustmentForm.handleSubmit(async (values) => {
    try {
      await insertAdjustment.mutateAsync({
        accountId: values.accountId,
        direction: values.direction,
        amount: values.amount,
        note: values.note,
      });
      toast.success(
        `${values.direction === "credit" ? "Credited" : "Debited"} ${formatAccountBalance(values.amount)}.`,
      );
      adjustmentForm.reset({
        accountId: values.accountId,
        direction: values.direction,
        amount: "0",
        note: "",
      });
    } catch (mutationError) {
      toast.error(getSupabaseRequestErrorMessage(mutationError));
    }
  });

  const onSubmitRecurring = recurringForm.handleSubmit(async (values) => {
    try {
      await insertRecurringAdjustment.mutateAsync({
        accountId: values.accountId,
        direction: values.direction,
        amount: values.amount,
        dayOfMonth: values.dayOfMonth,
        note: values.note,
      });
      toast.success("Monthly recurring account adjustment added.");
      recurringForm.reset({
        accountId: values.accountId,
        direction: values.direction,
        amount: "0",
        dayOfMonth: String(values.dayOfMonth),
        note: "",
      });
    } catch (mutationError) {
      toast.error(getSupabaseRequestErrorMessage(mutationError));
    }
  });

  async function startEditingAccount(account: {
    id: string;
    name: string;
    type: "cash" | "bank" | "wallet";
  }) {
    setEditingAccountId(account.id);
    renameForm.reset({ name: account.name });
    renameForm.setValue("name", account.name, { shouldValidate: false });
  }

  async function saveAccountEdit(account: {
    id: string;
    type: "cash" | "bank" | "wallet";
  }) {
    const validated = await renameForm.trigger("name");
    if (!validated) return;
    const name = renameForm.getValues("name");
    const normalizedName = normalizeAccountName(name);
    const duplicateExists = accounts.some(
      (existing) =>
        existing.id !== account.id &&
        normalizeAccountName(existing.name) === normalizedName,
    );
    if (duplicateExists) {
      renameForm.setError("name", {
        type: "manual",
        message: "Account already exists (case-insensitive).",
      });
      return;
    }
    try {
      await updateAccount.mutateAsync({
        id: account.id,
        name,
        type: account.type,
      });
      toast.success(`Account renamed to "${name}".`);
      setEditingAccountId(null);
    } catch (mutationError) {
      toast.error(getSupabaseRequestErrorMessage(mutationError));
    }
  }

  async function removeAccount(account: { id: string; name: string }) {
    const ok = await confirm({
      title: `Delete account "${account.name}"?`,
      description:
        "Linked expenses keep their records but this account link will be removed.",
      confirmText: "Delete",
      cancelText: "Cancel",
      intent: "danger",
    });
    if (!ok) return;
    try {
      await deleteAccount.mutateAsync(account.id);
      toast.success(`Deleted "${account.name}".`);
    } catch (mutationError) {
      toast.error(getSupabaseRequestErrorMessage(mutationError));
    }
  }

  function CollapsibleSection(props: {
    id: string;
    title: string;
    description: string;
    open: boolean;
    onToggle: () => void;
    children: React.ReactNode;
  }) {
    return (
      <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:p-5">
        <button
          type="button"
          className="flex w-full cursor-pointer items-center justify-between rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:focus-visible:ring-zinc-600"
          aria-expanded={props.open}
          aria-controls={props.id}
          onClick={props.onToggle}
        >
          <div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              {props.title}
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              {props.description}
            </p>
          </div>
          <span
            className={`ml-4 text-lg leading-none text-zinc-500 transition-transform duration-300 dark:text-zinc-400 ${
              props.open ? "rotate-180" : ""
            }`}
            aria-hidden="true"
          >
            ▾
          </span>
        </button>
        <div
          id={props.id}
          className={`grid overflow-hidden transition-all duration-300 ease-in-out ${
            props.open ? "mt-4 grid-rows-[1fr] opacity-100" : "mt-0 grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="min-h-0">{props.children}</div>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Accounts
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Track balances across cash, wallet, and bank accounts. Linked expenses
          update balances automatically.
        </p>
      </header>

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
              No accounts yet. Expand &quot;New account&quot; below to add one.
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
                  <th className="px-4 py-3 text-right sm:px-5">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {accounts.map((a) => (
                  <tr
                    key={a.id}
                    className="hover:bg-zinc-50/80 dark:hover:bg-zinc-900/30"
                  >
                    <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-50 sm:px-5">
                      {editingAccountId === a.id ? (
                        <>
                          <input
                            type="text"
                            className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                            {...renameForm.register("name")}
                          />
                          <p className="mt-1 min-h-4 text-xs text-red-600" role="alert">
                            {renameForm.formState.errors.name?.message}
                          </p>
                        </>
                      ) : (
                        a.name
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300 sm:px-5">
                      {TYPE_LABELS[a.type]}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-zinc-900 dark:text-zinc-50 sm:px-5">
                      {formatAccountBalance(a.balance)}
                    </td>
                    <td className="space-x-2 whitespace-nowrap px-4 py-3 text-right sm:px-5">
                      {editingAccountId === a.id ? (
                        <>
                          <button
                            type="button"
                            onClick={() => void saveAccountEdit(a)}
                            disabled={updateAccount.isPending}
                            className="cursor-pointer rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingAccountId(null)}
                            className="cursor-pointer rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => void startEditingAccount(a)}
                            className="cursor-pointer rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => void removeAccount(a)}
                            className="cursor-pointer rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <CollapsibleSection
        id="new-account-panel"
        title="New account"
        description="Create another wallet, bank, or cash account."
        open={newAccountOpen}
        onToggle={() => setNewAccountOpen((v) => !v)}
      >
        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
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
              placeholder="e.g. Primary Bank Account"
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
              className="w-full cursor-pointer rounded-lg bg-zinc-900 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-[140px] dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
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
      </CollapsibleSection>

      <CollapsibleSection
        id="manual-account-adjustment-panel"
        title="Credit or debit account"
        description="Apply a one-time balance change to an account."
        open={manualAdjustmentOpen}
        onToggle={() => setManualAdjustmentOpen((v) => !v)}
      >
        <form onSubmit={onSubmitAdjustment} className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="adj-account"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Account
            </label>
            <select
              id="adj-account"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              {...adjustmentForm.register("accountId")}
            >
              <option value="">Select account</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <p className="mt-1 min-h-4 text-xs text-red-600" role="alert">
              {adjustmentForm.formState.errors.accountId?.message}
            </p>
          </div>
          <div>
            <label
              htmlFor="adj-direction"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Type
            </label>
            <select
              id="adj-direction"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              {...adjustmentForm.register("direction")}
            >
              <option value="credit">Credit (+)</option>
              <option value="debit">Debit (-)</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="adj-amount"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Amount
            </label>
            <input
              id="adj-amount"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0.01"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              {...adjustmentForm.register("amount")}
            />
            <p className="mt-1 min-h-4 text-xs text-red-600" role="alert">
              {adjustmentForm.formState.errors.amount?.message}
            </p>
          </div>
          <div>
            <label
              htmlFor="adj-note"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Note (optional)
            </label>
            <input
              id="adj-note"
              type="text"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              {...adjustmentForm.register("note")}
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={adjustmentForm.formState.isSubmitting || insertAdjustment.isPending}
              className="cursor-pointer rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {insertAdjustment.isPending ? "Saving…" : "Apply adjustment"}
            </button>
          </div>
        </form>
      </CollapsibleSection>

      <CollapsibleSection
        id="monthly-recurring-adjustment-panel"
        title="Monthly recurring credit/debit"
        description="Set monthly salary credits or scheduled debits."
        open={recurringOpen}
        onToggle={() => setRecurringOpen((v) => !v)}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Process due recurring rules manually when needed.
          </p>
          <button
            type="button"
            disabled={processDueAdjustments.isPending}
            onClick={async () => {
              try {
                const result = await processDueAdjustments.mutateAsync();
                if (result.processedCount > 0) {
                  toast.success(
                    `Processed ${result.processedCount} monthly recurring ${result.processedCount === 1 ? "adjustment" : "adjustments"}.`,
                  );
                } else {
                  toast.info("No recurring account adjustments due today.");
                }
              } catch (mutationError) {
                toast.error(getSupabaseRequestErrorMessage(mutationError));
              }
            }}
            className="cursor-pointer rounded-lg border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            {processDueAdjustments.isPending ? "Processing…" : "Run due now"}
          </button>
        </div>
        <form onSubmit={onSubmitRecurring} className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="racc-account"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Account
            </label>
            <select
              id="racc-account"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              {...recurringForm.register("accountId")}
            >
              <option value="">Select account</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <p className="mt-1 min-h-4 text-xs text-red-600" role="alert">
              {recurringForm.formState.errors.accountId?.message}
            </p>
          </div>
          <div>
            <label
              htmlFor="racc-direction"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Type
            </label>
            <select
              id="racc-direction"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              {...recurringForm.register("direction")}
            >
              <option value="credit">Credit (+)</option>
              <option value="debit">Debit (-)</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="racc-amount"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Amount
            </label>
            <input
              id="racc-amount"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0.01"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              {...recurringForm.register("amount")}
            />
            <p className="mt-1 min-h-4 text-xs text-red-600" role="alert">
              {recurringForm.formState.errors.amount?.message}
            </p>
          </div>
          <div>
            <label
              htmlFor="racc-day"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Day of month
            </label>
            <input
              id="racc-day"
              type="number"
              min="1"
              max="28"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              {...recurringForm.register("dayOfMonth")}
            />
            <p className="mt-1 min-h-4 text-xs text-red-600" role="alert">
              {recurringForm.formState.errors.dayOfMonth?.message}
            </p>
          </div>
          <div className="sm:col-span-2">
            <label
              htmlFor="racc-note"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Note (optional)
            </label>
            <input
              id="racc-note"
              type="text"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              {...recurringForm.register("note")}
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={
                recurringForm.formState.isSubmitting ||
                insertRecurringAdjustment.isPending
              }
              className="cursor-pointer rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {insertRecurringAdjustment.isPending ? "Saving…" : "Add monthly recurring rule"}
            </button>
          </div>
        </form>

        {recurringAdjustments.length > 0 ? (
          <div className="mt-5 border-t border-zinc-200 pt-4 dark:border-zinc-800">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Existing recurring rules
            </p>
            <ul className="space-y-2">
              {recurringAdjustments.map((rule) => {
                const account = accounts.find((a) => a.id === rule.account_id);
                const accountName = account?.name ?? "Deleted account";
                return (
                  <li
                    key={rule.id}
                    className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-700 dark:bg-zinc-900"
                  >
                    <span className="flex-1 text-sm text-zinc-800 dark:text-zinc-100">
                      {accountName} - {rule.direction === "credit" ? "Credit" : "Debit"}{" "}
                      {formatAccountBalance(rule.amount)} on day {rule.day_of_month}
                    </span>
                    <button
                      type="button"
                      className="cursor-pointer rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      disabled={toggleRecurringAdjustment.isPending}
                      onClick={async () => {
                        try {
                          await toggleRecurringAdjustment.mutateAsync({
                            id: rule.id,
                            isActive: !rule.is_active,
                          });
                          toast.success(
                            `Recurring rule ${rule.is_active ? "paused" : "resumed"}.`,
                          );
                        } catch (mutationError) {
                          toast.error(getSupabaseRequestErrorMessage(mutationError));
                        }
                      }}
                    >
                      {rule.is_active ? "Pause" : "Resume"}
                    </button>
                    <button
                      type="button"
                      className="cursor-pointer rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40"
                      disabled={deleteRecurringAdjustment.isPending}
                      onClick={async () => {
                        const ok = await confirm({
                          title: "Delete monthly recurring rule?",
                          description:
                            "Future automatic credits/debits for this rule will stop.",
                          confirmText: "Delete",
                          cancelText: "Cancel",
                          intent: "danger",
                        });
                        if (!ok) return;
                        try {
                          await deleteRecurringAdjustment.mutateAsync(rule.id);
                          toast.success("Recurring rule deleted.");
                        } catch (mutationError) {
                          toast.error(getSupabaseRequestErrorMessage(mutationError));
                        }
                      }}
                    >
                      Delete
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </CollapsibleSection>

      <CollapsibleSection
        id="account-adjustment-history-panel"
        title="Adjustment history"
        description="Review all manual and recurring credits/debits."
        open={historyOpen}
        onToggle={() => setHistoryOpen((v) => !v)}
      >
        {adjustmentsLoading ? (
          <div className="p-2">
            <p className="text-sm text-zinc-500">Loading adjustment history…</p>
          </div>
        ) : adjustmentsError ? (
          <div
            className="border-t border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950/30"
            role="alert"
          >
            <p className="text-sm text-red-800 dark:text-red-200">
              {getSupabaseRequestErrorMessage(adjustmentsQueryError)}
            </p>
          </div>
        ) : adjustments.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-200 p-8 text-center dark:border-zinc-700">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              No adjustments yet.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-medium uppercase tracking-wide text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
                <tr>
                  <th className="px-4 py-3 sm:px-5">Date</th>
                  <th className="px-4 py-3 sm:px-5">Account</th>
                  <th className="px-4 py-3 sm:px-5">Type</th>
                  <th className="px-4 py-3 text-right sm:px-5">Amount</th>
                  <th className="px-4 py-3 sm:px-5">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {adjustments.map((adjustment) => (
                  <tr key={adjustment.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-900/30">
                    <td className="whitespace-nowrap px-4 py-3 text-zinc-700 dark:text-zinc-300 sm:px-5">
                      {new Date(adjustment.effective_date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-50 sm:px-5">
                      {adjustment.account_name_snapshot}
                    </td>
                    <td className="px-4 py-3 sm:px-5">
                      <span
                        className={
                          adjustment.direction === "credit"
                            ? "rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200"
                            : "rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950/60 dark:text-amber-200"
                        }
                      >
                        {adjustment.direction === "credit" ? "Credit" : "Debit"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-zinc-900 dark:text-zinc-50 sm:px-5">
                      {formatAccountBalance(adjustment.amount)}
                    </td>
                    <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300 sm:px-5">
                      {adjustment.note?.trim() ? adjustment.note : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CollapsibleSection>
    </div>
  );
}
