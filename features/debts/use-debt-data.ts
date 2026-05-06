"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { debtKeys } from "@/features/debts/query-keys";
import type { DebtRow } from "@/features/debts/types";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

function num(v: string | number): number {
  return typeof v === "number" ? v : Number.parseFloat(String(v));
}

export function useDebtsQuery() {
  return useQuery({
    queryKey: debtKeys.all,
    queryFn: async (): Promise<DebtRow[]> => {
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase
        .from("debts")
        .select(
          "id, counterparty, type, status, amount, note, settled_at, created_at",
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as DebtRow[];
    },
  });
}

export function useInsertDebtMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      counterparty: string;
      type: "give" | "take";
      amount: number;
      note: string;
    }) => {
      const supabase = createBrowserSupabaseClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("You must be signed in.");

      const { error } = await supabase.from("debts").insert({
        user_id: user.id,
        counterparty: input.counterparty,
        type: input.type,
        status: "active",
        amount: input.amount,
        note: input.note,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: debtKeys.all });
    },
  });
}

export function useSettleDebtMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase
        .from("debts")
        .update({
          status: "settled",
          settled_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("status", "active")
        .select("id")
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        throw new Error("Debt not found or already settled.");
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: debtKeys.all });
    },
  });
}

export function formatDebtAmount(value: string | number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(num(value));
}
