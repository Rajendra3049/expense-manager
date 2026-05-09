"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { investmentKeys } from "@/features/investments/query-keys";
import type { InvestmentRow } from "@/features/investments/types";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

function num(v: string | number): number {
  return typeof v === "number" ? v : Number.parseFloat(String(v));
}

export function useInvestmentsQuery() {
  return useQuery({
    queryKey: investmentKeys.all,
    queryFn: async (): Promise<InvestmentRow[]> => {
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase
        .from("investments")
        .select("id, name, type, current_value, note, created_at")
        .order("name", { ascending: true });

      if (error) throw error;
      return (data ?? []) as InvestmentRow[];
    },
  });
}

export function useInsertInvestmentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      name: string;
      type: InvestmentRow["type"];
      currentValue: number;
      note: string;
    }) => {
      const supabase = createBrowserSupabaseClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("You must be signed in.");

      const { error } = await supabase.from("investments").insert({
        user_id: user.id,
        name: input.name,
        type: input.type,
        current_value: input.currentValue,
        note: input.note,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: investmentKeys.all });
    },
  });
}

export function useDeleteInvestmentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.from("investments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: investmentKeys.all });
    },
  });
}

export function formatInvestmentMoney(value: string | number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(num(value));
}
