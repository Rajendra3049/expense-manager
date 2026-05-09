"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useConfirm } from "@/components/providers/confirm-provider";
import {
  linkedExpenseCategoryLabel,
  useTripLinkedExpensesQuery,
} from "@/features/expenses/use-linked-entity-expenses-query";
import {
  formatTripBudget,
  useDeleteTripMutation,
  useInsertTripBudgetAdjustmentMutation,
  useInsertTripMutation,
  useTripBudgetAdjustmentsQuery,
  useTripsQuery,
  useUpdateTripMutation,
} from "@/features/trips/use-trip-data";
import { toLocalDateString } from "@/lib/expenses/dates";
import {
  tripBudgetAdjustmentSchema,
  tripFormSchema,
  tripRenameSchema,
  type TripBudgetAdjustmentInput,
  type TripBudgetAdjustmentValues,
  type TripFormInput,
  type TripFormValues,
  type TripRenameInput,
  type TripRenameValues,
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

function TripCollapsibleSection(props: {
  id: string;
  title: string;
  description: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:p-5">
      <button
        type="button"
        className="flex w-full cursor-pointer items-center justify-between rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:focus-visible:ring-zinc-600"
        aria-expanded={props.open}
        aria-controls={props.id}
        onClick={props.onToggle}
      >
        <div>
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            {props.title}
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {props.description}
          </p>
        </div>
        <span
          className={`ml-4 text-lg leading-none text-zinc-500 transition-transform duration-300 dark:text-zinc-400 ${
            props.open ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        >
          ▾
        </span>
      </button>
      <div
        id={props.id}
        className={`grid overflow-hidden transition-all duration-300 ease-in-out ${
          props.open ? "mt-4 grid-rows-[1fr] opacity-100" : "mt-0 grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="min-h-0">{props.children}</div>
      </div>
    </section>
  );
}

export function TripManager() {
  const confirm = useConfirm();
  const { data: trips = [], isLoading, isError, error } = useTripsQuery();
  const { data: tripBudgetHistory = [] } = useTripBudgetAdjustmentsQuery();
  const insertTrip = useInsertTripMutation();
  const updateTrip = useUpdateTripMutation();
  const deleteTrip = useDeleteTripMutation();
  const insertTripBudgetAdjustment = useInsertTripBudgetAdjustmentMutation();
  const [editingTripId, setEditingTripId] = useState<string | null>(null);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [linkedExpensesOpen, setLinkedExpensesOpen] = useState(false);
  const today = useMemo(() => toLocalDateString(new Date()), []);

  const tripIds = useMemo(() => trips.map((t) => t.id), [trips]);
  const { data: tripLinkedExpenses = [], isLoading: tripLinkedLoading } =
    useTripLinkedExpensesQuery(tripIds);
  const tripNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of trips) m.set(t.id, t.name);
    return m;
  }, [trips]);

  const {
    register,
    handleSubmit,
    reset,
    clearErrors,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<TripFormInput, unknown, TripFormValues>({
    resolver: zodResolver(tripFormSchema),
    defaultValues: {
      name: "",
      startDate: today,
      endDate: "",
      note: "",
      budget: "0",
    },
  });
  const renameForm = useForm<TripRenameInput, unknown, TripRenameValues>({
    resolver: zodResolver(tripRenameSchema),
    defaultValues: { name: "" },
  });
  const budgetForm = useForm<
    TripBudgetAdjustmentInput,
    unknown,
    TripBudgetAdjustmentValues
  >({
    resolver: zodResolver(tripBudgetAdjustmentSchema),
    defaultValues: {
      tripId: "",
      direction: "credit",
      amount: "",
      effectiveDate: today,
      note: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    const normalizedName = values.name.trim().toLocaleLowerCase();
    const duplicateExists = trips.some(
      (trip) => trip.name.trim().toLocaleLowerCase() === normalizedName,
    );
    if (duplicateExists) {
      setError("name", {
        type: "manual",
        message: "Trip already exists (case-insensitive).",
      });
      return;
    }
    clearErrors("name");
    try {
      await insertTrip.mutateAsync({
        name: values.name,
        startDate: values.startDate,
        endDate:
          values.endDate && String(values.endDate).length > 0
            ? values.endDate
            : null,
        note: values.note,
        budget: values.budget,
      });
      toast.success(`Trip "${values.name}" created.`);
      reset({
        name: "",
        startDate: today,
        endDate: "",
        note: "",
        budget: "0",
      });
    } catch (mutationError) {
      toast.error(getSupabaseRequestErrorMessage(mutationError));
    }
  });
  const onSubmitBudget = budgetForm.handleSubmit(async (values) => {
    try {
      await insertTripBudgetAdjustment.mutateAsync({
        tripId: values.tripId,
        direction: values.direction,
        amount: values.amount,
        effectiveDate: values.effectiveDate,
        note: values.note,
      });
      toast.success("Trip budget updated.");
      budgetForm.reset({
        tripId: values.tripId,
        direction: values.direction,
        amount: "",
        effectiveDate: values.effectiveDate,
        note: "",
      });
    } catch (mutationError) {
      toast.error(getSupabaseRequestErrorMessage(mutationError));
    }
  });

  function formatDisplayDate(iso: string): string {
    const [y, m, d] = iso.split("-").map(Number);
    if (!y || !m || !d) return iso;
    return new Date(y, m - 1, d).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  async function startEditingTrip(trip: { id: string; name: string }) {
    setEditingTripId(trip.id);
    renameForm.reset({ name: trip.name });
  }

  async function saveTripName(tripId: string) {
    const valid = await renameForm.trigger("name");
    if (!valid) return;
    const name = renameForm.getValues("name");
    const normalizedName = name.trim().toLocaleLowerCase();
    const duplicateExists = trips.some(
      (trip) => trip.id !== tripId && trip.name.trim().toLocaleLowerCase() === normalizedName,
    );
    if (duplicateExists) {
      renameForm.setError("name", {
        type: "manual",
        message: "Trip already exists (case-insensitive).",
      });
      return;
    }
    try {
      await updateTrip.mutateAsync({ id: tripId, name });
      toast.success("Trip name updated.");
      setEditingTripId(null);
    } catch (mutationError) {
      toast.error(getSupabaseRequestErrorMessage(mutationError));
    }
  }

  async function removeTrip(trip: { id: string; name: string }) {
    const ok = await confirm({
      title: `Delete trip "${trip.name}"?`,
      description:
        "Linked expenses remain, but their trip link will be removed automatically.",
      confirmText: "Delete",
      cancelText: "Cancel",
      intent: "danger",
    });
    if (!ok) return;
    try {
      await deleteTrip.mutateAsync(trip.id);
      toast.success(`Deleted "${trip.name}".`);
    } catch (mutationError) {
      toast.error(getSupabaseRequestErrorMessage(mutationError));
    }
  }

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Trips
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Plan trips with dates and budgets, then track every budget change with
          a complete history.
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
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Add the trip details first. When you save an expense, choose Trip
          under &quot;Also link to&quot; on the Expenses page to attach it here.
        </p>
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
              placeholder="e.g. Singapore Work Trip 2026"
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
              htmlFor="trip-budget"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Opening budget
            </label>
            <input
              id="trip-budget"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              {...register("budget")}
            />
            {errors.budget ? (
              <p className="mt-1 text-xs text-red-600" role="alert">
                {errors.budget.message}
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
              className="w-full cursor-pointer rounded-lg bg-zinc-900 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-[140px] dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
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
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Edit name, delete trip, and manage budget from sections below.
          </p>
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
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-medium uppercase tracking-wide text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
                <tr>
                  <th className="px-4 py-3 sm:px-5">Name</th>
                  <th className="px-4 py-3 sm:px-5">Dates</th>
                  <th className="px-4 py-3 text-right sm:px-5">Budget</th>
                  <th className="px-4 py-3 sm:px-5">Note</th>
                  <th className="px-4 py-3 text-right sm:px-5">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {trips.map((trip) => (
                  <tr key={trip.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-900/30">
                    <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-50 sm:px-5">
                      {editingTripId === trip.id ? (
                        <>
                          <input
                            type="text"
                            className="w-full rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                            {...renameForm.register("name")}
                          />
                          <p className="mt-1 min-h-4 text-xs text-red-600" role="alert">
                            {renameForm.formState.errors.name?.message}
                          </p>
                        </>
                      ) : (
                        trip.name
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-zinc-700 dark:text-zinc-300 sm:px-5">
                      {formatRange(trip.start_date, trip.end_date)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-zinc-900 dark:text-zinc-50 sm:px-5">
                      {formatTripBudget(trip.budget)}
                    </td>
                    <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300 sm:px-5">
                      {trip.note?.trim() ? trip.note : "-"}
                    </td>
                    <td className="space-x-2 whitespace-nowrap px-4 py-3 text-right sm:px-5">
                      {editingTripId === trip.id ? (
                        <>
                          <button
                            type="button"
                            onClick={() => void saveTripName(trip.id)}
                            disabled={updateTrip.isPending}
                            className="cursor-pointer rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingTripId(null)}
                            className="cursor-pointer rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => void startEditingTrip(trip)}
                            className="cursor-pointer rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                          >
                            Edit name
                          </button>
                          <button
                            type="button"
                            onClick={() => void removeTrip(trip)}
                            className="cursor-pointer rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <TripCollapsibleSection
        id="trip-linked-expenses-panel"
        title="Expenses linked to trips"
        description="Spending recorded on the Expenses page with a trip link appears here."
        open={linkedExpensesOpen}
        onToggle={() => setLinkedExpensesOpen((v) => !v)}
      >
        {tripIds.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Create a trip first.
          </p>
        ) : tripLinkedLoading ? (
          <p className="text-sm text-zinc-500">Loading…</p>
        ) : tripLinkedExpenses.length === 0 ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            No linked expenses yet. On the Expenses page, use &quot;Also link
            to&quot; and select Trip, then pick this trip.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-medium uppercase tracking-wide text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
                <tr>
                  <th className="px-4 py-3 sm:px-5">Trip</th>
                  <th className="px-4 py-3 sm:px-5">Date</th>
                  <th className="px-4 py-3 sm:px-5">Category</th>
                  <th className="px-4 py-3 text-right sm:px-5">Amount</th>
                  <th className="px-4 py-3 sm:px-5">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {tripLinkedExpenses.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-zinc-50/80 dark:hover:bg-zinc-900/30"
                  >
                    <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-50 sm:px-5">
                      {row.trip_id ? tripNameById.get(row.trip_id) ?? "—" : "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-zinc-700 dark:text-zinc-300 sm:px-5">
                      {formatDisplayDate(row.date)}
                    </td>
                    <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300 sm:px-5">
                      {linkedExpenseCategoryLabel(row)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-zinc-900 dark:text-zinc-50 sm:px-5">
                      {formatTripBudget(row.amount)}
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-3 text-zinc-600 dark:text-zinc-400 sm:px-5">
                      {row.note?.trim() ? row.note : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </TripCollapsibleSection>

      <TripCollapsibleSection
        id="trip-budget-adjustment-panel"
        title="Add or reduce trip budget"
        description="Use credit to add budget and debit to reduce budget."
        open={budgetOpen}
        onToggle={() => setBudgetOpen((v) => !v)}
      >
        <form onSubmit={onSubmitBudget} className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="trip-budget-trip"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Trip
            </label>
            <select
              id="trip-budget-trip"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              {...budgetForm.register("tripId")}
            >
              <option value="">Select trip</option>
              {trips.map((trip) => (
                <option key={trip.id} value={trip.id}>
                  {trip.name}
                </option>
              ))}
            </select>
            <p className="mt-1 min-h-4 text-xs text-red-600" role="alert">
              {budgetForm.formState.errors.tripId?.message}
            </p>
          </div>
          <div>
            <label
              htmlFor="trip-budget-direction"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Type
            </label>
            <select
              id="trip-budget-direction"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              {...budgetForm.register("direction")}
            >
              <option value="credit">Add budget (+)</option>
              <option value="debit">Reduce budget (-)</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="trip-budget-amount"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Amount
            </label>
            <input
              id="trip-budget-amount"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0.01"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              {...budgetForm.register("amount")}
            />
            <p className="mt-1 min-h-4 text-xs text-red-600" role="alert">
              {budgetForm.formState.errors.amount?.message}
            </p>
          </div>
          <div>
            <label
              htmlFor="trip-budget-date"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Date
            </label>
            <input
              id="trip-budget-date"
              type="date"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              {...budgetForm.register("effectiveDate")}
            />
          </div>
          <div className="sm:col-span-2">
            <label
              htmlFor="trip-budget-note"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Note (optional)
            </label>
            <input
              id="trip-budget-note"
              type="text"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              {...budgetForm.register("note")}
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={
                budgetForm.formState.isSubmitting ||
                insertTripBudgetAdjustment.isPending
              }
              className="cursor-pointer rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {insertTripBudgetAdjustment.isPending ? "Saving…" : "Apply budget change"}
            </button>
          </div>
        </form>
      </TripCollapsibleSection>

      <TripCollapsibleSection
        id="trip-budget-history-panel"
        title="Trip budget history"
        description="Full history of budget add/reduce actions per trip."
        open={historyOpen}
        onToggle={() => setHistoryOpen((v) => !v)}
      >
        {tripBudgetHistory.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-200 p-8 text-center dark:border-zinc-700">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              No trip budget history yet.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-medium uppercase tracking-wide text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
                <tr>
                  <th className="px-4 py-3 sm:px-5">Date</th>
                  <th className="px-4 py-3 sm:px-5">Trip</th>
                  <th className="px-4 py-3 sm:px-5">Type</th>
                  <th className="px-4 py-3 text-right sm:px-5">Amount</th>
                  <th className="px-4 py-3 sm:px-5">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {tripBudgetHistory.map((entry) => (
                  <tr key={entry.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-900/30">
                    <td className="whitespace-nowrap px-4 py-3 text-zinc-700 dark:text-zinc-300 sm:px-5">
                      {formatDisplayDate(entry.effective_date)}
                    </td>
                    <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-50 sm:px-5">
                      {entry.trip_name_snapshot}
                    </td>
                    <td className="px-4 py-3 sm:px-5">
                      <span
                        className={
                          entry.direction === "credit"
                            ? "rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200"
                            : "rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950/60 dark:text-amber-200"
                        }
                      >
                        {entry.direction === "credit" ? "Added" : "Reduced"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-zinc-900 dark:text-zinc-50 sm:px-5">
                      {formatTripBudget(entry.amount)}
                    </td>
                    <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300 sm:px-5">
                      {entry.note?.trim() ? entry.note : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </TripCollapsibleSection>
    </div>
  );
}
