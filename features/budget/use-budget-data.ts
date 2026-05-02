"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { budgetKeys } from "@/features/budget/query-keys";
import type { BudgetMonthOverview } from "@/features/budget/types";
import { localMonthBoundsFromParts } from "@/lib/expenses/dates";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

function num(v: string | number): number {
  return typeof v === "number" ? v : Number.parseFloat(v);
}

function aggregateSpending(
  rows: { amount: string | number; category_id: string }[],
): { total: number; byCategory: Record<string, number> } {
  const byCategory: Record<string, number> = {};
  let total = 0;
  for (const r of rows) {
    const a = num(r.amount);
    total += a;
    byCategory[r.category_id] = (byCategory[r.category_id] ?? 0) + a;
  }
  return { total, byCategory: byCategory };
}

export function useBudgetMonthOverviewQuery(year: number, month: number) {
  return useQuery({
    queryKey: budgetKeys.monthOverview(year, month),
    queryFn: async (): Promise<BudgetMonthOverview> => {
      const supabase = createBrowserSupabaseClient();
      const { start, end } = localMonthBoundsFromParts(year, month);

      const [budgetRes, expensesRes] = await Promise.all([
        supabase
          .from("budgets")
          .select(
            `
            id,
            user_id,
            year,
            month,
            total_limit,
            created_at,
            category_budgets (
              id,
              budget_id,
              category_id,
              limit_amount,
              categories ( id, name )
            )
          `,
          )
          .eq("year", year)
          .eq("month", month)
          .maybeSingle(),
        supabase
          .from("expenses")
          .select("amount, category_id")
          .is("archived_at", null)
          .gte("date", start)
          .lte("date", end),
      ]);

      if (budgetRes.error) throw budgetRes.error;
      if (expensesRes.error) throw expensesRes.error;

      const expenseRows = (expensesRes.data ?? []) as {
        amount: string | number;
        category_id: string;
      }[];
      const { total, byCategory } = aggregateSpending(expenseRows);

      const b = budgetRes.data as
        | (BudgetMonthOverview["budget"] & {
            category_budgets: BudgetMonthOverview["categoryBudgets"];
          })
        | null;

      if (!b) {
        return {
          year,
          month,
          budget: null,
          categoryBudgets: [],
          spentTotal: total,
          spentByCategory: byCategory,
        };
      }

      const { category_budgets: rawCaps, ...budget } = b;
      const categoryBudgets = (rawCaps ?? []) as BudgetMonthOverview["categoryBudgets"];

      return {
        year,
        month,
        budget: budget as BudgetMonthOverview["budget"],
        categoryBudgets,
        spentTotal: total,
        spentByCategory: byCategory,
      };
    },
  });
}

export function useSaveBudgetMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      year: number;
      month: number;
      totalLimit: number;
      categoryLimits: Record<string, number>;
    }) => {
      const supabase = createBrowserSupabaseClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("You must be signed in.");

      const { data: budgetRow, error: upsertError } = await supabase
        .from("budgets")
        .upsert(
          {
            user_id: user.id,
            year: input.year,
            month: input.month,
            total_limit: input.totalLimit,
          },
          { onConflict: "user_id,year,month" },
        )
        .select("id")
        .single();

      if (upsertError) throw upsertError;
      const budgetId = budgetRow.id as string;

      const { error: delError } = await supabase
        .from("category_budgets")
        .delete()
        .eq("budget_id", budgetId);
      if (delError) throw delError;

      const inserts = Object.entries(input.categoryLimits)
        .filter(([, cap]) => cap > 0)
        .map(([category_id, limit_amount]) => ({
          budget_id: budgetId,
          category_id,
          limit_amount,
        }));

      if (inserts.length > 0) {
        const { error: insError } = await supabase
          .from("category_budgets")
          .insert(inserts);
        if (insError) throw insError;
      }
    },
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: budgetKeys.all });
      await queryClient.invalidateQueries({
        queryKey: budgetKeys.monthOverview(variables.year, variables.month),
      });
    },
  });
}
