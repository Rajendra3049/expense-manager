"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { accountKeys } from "@/features/accounts/query-keys";
import { tripKeys } from "@/features/trips/query-keys";
import { analyticsKeys } from "@/features/analytics/query-keys";
import { budgetKeys } from "@/features/budget/query-keys";
import { categoryKeys, expenseKeys } from "@/features/expenses/query-keys";
import type { ExpenseListFilters } from "@/lib/expenses/filters";
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

export function useExpensesListQuery(filters?: ExpenseListFilters) {
  return useQuery({
    queryKey: expenseKeys.list(filters),
    queryFn: async (): Promise<ExpenseListRow[]> => {
      const supabase = createBrowserSupabaseClient();
      let q = supabase
        .from("expenses")
        .select(
          `
          id,
          amount,
          date,
          note,
          created_at,
          category_id,
          account_id,
          trip_id,
          tags,
          archived_at,
          categories ( id, name ),
          accounts ( id, name ),
          trips ( id, name )
        `,
        );

      const archiveScope = filters?.archiveScope ?? "active";
      if (archiveScope === "active") {
        q = q.is("archived_at", null);
      } else if (archiveScope === "archived") {
        q = q.not("archived_at", "is", null);
      }

      if (filters?.from) {
        q = q.gte("date", filters.from);
      }
      if (filters?.to) {
        q = q.lte("date", filters.to);
      }
      if (filters?.categoryId) {
        q = q.eq("category_id", filters.categoryId);
      }

      const searchRaw = filters?.search?.trim() ?? "";
      if (searchRaw.length > 0) {
        const safe = searchRaw.replace(/[%_,]/g, " ").replace(/\s+/g, " ").trim();
        if (safe.length > 0) {
          const pattern = `%${safe}%`;
          const { data: catRows, error: catErr } = await supabase
            .from("categories")
            .select("id")
            .eq("type", "expense")
            .ilike("name", pattern);
          if (catErr) throw catErr;
          const catIds = (catRows ?? []).map((c: { id: string }) => c.id);
          const orParts: string[] = [`note.ilike.${pattern}`];
          if (catIds.length > 0) {
            orParts.push(`category_id.in.(${catIds.join(",")})`);
          }
          q = q.or(orParts.join(","));
        }
      }

      const { data, error } = await q
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
        .is("archived_at", null)
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
      accountId: string;
      tripId: string;
      date: string;
      note: string;
      tags: string[];
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
        account_id:
          input.accountId.length > 0 ? input.accountId : null,
        trip_id: input.tripId.length > 0 ? input.tripId : null,
        date: input.date,
        note: input.note,
        tags: input.tags.length > 0 ? input.tags : [],
      });

      if (error) throw error;
    },
    onSuccess: async () => {
      const d = new Date();
      await queryClient.invalidateQueries({ queryKey: expenseKeys.all });
      await queryClient.invalidateQueries({
        queryKey: expenseKeys.monthTotal(d.getFullYear(), d.getMonth()),
      });
      await queryClient.invalidateQueries({ queryKey: budgetKeys.all });
      await queryClient.invalidateQueries({ queryKey: analyticsKeys.all });
      await queryClient.invalidateQueries({ queryKey: accountKeys.all });
      await queryClient.invalidateQueries({ queryKey: tripKeys.all });
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

export function useSetExpenseArchivedMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { id: string; archived: boolean }) => {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase
        .from("expenses")
        .update({
          archived_at: input.archived ? new Date().toISOString() : null,
        })
        .eq("id", input.id);

      if (error) throw error;
    },
    onSuccess: async () => {
      const d = new Date();
      await queryClient.invalidateQueries({ queryKey: expenseKeys.all });
      await queryClient.invalidateQueries({
        queryKey: expenseKeys.monthTotal(d.getFullYear(), d.getMonth()),
      });
      await queryClient.invalidateQueries({ queryKey: budgetKeys.all });
      await queryClient.invalidateQueries({ queryKey: analyticsKeys.all });
      await queryClient.invalidateQueries({ queryKey: accountKeys.all });
      await queryClient.invalidateQueries({ queryKey: tripKeys.all });
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
      await queryClient.invalidateQueries({ queryKey: expenseKeys.all });
      await queryClient.invalidateQueries({
        queryKey: expenseKeys.monthTotal(d.getFullYear(), d.getMonth()),
      });
      await queryClient.invalidateQueries({ queryKey: budgetKeys.all });
      await queryClient.invalidateQueries({ queryKey: analyticsKeys.all });
      await queryClient.invalidateQueries({ queryKey: accountKeys.all });
      await queryClient.invalidateQueries({ queryKey: tripKeys.all });
    },
  });
}

export { toLocalDateString };
