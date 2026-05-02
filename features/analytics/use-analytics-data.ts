"use client";

import { useQuery } from "@tanstack/react-query";
import { analyticsKeys } from "@/features/analytics/query-keys";
import type { CategoryTotalRow, MonthlyTrendRow } from "@/features/analytics/types";
import { suppressGlobalQueryErrorMeta } from "@/lib/react-query/query-meta";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

function num(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number.parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export function useCategoryTotalsQuery(from: string, to: string) {
  return useQuery({
    meta: suppressGlobalQueryErrorMeta,
    queryKey: analyticsKeys.categoryTotals(from, to),
    queryFn: async (): Promise<CategoryTotalRow[]> => {
      const supabase = createBrowserSupabaseClient();
      const start = from <= to ? from : to;
      const end = from <= to ? to : from;
      const { data, error } = await supabase.rpc("expense_totals_by_category", {
        p_from: start,
        p_to: end,
      });

      if (error) throw error;
      const rows = (data ?? []) as Record<string, unknown>[];
      return rows.map((r) => ({
        category_id: String(r.category_id),
        category_name: String(r.category_name ?? "—"),
        total_amount: num(r.total_amount),
      }));
    },
    enabled: Boolean(from && to),
  });
}

export function useMonthlyTrendsQuery(months: number) {
  return useQuery({
    meta: suppressGlobalQueryErrorMeta,
    queryKey: analyticsKeys.monthlyTrends(months),
    queryFn: async (): Promise<MonthlyTrendRow[]> => {
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase.rpc("monthly_expense_trends", {
        p_months: months,
      });

      if (error) throw error;
      const rows = (data ?? []) as Record<string, unknown>[];
      return rows.map((r) => ({
        year: Number(r.year),
        month: Number(r.month),
        total_amount: num(r.total_amount),
      }));
    },
  });
}
