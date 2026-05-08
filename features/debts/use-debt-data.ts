"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { debtKeys } from "@/features/debts/query-keys";
import type { DebtAccountRow, DebtEntryRow } from "@/features/debts/types";
import { suppressGlobalMutationErrorMeta } from "@/lib/react-query/query-meta";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

function num(v: string | number): number {
  return typeof v === "number" ? v : Number.parseFloat(String(v));
}

export function useDebtsQuery() {
  return useQuery({
    queryKey: debtKeys.all,
    queryFn: async (): Promise<DebtAccountRow[]> => {
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase
        .from("debt_accounts")
        .select(
          "id, name, type, due_date, note, balance, is_settled, settled_at, created_at, updated_at",
        )
        .order("is_settled", { ascending: true })
        .order("due_date", { ascending: true, nullsFirst: false })
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as DebtAccountRow[];
    },
  });
}

export function useDebtEntriesQuery() {
  return useQuery({
    queryKey: [...debtKeys.all, "entries"],
    queryFn: async (): Promise<DebtEntryRow[]> => {
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase
        .from("debt_account_entries")
        .select("id, debt_account_id, entry_type, amount, note, happened_on, created_at")
        .order("happened_on", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DebtEntryRow[];
    },
  });
}

async function getSignedInUserId() {
  const supabase = createBrowserSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("You must be signed in.");
  return { supabase, userId: user.id };
}

function normalizeDebtAccountName(name: string): string {
  return name.trim().toLocaleLowerCase();
}

async function assertNoDuplicateDebtAccountName(params: {
  userId: string;
  name: string;
}) {
  const supabase = createBrowserSupabaseClient();
  const normalizedInput = normalizeDebtAccountName(params.name);
  const { data: existing, error } = await supabase
    .from("debt_accounts")
    .select("name")
    .eq("user_id", params.userId);
  if (error) throw error;
  const duplicateExists = (existing ?? []).some((row: { name: string }) => {
    return normalizeDebtAccountName(row.name) === normalizedInput;
  });
  if (duplicateExists) {
    throw new Error("Debt account already exists. Use a different name.");
  }
}

export function useInsertDebtAccountMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    meta: suppressGlobalMutationErrorMeta,
    mutationFn: async (input: {
      name: string;
      type: "given" | "taken";
      openingAmount: number;
      dueDate: string;
      note: string;
    }) => {
      const { supabase, userId } = await getSignedInUserId();
      await assertNoDuplicateDebtAccountName({ userId, name: input.name });
      const { data: account, error: accountError } = await supabase
        .from("debt_accounts")
        .insert({
          user_id: userId,
          name: input.name.trim(),
          type: input.type,
          due_date: input.dueDate || null,
          note: input.note,
        })
        .select("id")
        .single();
      if (accountError) throw accountError;

      const { error } = await supabase.from("debt_account_entries").insert({
        user_id: userId,
        debt_account_id: account.id,
        entry_type: "borrow",
        amount: input.openingAmount,
        happened_on: new Date().toISOString().slice(0, 10),
        note: "Opening balance",
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: debtKeys.all });
      await queryClient.invalidateQueries({ queryKey: [...debtKeys.all, "entries"] });
    },
  });
}

export function useInsertDebtEntryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    meta: suppressGlobalMutationErrorMeta,
    mutationFn: async (input: {
      debtAccountId: string;
      entryType: "borrow" | "payment";
      amount: number;
      happenedOn: string;
      note?: string;
    }) => {
      const { supabase, userId } = await getSignedInUserId();
      const { error } = await supabase.from("debt_account_entries").insert({
        user_id: userId,
        debt_account_id: input.debtAccountId,
        entry_type: input.entryType,
        amount: input.amount,
        happened_on: input.happenedOn,
        note: input.note?.trim() ? input.note.trim() : "",
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: debtKeys.all });
      await queryClient.invalidateQueries({ queryKey: [...debtKeys.all, "entries"] });
    },
  });
}

export function useSettleDebtAccountMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    meta: suppressGlobalMutationErrorMeta,
    mutationFn: async (id: string) => {
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase
        .from("debt_accounts")
        .update({
          is_settled: true,
          settled_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("is_settled", false)
        .eq("balance", 0)
        .select("id")
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        throw new Error("Only zero-balance debt accounts can be settled.");
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: debtKeys.all });
    },
  });
}

export function useUpdateDebtDueDateMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    meta: suppressGlobalMutationErrorMeta,
    mutationFn: async (input: { id: string; dueDate: string }) => {
      const { supabase, userId } = await getSignedInUserId();
      const { error } = await supabase
        .from("debt_accounts")
        .update({
          due_date: input.dueDate || null,
        })
        .eq("id", input.id)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: debtKeys.all });
    },
  });
}

export function useDeleteDebtAccountMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    meta: suppressGlobalMutationErrorMeta,
    mutationFn: async (id: string) => {
      const { supabase, userId } = await getSignedInUserId();

      const { error: entriesError } = await supabase
        .from("debt_account_entries")
        .delete()
        .eq("debt_account_id", id)
        .eq("user_id", userId);
      if (entriesError) throw entriesError;

      const { error: accountError } = await supabase
        .from("debt_accounts")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);
      if (accountError) throw accountError;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: debtKeys.all });
      await queryClient.invalidateQueries({ queryKey: [...debtKeys.all, "entries"] });
    },
  });
}

export function formatDebtBalance(params: { amount: string | number; type: "given" | "taken" }) {
  const sign = params.type === "given" ? "To Recover" : "To Pay";
  return `${sign}: ${new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(num(params.amount))}`;
}

export function formatDebtAmount(value: string | number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(num(value));
}
