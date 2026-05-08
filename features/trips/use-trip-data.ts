"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { tripKeys } from "@/features/trips/query-keys";
import type { TripBudgetAdjustmentRow, TripRow } from "@/features/trips/types";
import { suppressGlobalMutationErrorMeta } from "@/lib/react-query/query-meta";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

function num(v: string | number): number {
  return typeof v === "number" ? v : Number.parseFloat(String(v));
}

function normalizeTripName(name: string): string {
  return name.trim().toLocaleLowerCase();
}

async function getSignedInUserId() {
  const supabase = createBrowserSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("You must be signed in.");
  return { supabase, userId: user.id };
}

async function assertNoDuplicateTripName(params: {
  userId: string;
  name: string;
  excludeId?: string;
}) {
  const supabase = createBrowserSupabaseClient();
  const normalizedInput = normalizeTripName(params.name);
  const { data: existing, error } = await supabase
    .from("trips")
    .select("id, name")
    .eq("user_id", params.userId);
  if (error) throw error;
  const duplicateExists = (existing ?? []).some((row: { id: string; name: string }) => {
    if (params.excludeId && row.id === params.excludeId) return false;
    return normalizeTripName(row.name) === normalizedInput;
  });
  if (duplicateExists) throw new Error("Trip already exists. Use a different name.");
}

export function useTripsQuery() {
  return useQuery({
    queryKey: tripKeys.all,
    queryFn: async (): Promise<TripRow[]> => {
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase
        .from("trips")
        .select("id, name, start_date, end_date, note, budget, created_at, updated_at")
        .order("start_date", { ascending: false });

      if (error) throw error;
      return (data ?? []) as TripRow[];
    },
  });
}

export function useInsertTripMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    meta: suppressGlobalMutationErrorMeta,
    mutationFn: async (input: {
      name: string;
      startDate: string;
      endDate: string | null;
      note: string;
      budget: number;
    }) => {
      const { supabase, userId } = await getSignedInUserId();
      await assertNoDuplicateTripName({ userId, name: input.name });

      const { data: insertedTrip, error } = await supabase
        .from("trips")
        .insert({
        user_id: userId,
        name: input.name,
        start_date: input.startDate,
        end_date: input.endDate,
        note: input.note,
      })
        .select("id, name")
        .single();

      if (error) throw error;

      if (input.budget > 0) {
        const { error: budgetError } = await supabase.from("trip_budget_adjustments").insert({
          user_id: userId,
          trip_id: insertedTrip.id,
          trip_name_snapshot: insertedTrip.name,
          direction: "credit",
          amount: input.budget,
          note: "Opening budget",
          effective_date: input.startDate,
        });
        if (budgetError) throw budgetError;
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: tripKeys.all });
      await queryClient.invalidateQueries({ queryKey: [...tripKeys.all, "budget-adjustments"] });
    },
  });
}

export function useUpdateTripMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    meta: suppressGlobalMutationErrorMeta,
    mutationFn: async (input: {
      id: string;
      name: string;
    }) => {
      const { supabase, userId } = await getSignedInUserId();
      await assertNoDuplicateTripName({
        userId,
        name: input.name,
        excludeId: input.id,
      });

      const { error } = await supabase
        .from("trips")
        .update({ name: input.name.trim() })
        .eq("id", input.id)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: tripKeys.all });
      await queryClient.invalidateQueries({ queryKey: [...tripKeys.all, "budget-adjustments"] });
    },
  });
}

export function useDeleteTripMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    meta: suppressGlobalMutationErrorMeta,
    mutationFn: async (tripId: string) => {
      const { supabase, userId } = await getSignedInUserId();
      const { error } = await supabase
        .from("trips")
        .delete()
        .eq("id", tripId)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: tripKeys.all });
      await queryClient.invalidateQueries({ queryKey: [...tripKeys.all, "budget-adjustments"] });
    },
  });
}

export function useTripBudgetAdjustmentsQuery() {
  return useQuery({
    queryKey: [...tripKeys.all, "budget-adjustments"],
    queryFn: async (): Promise<TripBudgetAdjustmentRow[]> => {
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase
        .from("trip_budget_adjustments")
        .select(
          "id, trip_id, trip_name_snapshot, direction, amount, note, effective_date, created_at",
        )
        .order("effective_date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as TripBudgetAdjustmentRow[];
    },
  });
}

export function useInsertTripBudgetAdjustmentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    meta: suppressGlobalMutationErrorMeta,
    mutationFn: async (input: {
      tripId: string;
      direction: "credit" | "debit";
      amount: number;
      effectiveDate: string;
      note?: string;
    }) => {
      const { supabase, userId } = await getSignedInUserId();
      const { data: trip, error: tripError } = await supabase
        .from("trips")
        .select("id, name, budget")
        .eq("id", input.tripId)
        .eq("user_id", userId)
        .single();
      if (tripError) throw tripError;

      if (input.direction === "debit" && num(trip.budget) < input.amount) {
        throw new Error("Cannot reduce more than remaining trip budget.");
      }

      const { error } = await supabase.from("trip_budget_adjustments").insert({
        user_id: userId,
        trip_id: trip.id,
        trip_name_snapshot: trip.name,
        direction: input.direction,
        amount: input.amount,
        effective_date: input.effectiveDate,
        note: input.note?.trim() ? input.note.trim() : null,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: tripKeys.all });
      await queryClient.invalidateQueries({ queryKey: [...tripKeys.all, "budget-adjustments"] });
    },
  });
}

export function formatTripBudget(value: string | number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(num(value));
}
