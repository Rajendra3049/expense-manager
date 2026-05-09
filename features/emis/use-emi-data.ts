"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { emiKeys } from "@/features/emis/query-keys";
import type { EmiRow } from "@/features/emis/types";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

function num(v: string | number): number {
  return typeof v === "number" ? v : Number.parseFloat(String(v));
}

export function useEmisQuery() {
  return useQuery({
    queryKey: emiKeys.all,
    queryFn: async (): Promise<EmiRow[]> => {
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase
        .from("emis")
        .select(
          "id, name, total_amount, monthly_amount, remaining_amount, due_date, note, created_at",
        )
        .order("due_date", { ascending: true });

      if (error) throw error;
      return (data ?? []) as EmiRow[];
    },
  });
}

export function useInsertEmiMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      name: string;
      totalAmount: number;
      monthlyAmount: number;
      dueDate: string;
      note: string;
    }) => {
      const supabase = createBrowserSupabaseClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("You must be signed in.");

      const { error } = await supabase.from("emis").insert({
        user_id: user.id,
        name: input.name,
        total_amount: input.totalAmount,
        monthly_amount: input.monthlyAmount,
        remaining_amount: input.totalAmount,
        due_date: input.dueDate,
        note: input.note,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: emiKeys.all });
    },
  });
}

export function useDeleteEmiMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.from("emis").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: emiKeys.all });
    },
  });
}

export function formatEmiMoney(value: string | number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(num(value));
}
