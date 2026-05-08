"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { accountKeys } from "@/features/accounts/query-keys";
import type {
  AccountAdjustmentRow,
  AccountRow,
  RecurringAccountAdjustmentRow,
} from "@/features/accounts/types";
import { suppressGlobalMutationErrorMeta } from "@/lib/react-query/query-meta";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

function num(v: string | number): number {
  return typeof v === "number" ? v : Number.parseFloat(String(v));
}

function normalizeAccountName(name: string): string {
  return name.trim().toLocaleLowerCase();
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

async function assertNoDuplicateAccountName(params: {
  userId: string;
  name: string;
  excludeId?: string;
}) {
  const supabase = createBrowserSupabaseClient();
  const normalizedInput = normalizeAccountName(params.name);
  const { data: existing, error: existingError } = await supabase
    .from("accounts")
    .select("id, name")
    .eq("user_id", params.userId);
  if (existingError) throw existingError;

  const duplicateExists = (existing ?? []).some((row: { id: string; name: string }) => {
    if (params.excludeId && row.id === params.excludeId) return false;
    return normalizeAccountName(row.name) === normalizedInput;
  });
  if (duplicateExists) {
    throw new Error("Account already exists. Use a different name.");
  }
}

export function useAccountsQuery() {
  return useQuery({
    queryKey: accountKeys.all,
    queryFn: async (): Promise<AccountRow[]> => {
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase
        .from("accounts")
        .select("id, name, type, balance, created_at")
        .order("name", { ascending: true });

      if (error) throw error;
      return (data ?? []) as AccountRow[];
    },
  });
}

export function useInsertAccountMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    meta: suppressGlobalMutationErrorMeta,
    mutationFn: async (input: {
      name: string;
      type: "cash" | "bank" | "wallet";
      balance: number;
    }) => {
      const { supabase, userId } = await getSignedInUserId();
      await assertNoDuplicateAccountName({ userId, name: input.name });

      const { error } = await supabase.from("accounts").insert({
        user_id: userId,
        name: input.name.trim(),
        type: input.type,
        balance: input.balance,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: accountKeys.all });
    },
  });
}

export function useUpdateAccountMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    meta: suppressGlobalMutationErrorMeta,
    mutationFn: async (input: {
      id: string;
      name: string;
      type: "cash" | "bank" | "wallet";
    }) => {
      const { supabase, userId } = await getSignedInUserId();
      await assertNoDuplicateAccountName({
        userId,
        name: input.name,
        excludeId: input.id,
      });

      const { error } = await supabase
        .from("accounts")
        .update({
          name: input.name.trim(),
          type: input.type,
        })
        .eq("id", input.id)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: accountKeys.all });
    },
  });
}

export function useDeleteAccountMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    meta: suppressGlobalMutationErrorMeta,
    mutationFn: async (accountId: string) => {
      const { supabase, userId } = await getSignedInUserId();
      const { error } = await supabase
        .from("accounts")
        .delete()
        .eq("id", accountId)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: accountKeys.all });
    },
  });
}

export function useInsertAccountAdjustmentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    meta: suppressGlobalMutationErrorMeta,
    mutationFn: async (input: {
      accountId: string;
      direction: "credit" | "debit";
      amount: number;
      note?: string;
    }) => {
      const { supabase, userId } = await getSignedInUserId();
      const { data: account, error: accountError } = await supabase
        .from("accounts")
        .select("id, name")
        .eq("id", input.accountId)
        .eq("user_id", userId)
        .single();
      if (accountError) throw accountError;

      const { error } = await supabase.from("account_adjustments").insert({
        user_id: userId,
        account_id: account.id,
        account_name_snapshot: account.name,
        direction: input.direction,
        amount: input.amount,
        note: input.note?.trim() ? input.note.trim() : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: accountKeys.all });
      void queryClient.invalidateQueries({
        queryKey: [...accountKeys.all, "adjustment-history"],
      });
    },
  });
}

export function useAccountAdjustmentsQuery() {
  return useQuery({
    queryKey: [...accountKeys.all, "adjustment-history"],
    queryFn: async (): Promise<AccountAdjustmentRow[]> => {
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase
        .from("account_adjustments")
        .select(
          "id, account_id, account_name_snapshot, direction, amount, note, effective_date, created_at",
        )
        .order("effective_date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AccountAdjustmentRow[];
    },
  });
}

export function useRecurringAccountAdjustmentsQuery() {
  return useQuery({
    queryKey: [...accountKeys.all, "recurring-adjustments"],
    queryFn: async (): Promise<RecurringAccountAdjustmentRow[]> => {
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase
        .from("recurring_account_adjustments")
        .select(
          "id, account_id, direction, amount, day_of_month, note, is_active, last_applied_on, created_at",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as RecurringAccountAdjustmentRow[];
    },
  });
}

export function useInsertRecurringAccountAdjustmentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    meta: suppressGlobalMutationErrorMeta,
    mutationFn: async (input: {
      accountId: string;
      direction: "credit" | "debit";
      amount: number;
      dayOfMonth: number;
      note?: string;
    }) => {
      const { supabase, userId } = await getSignedInUserId();
      const { error } = await supabase.from("recurring_account_adjustments").insert({
        user_id: userId,
        account_id: input.accountId,
        direction: input.direction,
        amount: input.amount,
        day_of_month: input.dayOfMonth,
        note: input.note?.trim() ? input.note.trim() : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [...accountKeys.all, "recurring-adjustments"],
      });
    },
  });
}

export function useToggleRecurringAccountAdjustmentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    meta: suppressGlobalMutationErrorMeta,
    mutationFn: async (input: { id: string; isActive: boolean }) => {
      const { supabase, userId } = await getSignedInUserId();
      const { error } = await supabase
        .from("recurring_account_adjustments")
        .update({ is_active: input.isActive })
        .eq("id", input.id)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [...accountKeys.all, "recurring-adjustments"],
      });
    },
  });
}

export function useDeleteRecurringAccountAdjustmentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    meta: suppressGlobalMutationErrorMeta,
    mutationFn: async (id: string) => {
      const { supabase, userId } = await getSignedInUserId();
      const { error } = await supabase
        .from("recurring_account_adjustments")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [...accountKeys.all, "recurring-adjustments"],
      });
    },
  });
}

export function useProcessDueRecurringAccountAdjustmentsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    meta: suppressGlobalMutationErrorMeta,
    mutationFn: async () => {
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase.rpc(
        "process_due_recurring_account_adjustments",
      );
      if (error) throw error;
      const first = (data as Array<{ processed_count: number }> | null)?.[0];
      return { processedCount: first?.processed_count ?? 0 };
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: accountKeys.all });
      await queryClient.invalidateQueries({
        queryKey: [...accountKeys.all, "adjustment-history"],
      });
      await queryClient.invalidateQueries({
        queryKey: [...accountKeys.all, "recurring-adjustments"],
      });
    },
  });
}

export function formatAccountBalance(value: string | number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(num(value));
}
