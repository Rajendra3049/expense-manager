"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { accountKeys } from "@/features/accounts/query-keys";
import type { AccountRow } from "@/features/accounts/types";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

function num(v: string | number): number {
  return typeof v === "number" ? v : Number.parseFloat(String(v));
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
    mutationFn: async (input: {
      name: string;
      type: "cash" | "bank" | "wallet";
      balance: number;
    }) => {
      const supabase = createBrowserSupabaseClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("You must be signed in.");

      const { error } = await supabase.from("accounts").insert({
        user_id: user.id,
        name: input.name,
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

export function formatAccountBalance(value: string | number): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(num(value));
}
