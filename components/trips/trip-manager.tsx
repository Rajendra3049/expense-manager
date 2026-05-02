"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { useInsertTripMutation, useTripsQuery } from "@/features/trips/use-trip-data";
import { toLocalDateString } from "@/lib/expenses/dates";
import {
  tripFormSchema,
  type TripFormInput,
  type TripFormValues,
} from "@/lib/trips/schemas";
import { getSupabaseRequestErrorMessage } from "@/lib/supabase/error-message";

function formatRange(start: string, end: string | null): string {
  const fmt = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    if (!y || !m || !d) return iso;
    return new Date(y, m - 1, d).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };
  if (!end) return fmt(start);
  return `${fmt(start)} – ${fmt(end)}`;
}

export function TripManager() {
  const { data: trips = [], isLoading, isError, error } = useTripsQuery();
  const insertTrip = useInsertTripMutation();
  const today = useMemo(() => toLocalDateString(new Date()), []);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TripFormInput, unknown, TripFormValues>({
    resolver: zodResolver(tripFormSchema),
    defaultValues: {
      name: "",
      startDate: today,
      endDate: "",
      note: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    await insertTrip.mutateAsync({
      name: values.name,
      startDate: values.startDate,
      endDate:
        values.endDate && String(values.endDate).length > 0
          ? values.endDate
          : null,
      note: values.note,
    });
    reset({
      name: "",
      startDate: today,
      endDate: "",
      note: "",
    });
  });

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Trips
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Create a trip, then tag expenses with it from the Expenses page so
          spending is grouped by trip.
        </p>
      </header>

      <section
        className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:p-5"
        aria-labelledby="new-trip-heading"
      >
        <h2
          id="new-trip-heading"
          className="text-base font-semibold text-zinc-900 dark:text-zinc-50"
        >
          New trip
        </h2>
        <form onSubmit={onSubmit} className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label
              htmlFor="trip-name"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Name
            </label>
            <input
              id="trip-name"
              type="text"
              placeholder="e.g. Japan spring 2026"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              {...register("name")}
            />
            {errors.name ? (
              <p className="mt-1 text-xs text-red-600" role="alert">
                {errors.name.message}
              </p>
            ) : null}
          </div>

          <div className="sm:col-span-1">
            <label
              htmlFor="trip-start"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Start date
            </label>
            <input
              id="trip-start"
              type="date"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              {...register("startDate")}
            />
            {errors.startDate ? (
              <p className="mt-1 text-xs text-red-600" role="alert">
                {errors.startDate.message}
              </p>
            ) : null}
          </div>

          <div className="sm:col-span-1">
            <label
              htmlFor="trip-end"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              End date{" "}
              <span className="font-normal text-zinc-500">(optional)</span>
            </label>
            <input
              id="trip-end"
              type="date"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              {...register("endDate")}
            />
            {errors.endDate ? (
              <p className="mt-1 text-xs text-red-600" role="alert">
                {errors.endDate.message}
              </p>
            ) : null}
          </div>

          <div className="sm:col-span-2">
            <label
              htmlFor="trip-note"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Note{" "}
              <span className="font-normal text-zinc-500">(optional)</span>
            </label>
            <textarea
              id="trip-note"
              rows={2}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              {...register("note")}
            />
            {errors.note ? (
              <p className="mt-1 text-xs text-red-600" role="alert">
                {errors.note.message}
              </p>
            ) : null}
          </div>

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={isSubmitting || insertTrip.isPending}
              className="w-full rounded-lg bg-zinc-900 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-[140px] dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {insertTrip.isPending ? "Saving…" : "Create trip"}
            </button>
          </div>
        </form>

        {insertTrip.isError ? (
          <p className="mt-3 text-sm text-red-600" role="alert">
            {getSupabaseRequestErrorMessage(insertTrip.error)}
          </p>
        ) : null}
      </section>

      <section
        className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
        aria-labelledby="trips-list-heading"
      >
        <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800 sm:px-5">
          <h2
            id="trips-list-heading"
            className="text-base font-semibold text-zinc-900 dark:text-zinc-50"
          >
            Your trips
          </h2>
        </div>

        {isLoading ? (
          <div className="p-6">
            <p className="text-sm text-zinc-500">Loading…</p>
          </div>
        ) : isError ? (
          <div
            className="border-t border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950/30"
            role="alert"
          >
            <p className="text-sm text-red-800 dark:text-red-200">
              {getSupabaseRequestErrorMessage(error)}
            </p>
          </div>
        ) : trips.length === 0 ? (
          <div className="border-t border-dashed border-zinc-200 p-8 text-center dark:border-zinc-700">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              No trips yet. Create one above, then link expenses on the Expenses
              page.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {trips.map((t) => (
              <li key={t.id} className="px-4 py-4 sm:px-5">
                <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                  {t.name}
                </p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {formatRange(t.start_date, t.end_date)}
                </p>
                {t.note ? (
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    {t.note}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
