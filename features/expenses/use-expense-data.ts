"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { categoryKeys, expenseKeys } from "@/features/expenses/query-keys";
import { localMonthBounds, toLocalDateString } from "@/lib/expenses/dates";
import type { CategoryRow, ExpenseListRow } from "@/lib/expenses/types";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

function parseAmount(v: string | number): number {
  return typeof v === "number" ? v : Number.parseFloat(v);
}

export function useCategoriesQuery() {
  return useQuery({
    queryKey: categoryKeys.all,
    queryFn: async (): Promise<CategoryRow[]> => {
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, type")
        .order("name", { ascending: true });

      if (error) throw error;
      return (data ?? []) as CategoryRow[];
    },
  });
}

export function useExpensesListQuery() {
  return useQuery({
    queryKey: expenseKeys.list(),
    queryFn: async (): Promise<ExpenseListRow[]> => {
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase
        .from("expenses")
        .select(
          `
          id,
          amount,
          date,
          note,
          created_at,
          category_id,
          categories ( id, name )
        `,
        )
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as ExpenseListRow[];
    },
  });
}

export function useCurrentMonthExpenseTotalQuery() {
  const now = useMemo(() => new Date(), []);
  const year = now.getFullYear();
  const monthIndex = now.getMonth();
  const { start, end } = localMonthBounds(now);

  return useQuery({
    queryKey: expenseKeys.monthTotal(year, monthIndex),
    queryFn: async (): Promise<number> => {
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase
        .from("expenses")
        .select("amount")
        .gte("date", start)
        .lte("date", end);

      if (error) throw error;
      return (data ?? []).reduce(
        (sum, row: { amount: string | number }) =>
          sum + parseAmount(row.amount),
        0,
      );
    },
  });
}

export function useInsertExpenseMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      amount: number;
      categoryId: string;
      date: string;
      note: string;
    }) => {
      const supabase = createBrowserSupabaseClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("You must be signed in.");

      const { error } = await supabase.from("expenses").insert({
        user_id: user.id,
        amount: input.amount,
        category_id: input.categoryId,
        date: input.date,
        note: input.note,
      });

      if (error) throw error;
    },
    onSuccess: async () => {
      const d = new Date();
      await queryClient.invalidateQueries({ queryKey: expenseKeys.list() });
      await queryClient.invalidateQueries({
        queryKey: expenseKeys.monthTotal(d.getFullYear(), d.getMonth()),
      });
    },
  });
}

export function useInsertCategoryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { name: string; type: "expense" | "income" }) => {
      const supabase = createBrowserSupabaseClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("You must be signed in.");

      const { error } = await supabase.from("categories").insert({
        user_id: user.id,
        name: input.name,
        type: input.type,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: categoryKeys.all });
    },
  });
}

export function useDeleteExpenseMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      const d = new Date();
      await queryClient.invalidateQueries({ queryKey: expenseKeys.list() });
      await queryClient.invalidateQueries({
        queryKey: expenseKeys.monthTotal(d.getFullYear(), d.getMonth()),
      });
    },
  });
}

export { toLocalDateString };
