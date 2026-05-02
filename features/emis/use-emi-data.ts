"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { emiKeys } from "@/features/emis/query-keys";
import type { EmiRow } from "@/features/emis/types";
import { toLocalDateString } from "@/lib/expenses/dates";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

function num(v: string | number): number {
  return typeof v === "number" ? v : Number.parseFloat(String(v));
}

/** Next calendar month for a `YYYY-MM-DD` string (local date semantics). */
function addOneMonthYmd(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return ymd;
  const dt = new Date(y, m - 1 + 1, d);
  return toLocalDateString(dt);
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

export function useRecordEmiPaymentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (row: EmiRow) => {
      const supabase = createBrowserSupabaseClient();
      const remaining = num(row.remaining_amount);
      const monthly = num(row.monthly_amount);
      const paid = Math.min(monthly, remaining);
      const newRemaining = Math.max(0, remaining - paid);
      const newDue =
        newRemaining === 0 ? row.due_date : addOneMonthYmd(row.due_date);

      const { error } = await supabase
        .from("emis")
        .update({
          remaining_amount: newRemaining,
          due_date: newDue,
        })
        .eq("id", row.id);

      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: emiKeys.all });
    },
  });
}

export function formatEmiMoney(value: string | number): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(num(value));
}
