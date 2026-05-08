"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useConfirm } from "@/components/providers/confirm-provider";
import {
  formatDebtAmount,
  formatDebtBalance,
  useDeleteDebtAccountMutation,
  useDebtEntriesQuery,
  useDebtsQuery,
  useInsertDebtAccountMutation,
  useInsertDebtEntryMutation,
  useSettleDebtAccountMutation,
  useUpdateDebtDueDateMutation,
} from "@/features/debts/use-debt-data";
import {
  debtAccountSchema,
  debtEntrySchema,
  type DebtAccountInput,
  type DebtAccountValues,
  type DebtEntryInput,
  type DebtEntryValues,
} from "@/lib/debts/schemas";
import { getSupabaseRequestErrorMessage } from "@/lib/supabase/error-message";

const TYPE_LABELS: Record<DebtAccountInput["type"], string> = {
  given: "Money Lent (Receivable)",
  taken: "Money Borrowed (Payable)",
};

const ENTRY_TYPE_LABELS: Record<DebtEntryInput["entryType"], string> = {
  borrow: "Add Borrowing",
  payment: "Record Payment",
};

function statusBadge(settled: boolean) {
  if (settled) {
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

export function DebtKhataManager() {
  const confirm = useConfirm();
  const [newDebtOpen, setNewDebtOpen] = useState(true);
  const [entryOpen, setEntryOpen] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(true);
  const { data: debtAccounts = [], isLoading, isError, error } = useDebtsQuery();
  const { data: debtEntries = [], isLoading: entriesLoading } = useDebtEntriesQuery();
  const insertDebtAccount = useInsertDebtAccountMutation();
  const insertDebtEntry = useInsertDebtEntryMutation();
  const settleDebtAccount = useSettleDebtAccountMutation();
  const updateDebtDueDate = useUpdateDebtDueDateMutation();
  const deleteDebtAccount = useDeleteDebtAccountMutation();

  const accountForm = useForm<DebtAccountInput, unknown, DebtAccountValues>({
    resolver: zodResolver(debtAccountSchema),
    defaultValues: {
      name: "",
      type: "taken",
      openingAmount: "",
      dueDate: "",
      note: "",
    },
  });
  const entryForm = useForm<DebtEntryInput, unknown, DebtEntryValues>({
    resolver: zodResolver(debtEntrySchema),
    defaultValues: {
      debtAccountId: "",
      entryType: "payment",
      amount: "",
      happenedOn: new Date().toISOString().slice(0, 10),
      note: "",
    },
  });

  const onCreateAccount = accountForm.handleSubmit(async (values) => {
    const normalizedName = values.name.trim().toLocaleLowerCase();
    const duplicateExists = debtAccounts.some((account) => {
      return account.name.trim().toLocaleLowerCase() === normalizedName;
    });
    if (duplicateExists) {
      accountForm.setError("name", {
        type: "manual",
        message: "Debt account already exists (case-insensitive).",
      });
      toast.error(`"${values.name}" already exists.`);
      return;
    }
    accountForm.clearErrors("name");
    try {
      await insertDebtAccount.mutateAsync(values);
      toast.success(`Debt account "${values.name}" created.`);
      accountForm.reset({
        name: "",
        type: values.type,
        openingAmount: "",
        dueDate: "",
        note: "",
      });
    } catch (mutationError) {
      toast.error(getSupabaseRequestErrorMessage(mutationError));
    }
  });

  const onCreateEntry = entryForm.handleSubmit(async (values) => {
    try {
      await insertDebtEntry.mutateAsync(values);
      toast.success("Debt entry recorded.");
      entryForm.reset({
        debtAccountId: values.debtAccountId,
        entryType: values.entryType,
        amount: "",
        happenedOn: values.happenedOn,
        note: "",
      });
    } catch (mutationError) {
      toast.error(getSupabaseRequestErrorMessage(mutationError));
    }
  });

  const activeAccounts = useMemo(
    () => debtAccounts.filter((account) => !account.is_settled),
    [debtAccounts],
  );
  const groupedEntries = useMemo(() => {
    return debtEntries.reduce<Record<string, typeof debtEntries>>((acc, entry) => {
      if (!acc[entry.debt_account_id]) {
        acc[entry.debt_account_id] = [];
      }
      acc[entry.debt_account_id].push(entry);
      return acc;
    }, {});
  }, [debtEntries]);

  async function onSettle(accountId: string, accountName: string) {
    const ok = await confirm({
      title: `Mark "${accountName}" as settled?`,
      description: "Only settle when this account balance is exactly zero.",
      confirmText: "Mark settled",
      cancelText: "Cancel",
      intent: "default",
    });
    if (!ok) return;
    try {
      await settleDebtAccount.mutateAsync(accountId);
      toast.success(`"${accountName}" settled.`);
    } catch (mutationError) {
      toast.error(getSupabaseRequestErrorMessage(mutationError));
    }
  }

  async function updateDueDate(accountId: string, dueDate: string) {
    try {
      await updateDebtDueDate.mutateAsync({ id: accountId, dueDate });
      toast.success("Due date updated.");
    } catch (mutationError) {
      toast.error(getSupabaseRequestErrorMessage(mutationError));
    }
  }

  async function onDeleteAccount(accountId: string, accountName: string) {
    const ok = await confirm({
      title: `Delete "${accountName}"?`,
      description:
        "This will permanently delete this debt account and all its entries. This action cannot be undone.",
      confirmText: "Delete account",
      cancelText: "Cancel",
      intent: "destructive",
    });
    if (!ok) return;
    try {
      await deleteDebtAccount.mutateAsync(accountId);
      toast.success(`Debt account "${accountName}" deleted.`);
    } catch (mutationError) {
      toast.error(getSupabaseRequestErrorMessage(mutationError));
    }
  }

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Debts
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Manage person-wise debt ledgers with running balances, due dates, and
          complete transaction history.
        </p>
      </header>

      <section
        className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
        aria-labelledby="debt-accounts-list-heading"
      >
        <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800 sm:px-5">
          <h2
            id="debt-accounts-list-heading"
            className="text-base font-semibold text-zinc-900 dark:text-zinc-50"
          >
            Debt accounts
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Active accounts appear first and are sorted by nearest due date.
          </p>
        </div>

        {isLoading ? (
          <div className="p-6">
            <p className="text-sm text-zinc-500">Loading debt accounts...</p>
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
        ) : debtAccounts.length === 0 ? (
          <div className="border-t border-dashed border-zinc-200 p-8 text-center dark:border-zinc-700">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              No debt accounts yet. Create one below.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-medium uppercase tracking-wide text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
                <tr>
                  <th className="px-4 py-3 sm:px-5">Name</th>
                  <th className="px-4 py-3 sm:px-5">Type</th>
                  <th className="px-4 py-3 sm:px-5">Due</th>
                  <th className="px-4 py-3 text-right sm:px-5">Balance</th>
                  <th className="px-4 py-3 sm:px-5">Status</th>
                  <th className="px-4 py-3 sm:px-5">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {debtAccounts.map((account) => (
                  <tr
                    key={account.id}
                    className="hover:bg-zinc-50/80 dark:hover:bg-zinc-900/30"
                  >
                    <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-50 sm:px-5">
                      <div>{account.name}</div>
                      {account.note ? (
                        <p className="mt-0.5 max-w-[220px] truncate text-xs font-normal text-zinc-500 dark:text-zinc-400">
                          {account.note}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300 sm:px-5">
                      {TYPE_LABELS[account.type]}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 sm:px-5">
                      <input
                        type="date"
                        defaultValue={account.due_date ?? ""}
                        disabled={account.is_settled || updateDebtDueDate.isPending}
                        onBlur={(event) => {
                          const nextDate = event.currentTarget.value;
                          if ((account.due_date ?? "") === nextDate) return;
                          void updateDueDate(account.id, nextDate);
                        }}
                        className="w-[160px] rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                      />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-zinc-900 dark:text-zinc-50 sm:px-5">
                      {formatDebtBalance({ amount: account.balance, type: account.type })}
                    </td>
                    <td className="px-4 py-3 sm:px-5">{statusBadge(account.is_settled)}</td>
                    <td className="px-4 py-3 sm:px-5">
                      {!account.is_settled ? (
                        <div className="flex items-center gap-2">
                          <span
                            title={
                              Number(account.balance) !== 0
                                ? "Available only when account balance is exactly INR 0."
                                : undefined
                            }
                            className={Number(account.balance) !== 0 ? "cursor-help" : ""}
                          >
                            <button
                              type="button"
                              disabled={settleDebtAccount.isPending || Number(account.balance) !== 0}
                              onClick={() => void onSettle(account.id, account.name)}
                              className="cursor-pointer rounded-lg border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-800 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-900"
                            >
                              Mark settled
                            </button>
                          </span>
                          <button
                            type="button"
                            onClick={() => void onDeleteAccount(account.id, account.name)}
                            disabled={deleteDebtAccount.isPending}
                            className="cursor-pointer rounded-lg border border-red-300 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/30"
                          >
                            Delete
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void onDeleteAccount(account.id, account.name)}
                          disabled={deleteDebtAccount.isPending}
                          className="cursor-pointer rounded-lg border border-red-300 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/30"
                        >
                          Delete
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

      <CollapsibleSection
        id="new-debt-account-panel"
        title="New debt account"
        description="Create a debt account for a person with an opening balance."
        open={newDebtOpen}
        onToggle={() => setNewDebtOpen((v) => !v)}
      >
        <form onSubmit={onCreateAccount} className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="debt-name"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Name
            </label>
            <input
              id="debt-name"
              type="text"
              placeholder="e.g. Vendor Advance Account"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              {...accountForm.register("name")}
            />
            <p className="mt-1 min-h-4 text-xs text-red-600" role="alert">
              {accountForm.formState.errors.name?.message}
            </p>
          </div>
          <div>
            <label
              htmlFor="debt-type"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Type
            </label>
            <select
              id="debt-type"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              {...accountForm.register("type")}
            >
              <option value="taken">{TYPE_LABELS.taken}</option>
              <option value="given">{TYPE_LABELS.given}</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="debt-opening-amount"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Opening amount
            </label>
            <input
              id="debt-opening-amount"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0.01"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              {...accountForm.register("openingAmount")}
            />
            <p className="mt-1 min-h-4 text-xs text-red-600" role="alert">
              {accountForm.formState.errors.openingAmount?.message}
            </p>
          </div>
          <div>
            <label
              htmlFor="debt-due-date"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Due date (optional)
            </label>
            <input
              id="debt-due-date"
              type="date"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              {...accountForm.register("dueDate")}
            />
          </div>
          <div className="sm:col-span-2">
            <label
              htmlFor="debt-note"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Note (optional)
            </label>
            <textarea
              id="debt-note"
              rows={2}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              {...accountForm.register("note")}
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={accountForm.formState.isSubmitting || insertDebtAccount.isPending}
              className="w-full cursor-pointer rounded-lg bg-zinc-900 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-[160px] dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {insertDebtAccount.isPending ? "Saving..." : "Create debt account"}
            </button>
          </div>
        </form>
      </CollapsibleSection>

      <CollapsibleSection
        id="debt-entry-panel"
        title="Add debt entry"
        description="Add more borrowed amount or payment against an account."
        open={entryOpen}
        onToggle={() => setEntryOpen((v) => !v)}
      >
        <form onSubmit={onCreateEntry} className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="debt-entry-account"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Debt account
            </label>
            <select
              id="debt-entry-account"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              {...entryForm.register("debtAccountId")}
            >
              <option value="">Select account</option>
              {activeAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
            <p className="mt-1 min-h-4 text-xs text-red-600" role="alert">
              {entryForm.formState.errors.debtAccountId?.message}
            </p>
          </div>
          <div>
            <label
              htmlFor="debt-entry-type"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Entry type
            </label>
            <select
              id="debt-entry-type"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              {...entryForm.register("entryType")}
            >
              <option value="borrow">{ENTRY_TYPE_LABELS.borrow}</option>
              <option value="payment">{ENTRY_TYPE_LABELS.payment}</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="debt-entry-amount"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Amount
            </label>
            <input
              id="debt-entry-amount"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0.01"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              {...entryForm.register("amount")}
            />
            <p className="mt-1 min-h-4 text-xs text-red-600" role="alert">
              {entryForm.formState.errors.amount?.message}
            </p>
          </div>
          <div>
            <label
              htmlFor="debt-entry-date"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Date
            </label>
            <input
              id="debt-entry-date"
              type="date"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              {...entryForm.register("happenedOn")}
            />
          </div>
          <div className="sm:col-span-2">
            <label
              htmlFor="debt-entry-note"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Note (optional)
            </label>
            <input
              id="debt-entry-note"
              type="text"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              {...entryForm.register("note")}
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={entryForm.formState.isSubmitting || insertDebtEntry.isPending}
              className="cursor-pointer rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {insertDebtEntry.isPending ? "Saving..." : "Add entry"}
            </button>
          </div>
        </form>
      </CollapsibleSection>

      <CollapsibleSection
        id="debt-history-panel"
        title="Account-wise history"
        description="Review complete transaction history for each debt account."
        open={historyOpen}
        onToggle={() => setHistoryOpen((v) => !v)}
      >
        {entriesLoading ? (
          <p className="text-sm text-zinc-500">Loading history...</p>
        ) : debtAccounts.length === 0 ? (
          <p className="text-sm text-zinc-500">No debt accounts yet.</p>
        ) : (
          <div className="space-y-4">
            {debtAccounts.map((account) => (
              <div key={account.id} className="rounded-lg border border-zinc-200 dark:border-zinc-800">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{account.name}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {formatDebtBalance({ amount: account.balance, type: account.type })}
                  </p>
                </div>
                {groupedEntries[account.id]?.length ? (
                  <ul className="divide-y divide-zinc-100 text-sm dark:divide-zinc-900">
                    {groupedEntries[account.id].map((entry) => (
                      <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                        <div>
                          <p className="text-zinc-800 dark:text-zinc-100">
                            {ENTRY_TYPE_LABELS[entry.entry_type]}
                          </p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            {formatDisplayDate(entry.happened_on)}
                            {entry.note ? ` - ${entry.note}` : ""}
                          </p>
                        </div>
                        <p className="tabular-nums text-zinc-900 dark:text-zinc-50">
                          {formatDebtAmount(entry.amount)}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-3 py-3 text-xs text-zinc-500 dark:text-zinc-400">No entries yet.</p>
                )}
              </div>
            ))}
          </div>
        )}
      </CollapsibleSection>
    </div>
  );
}
