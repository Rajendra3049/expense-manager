"use client";

import type { InfiniteData, QueryKey } from "@tanstack/react-query";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useMemo } from "react";
import { accountKeys } from "@/features/accounts/query-keys";
import { debtKeys } from "@/features/debts/query-keys";
import { emiKeys } from "@/features/emis/query-keys";
import { investmentKeys } from "@/features/investments/query-keys";
import { tripKeys } from "@/features/trips/query-keys";
import { analyticsKeys } from "@/features/analytics/query-keys";
import { budgetKeys } from "@/features/budget/query-keys";
import { categoryKeys, expenseKeys } from "@/features/expenses/query-keys";
import {
  normalizeCategoryName,
  toCategoryDisplayName,
} from "@/lib/expenses/category-name";
import type { ExpenseListFilters } from "@/lib/expenses/filters";
import { localMonthBounds, toLocalDateString } from "@/lib/expenses/dates";
import type { CategoryRow, ExpenseListRow } from "@/lib/expenses/types";
import {
  suppressGlobalMutationErrorMeta,
  suppressGlobalQueryErrorMeta,
} from "@/lib/react-query/query-meta";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export const EXPENSE_PAGE_SIZE = 25;

function parseAmount(v: string | number): number {
  return typeof v === "number" ? v : Number.parseFloat(v);
}

function isInfiniteExpensePages(
  data: unknown,
): data is InfiniteData<ExpenseListRow[]> {
  return (
    typeof data === "object" &&
    data !== null &&
    "pages" in data &&
    Array.isArray((data as InfiniteData<ExpenseListRow[]>).pages)
  );
}

function expenseInfinitePredicate(query: { queryKey: QueryKey }): boolean {
  const k = query.queryKey;
  return Array.isArray(k) && k[0] === "expenses" && k[1] === "infinite";
}

function removeExpenseFromInfiniteCache(
  old: unknown,
  id: string,
): unknown {
  if (!isInfiniteExpensePages(old)) return old;
  return {
    ...old,
    pages: old.pages.map((p) => p.filter((r) => r.id !== id)),
  };
}

function setExpenseArchivedInCache(
  old: unknown,
  id: string,
  archived: boolean,
): unknown {
  if (!isInfiniteExpensePages(old)) return old;
  const ts = archived ? new Date().toISOString() : null;
  return {
    ...old,
    pages: old.pages.map((page) =>
      page.map((r) =>
        r.id === id ? { ...r, archived_at: ts } : r,
      ),
    ),
  };
}

function listArchiveScopeFromInfiniteKey(
  key: QueryKey,
): "active" | "archived" | "all" {
  const k = key as unknown[];
  if (k.length >= 7 && typeof k[6] === "string") {
    if (k[6] === "archived") return "archived";
    if (k[6] === "all") return "all";
  }
  return "active";
}

function patchInfiniteAfterArchiveToggle(
  old: unknown,
  id: string,
  archived: boolean,
  listScope: "active" | "archived" | "all",
): unknown {
  if (listScope === "all") {
    return setExpenseArchivedInCache(old, id, archived);
  }
  const shouldRemoveFromList =
    (listScope === "active" && archived) ||
    (listScope === "archived" && !archived);
  if (shouldRemoveFromList) {
    return removeExpenseFromInfiniteCache(old, id);
  }
  return setExpenseArchivedInCache(old, id, archived);
}

async function fetchExpensePage(
  filters: ExpenseListFilters | undefined,
  pageIndex: number,
): Promise<ExpenseListRow[]> {
  const supabase = createBrowserSupabaseClient();
  const from = pageIndex * EXPENSE_PAGE_SIZE;
  const to = from + EXPENSE_PAGE_SIZE - 1;

  let q = supabase
    .from("expenses")
    .select(
      `
          id,
          amount,
          date,
          note,
          created_at,
          category_id,
          account_id,
          trip_id,
          emi_id,
          investment_id,
          debt_account_id,
          emi_reduction_applied,
          tags,
          archived_at,
          categories ( id, name ),
          accounts ( id, name ),
          trips ( id, name ),
          emis ( id, name ),
          investments ( id, name ),
          debt_accounts ( id, name )
        `,
    );

  const archiveScope = filters?.archiveScope ?? "active";
  if (archiveScope === "active") {
    q = q.is("archived_at", null);
  } else if (archiveScope === "archived") {
    q = q.not("archived_at", "is", null);
  }
  // "all" — no archived_at filter

  if (filters?.from) {
    q = q.gte("date", filters.from);
  }
  if (filters?.to) {
    q = q.lte("date", filters.to);
  }
  if (filters?.categoryId) {
    q = q.eq("category_id", filters.categoryId);
  }

  const searchRaw = filters?.search?.trim() ?? "";
  if (searchRaw.length > 0) {
    const safe = searchRaw.replace(/[%_,]/g, " ").replace(/\s+/g, " ").trim();
    if (safe.length > 0) {
      const pattern = `%${safe}%`;
      const { data: catRows, error: catErr } = await supabase
        .from("categories")
        .select("id")
        .eq("type", "expense")
        .ilike("name", pattern);
      if (catErr) throw catErr;
      const catIds = (catRows ?? []).map((c: { id: string }) => c.id);
      const orParts: string[] = [`note.ilike.${pattern}`];
      if (catIds.length > 0) {
        orParts.push(`category_id.in.(${catIds.join(",")})`);
      }
      q = q.or(orParts.join(","));
    }
  }

  const { data, error } = await q
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, to);

  if (error) throw error;
  return (data ?? []) as ExpenseListRow[];
}

export function useCategoriesQuery() {
  return useQuery({
    queryKey: categoryKeys.all,
    queryFn: async (): Promise<CategoryRow[]> => {
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, type")
        .order("name", { ascending: true });

      if (error) throw error;
      return (data ?? []) as CategoryRow[];
    },
  });
}

export function useExpensesInfiniteQuery(filters?: ExpenseListFilters) {
  return useInfiniteQuery({
    meta: suppressGlobalQueryErrorMeta,
    queryKey: expenseKeys.infiniteList(filters),
    initialPageParam: 0,
    queryFn: async ({ pageParam }) =>
      fetchExpensePage(filters, pageParam as number),
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < EXPENSE_PAGE_SIZE) return undefined;
      return allPages.length;
    },
  });
}

export function useCurrentMonthExpenseTotalQuery() {
  const now = useMemo(() => new Date(), []);
  const year = now.getFullYear();
  const monthIndex = now.getMonth();
  const { start, end } = localMonthBounds(now);

  return useQuery({
    meta: suppressGlobalQueryErrorMeta,
    queryKey: expenseKeys.monthTotal(year, monthIndex),
    queryFn: async (): Promise<number> => {
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase
        .from("expenses")
        .select("amount")
        .is("archived_at", null)
        .gte("date", start)
        .lte("date", end);

      if (error) throw error;
      return (data ?? []).reduce(
        (sum, row: { amount: string | number }) =>
          sum + parseAmount(row.amount),
        0,
      );
    },
  });
}

export function useInsertExpenseMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      amount: number;
      categoryId: string;
      accountId: string;
      tripId: string;
      emiId: string;
      investmentId: string;
      debtAccountId: string;
      date: string;
      note: string;
      tags: string[];
    }) => {
      const supabase = createBrowserSupabaseClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("You must be signed in.");

      const { error } = await supabase.from("expenses").insert({
        user_id: user.id,
        amount: input.amount,
        category_id: input.categoryId,
        account_id: input.accountId,
        trip_id: input.tripId.length > 0 ? input.tripId : null,
        emi_id: input.emiId.length > 0 ? input.emiId : null,
        investment_id:
          input.investmentId.length > 0 ? input.investmentId : null,
        debt_account_id:
          input.debtAccountId.length > 0 ? input.debtAccountId : null,
        date: input.date,
        note: input.note,
        tags: input.tags.length > 0 ? input.tags : [],
      });

      if (error) throw error;
    },
    onSuccess: async () => {
      const d = new Date();
      await queryClient.invalidateQueries({ queryKey: expenseKeys.all });
      await queryClient.invalidateQueries({
        queryKey: expenseKeys.monthTotal(d.getFullYear(), d.getMonth()),
      });
      await queryClient.invalidateQueries({ queryKey: budgetKeys.all });
      await queryClient.invalidateQueries({ queryKey: analyticsKeys.all });
      await queryClient.invalidateQueries({ queryKey: accountKeys.all });
      await queryClient.invalidateQueries({ queryKey: tripKeys.all });
      await queryClient.invalidateQueries({ queryKey: emiKeys.all });
      await queryClient.invalidateQueries({
        queryKey: investmentKeys.all,
      });
      await queryClient.invalidateQueries({ queryKey: debtKeys.all });
    },
  });
}

export function useInsertCategoryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    meta: suppressGlobalMutationErrorMeta,
    mutationFn: async (input: { name: string; type: "expense" | "income" }) => {
      const supabase = createBrowserSupabaseClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("You must be signed in.");

      const normalizedInput = normalizeCategoryName(input.name);
      const displayName = toCategoryDisplayName(input.name);

      const { data: existing, error: existingError } = await supabase
        .from("categories")
        .select("name")
        .eq("user_id", user.id)
        .eq("type", input.type);
      if (existingError) throw existingError;

      const duplicateExists = (existing ?? []).some(
        (row: { name: string }) =>
          normalizeCategoryName(row.name) === normalizedInput,
      );
      if (duplicateExists) {
        throw new Error(
          "Category already exists. Use a different name.",
        );
      }

      const { error } = await supabase.from("categories").insert({
        user_id: user.id,
        name: displayName,
        type: input.type,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: categoryKeys.all });
    },
  });
}

export function useUpdateCategoryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    meta: suppressGlobalMutationErrorMeta,
    mutationFn: async (input: {
      id: string;
      name: string;
      type: "expense" | "income";
    }) => {
      const supabase = createBrowserSupabaseClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("You must be signed in.");

      const normalizedInput = normalizeCategoryName(input.name);
      const displayName = toCategoryDisplayName(input.name);

      const { data: existing, error: existingError } = await supabase
        .from("categories")
        .select("id, name")
        .eq("user_id", user.id)
        .eq("type", input.type);
      if (existingError) throw existingError;

      const duplicateExists = (existing ?? []).some(
        (row: { id: string; name: string }) =>
          row.id !== input.id &&
          normalizeCategoryName(row.name) === normalizedInput,
      );
      if (duplicateExists) {
        throw new Error(
          "Category already exists. Use a different name.",
        );
      }

      const { error } = await supabase
        .from("categories")
        .update({
          name: displayName,
          type: input.type,
        })
        .eq("id", input.id)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: categoryKeys.all });
      await queryClient.invalidateQueries({ queryKey: expenseKeys.all });
      await queryClient.invalidateQueries({ queryKey: budgetKeys.all });
      await queryClient.invalidateQueries({ queryKey: analyticsKeys.all });
    },
  });
}

export function useDeleteCategoryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    meta: suppressGlobalMutationErrorMeta,
    mutationFn: async (input: { id: string }) => {
      const supabase = createBrowserSupabaseClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("You must be signed in.");

      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", input.id)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: categoryKeys.all });
      await queryClient.invalidateQueries({ queryKey: expenseKeys.all });
      await queryClient.invalidateQueries({ queryKey: budgetKeys.all });
      await queryClient.invalidateQueries({ queryKey: analyticsKeys.all });
    },
  });
}

export function useSetExpenseArchivedMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { id: string; archived: boolean }) => {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase
        .from("expenses")
        .update({
          archived_at: input.archived ? new Date().toISOString() : null,
        })
        .eq("id", input.id);

      if (error) throw error;
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: expenseKeys.all });
      const previousEntries = queryClient.getQueriesData({
        predicate: expenseInfinitePredicate,
      });
      for (const [key, data] of previousEntries) {
        const scope = listArchiveScopeFromInfiniteKey(key);
        queryClient.setQueryData(
          key,
          patchInfiniteAfterArchiveToggle(
            data,
            input.id,
            input.archived,
            scope,
          ),
        );
      }
      return { previousEntries };
    },
    onError: (_err, _input, ctx) => {
      if (ctx?.previousEntries) {
        for (const [key, data] of ctx.previousEntries) {
          queryClient.setQueryData(key, data);
        }
      }
    },
    onSettled: async () => {
      const d = new Date();
      await queryClient.invalidateQueries({ queryKey: expenseKeys.all });
      await queryClient.invalidateQueries({
        queryKey: expenseKeys.monthTotal(d.getFullYear(), d.getMonth()),
      });
      await queryClient.invalidateQueries({ queryKey: budgetKeys.all });
      await queryClient.invalidateQueries({ queryKey: analyticsKeys.all });
      await queryClient.invalidateQueries({ queryKey: accountKeys.all });
      await queryClient.invalidateQueries({ queryKey: tripKeys.all });
      await queryClient.invalidateQueries({ queryKey: emiKeys.all });
      await queryClient.invalidateQueries({
        queryKey: investmentKeys.all,
      });
      await queryClient.invalidateQueries({ queryKey: debtKeys.all });
    },
  });
}

export function useDeleteExpenseMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: expenseKeys.all });
      const previousEntries = queryClient.getQueriesData({
        predicate: expenseInfinitePredicate,
      });
      for (const [key, data] of previousEntries) {
        queryClient.setQueryData(
          key,
          removeExpenseFromInfiniteCache(data, deletedId),
        );
      }
      return { previousEntries };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previousEntries) {
        for (const [key, data] of ctx.previousEntries) {
          queryClient.setQueryData(key, data);
        }
      }
    },
    onSettled: async () => {
      const d = new Date();
      await queryClient.invalidateQueries({ queryKey: expenseKeys.all });
      await queryClient.invalidateQueries({
        queryKey: expenseKeys.monthTotal(d.getFullYear(), d.getMonth()),
      });
      await queryClient.invalidateQueries({ queryKey: budgetKeys.all });
      await queryClient.invalidateQueries({ queryKey: analyticsKeys.all });
      await queryClient.invalidateQueries({ queryKey: accountKeys.all });
      await queryClient.invalidateQueries({ queryKey: tripKeys.all });
      await queryClient.invalidateQueries({ queryKey: emiKeys.all });
      await queryClient.invalidateQueries({
        queryKey: investmentKeys.all,
      });
      await queryClient.invalidateQueries({ queryKey: debtKeys.all });
    },
  });
}

export { toLocalDateString };
