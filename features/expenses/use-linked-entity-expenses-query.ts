"use client";

import { useQuery } from "@tanstack/react-query";
import { emiKeys } from "@/features/emis/query-keys";
import { investmentKeys } from "@/features/investments/query-keys";
import { tripKeys } from "@/features/trips/query-keys";
import { suppressGlobalQueryErrorMeta } from "@/lib/react-query/query-meta";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export type EntityLinkedExpenseRow = {
  id: string;
  trip_id: string | null;
  emi_id: string | null;
  investment_id: string | null;
  amount: string | number;
  date: string;
  note: string;
  categories: { name: string } | { name: string }[] | null;
};

export function linkedExpenseCategoryLabel(
  row: Pick<EntityLinkedExpenseRow, "categories">,
): string {
  const c = row.categories;
  if (!c) return "—";
  const first = Array.isArray(c) ? c[0] : c;
  return first?.name?.trim() ? first.name : "—";
}

export function useTripLinkedExpensesQuery(tripIds: string[]) {
  const sortedIds = [...tripIds].sort().join(",");
  return useQuery({
    meta: suppressGlobalQueryErrorMeta,
    queryKey: [...tripKeys.all, "expense-links", sortedIds] as const,
    enabled: tripIds.length > 0,
    queryFn: async (): Promise<EntityLinkedExpenseRow[]> => {
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase
        .from("expenses")
        .select(
          "id, trip_id, emi_id, investment_id, amount, date, note, categories ( name )",
        )
        .in("trip_id", tripIds)
        .is("archived_at", null)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as EntityLinkedExpenseRow[];
    },
  });
}

export function useEmiLinkedExpensesQuery(emiIds: string[]) {
  const sortedIds = [...emiIds].sort().join(",");
  return useQuery({
    meta: suppressGlobalQueryErrorMeta,
    queryKey: [...emiKeys.all, "expense-links", sortedIds] as const,
    enabled: emiIds.length > 0,
    queryFn: async (): Promise<EntityLinkedExpenseRow[]> => {
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase
        .from("expenses")
        .select(
          "id, trip_id, emi_id, investment_id, amount, date, note, categories ( name )",
        )
        .in("emi_id", emiIds)
        .is("archived_at", null)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as EntityLinkedExpenseRow[];
    },
  });
}

export function useInvestmentLinkedExpensesQuery(investmentIds: string[]) {
  const sortedIds = [...investmentIds].sort().join(",");
  return useQuery({
    meta: suppressGlobalQueryErrorMeta,
    queryKey: [...investmentKeys.all, "expense-links", sortedIds] as const,
    enabled: investmentIds.length > 0,
    queryFn: async (): Promise<EntityLinkedExpenseRow[]> => {
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase
        .from("expenses")
        .select(
          "id, trip_id, emi_id, investment_id, amount, date, note, categories ( name )",
        )
        .in("investment_id", investmentIds)
        .is("archived_at", null)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as EntityLinkedExpenseRow[];
    },
  });
}
