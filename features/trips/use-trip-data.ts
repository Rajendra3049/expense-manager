"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { tripKeys } from "@/features/trips/query-keys";
import type { TripRow } from "@/features/trips/types";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function useTripsQuery() {
  return useQuery({
    queryKey: tripKeys.all,
    queryFn: async (): Promise<TripRow[]> => {
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase
        .from("trips")
        .select("id, name, start_date, end_date, note, created_at")
        .order("start_date", { ascending: false });

      if (error) throw error;
      return (data ?? []) as TripRow[];
    },
  });
}

export function useInsertTripMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      name: string;
      startDate: string;
      endDate: string | null;
      note: string;
    }) => {
      const supabase = createBrowserSupabaseClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("You must be signed in.");

      const { error } = await supabase.from("trips").insert({
        user_id: user.id,
        name: input.name,
        start_date: input.startDate,
        end_date: input.endDate,
        note: input.note,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: tripKeys.all });
    },
  });
}
