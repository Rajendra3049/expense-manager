"use client";

import {
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { accountKeys } from "@/features/accounts/query-keys";
import { analyticsKeys } from "@/features/analytics/query-keys";
import { budgetKeys } from "@/features/budget/query-keys";
import { expenseKeys } from "@/features/expenses/query-keys";
import { recurringKeys } from "@/features/recurring/query-keys";
import type { RecurringExpenseRow } from "@/features/recurring/types";
import {
  advanceRecurringNextDate,
  toLocalDateString,
} from "@/lib/expenses/dates";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

const MAX_CATCH_UP_PER_RULE = 500;

export function useRecurringExpensesQuery() {
  return useQuery({
    queryKey: recurringKeys.all,
    queryFn: async (): Promise<RecurringExpenseRow[]> => {
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase
        .from("recurring_expenses")
        .select(
          "id, label, amount, category_id, account_id, frequency, next_date, note, is_active, created_at",
        )
        .order("next_date", { ascending: true });

      if (error) throw error;
      return (data ?? []) as RecurringExpenseRow[];
    },
  });
}

export function useInsertRecurringExpenseMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      label: string;
      amount: number;
      categoryId: string;
      accountId: string;
      frequency: RecurringExpenseRow["frequency"];
      nextDate: string;
      note: string;
    }) => {
      const supabase = createBrowserSupabaseClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("You must be signed in.");

      const { error } = await supabase.from("recurring_expenses").insert({
        user_id: user.id,
        label: input.label,
        amount: input.amount,
        category_id: input.categoryId,
        account_id: input.accountId.length > 0 ? input.accountId : null,
        frequency: input.frequency,
        next_date: input.nextDate,
        note: input.note,
        is_active: true,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: recurringKeys.all });
    },
  });
}

export function useToggleRecurringActiveMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { id: string; isActive: boolean }) => {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase
        .from("recurring_expenses")
        .update({ is_active: input.isActive })
        .eq("id", input.id);

      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: recurringKeys.all });
    },
  });
}

export function useDeleteRecurringExpenseMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase
        .from("recurring_expenses")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: recurringKeys.all });
    },
  });
}

async function invalidateAfterExpenseChange(queryClient: QueryClient) {
  const d = new Date();
  await queryClient.invalidateQueries({ queryKey: expenseKeys.all });
  await queryClient.invalidateQueries({
    queryKey: expenseKeys.monthTotal(d.getFullYear(), d.getMonth()),
  });
  await queryClient.invalidateQueries({ queryKey: budgetKeys.all });
  await queryClient.invalidateQueries({ queryKey: analyticsKeys.all });
  await queryClient.invalidateQueries({ queryKey: accountKeys.all });
}

export function useProcessDueRecurringMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const supabase = createBrowserSupabaseClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("You must be signed in.");

      const today = toLocalDateString(new Date());

      const { data: rules, error: listError } = await supabase
        .from("recurring_expenses")
        .select(
          "id, label, amount, category_id, account_id, frequency, next_date, note, is_active",
        )
        .eq("user_id", user.id)
        .eq("is_active", true);

      if (listError) throw listError;

      for (const rule of (rules ?? []) as RecurringExpenseRow[]) {
        let next = rule.next_date;
        let guard = 0;
        while (next <= today && guard < MAX_CATCH_UP_PER_RULE) {
          guard += 1;
          const baseNote = rule.note?.trim() ?? "";
          const expenseNote = baseNote
            ? `${baseNote} · ${rule.label}`
            : rule.label;
          const { error: insErr } = await supabase.from("expenses").insert({
            user_id: user.id,
            amount: rule.amount,
            category_id: rule.category_id,
            account_id: rule.account_id,
            date: next,
            note: expenseNote.slice(0, 2000),
          });
          if (insErr) throw insErr;

          const newNext = advanceRecurringNextDate(
            next,
            rule.frequency,
          );
          const { error: upErr } = await supabase
            .from("recurring_expenses")
            .update({ next_date: newNext })
            .eq("id", rule.id);
          if (upErr) throw upErr;
          next = newNext;
        }
      }
    },
    onSuccess: async () => {
      void queryClient.invalidateQueries({ queryKey: recurringKeys.all });
      await invalidateAfterExpenseChange(queryClient);
    },
  });
}
