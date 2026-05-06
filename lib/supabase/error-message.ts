type PostgrestLike = {
  code?: string;
  message?: string;
};

/**
 * Human-readable copy for common Supabase/PostgREST client errors.
 */
export function getSupabaseRequestErrorMessage(error: unknown): string {
  let message = "Something went wrong.";
  if (error instanceof Error) {
    message = error.message;
  } else if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as PostgrestLike).message === "string"
  ) {
    message = (error as PostgrestLike).message as string;
  }

  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as PostgrestLike).code ?? "")
      : "";

  if (
    code === "PGRST205" ||
    message.includes("Could not find the table") ||
    message.includes("schema cache")
  ) {
    return "The database tables are missing. Open Supabase → SQL Editor and run migrations from `supabase/migrations/` in order (Phase 1 expenses/categories, then Phase 2 budgets if needed, Phase 4 accounts for the accounts feature). See `supabase/README.md`.";
  }

  if (
    message.includes("Could not find the function") ||
    message.includes("function public.expense_totals_by_category") ||
    message.includes("function public.monthly_expense_trends")
  ) {
    return "Analytics SQL functions are missing. Run supabase/migrations/20260503120000_phase3_analytics_rpcs.sql in Supabase → SQL Editor. See supabase/README.md.";
  }

  if (message.includes("column") && message.includes("does not exist")) {
    if (
      message.includes("expenses.tags") ||
      message.includes("expenses.archived_at")
    ) {
      return "Your database is missing expense columns this app needs (tags and/or archive). In Supabase → SQL Editor, run `supabase/migrations/20260508100000_phase8_advanced.sql`, then reload the app. See `supabase/README.md` for the full migration order.";
    }
    return "The database schema does not match this app. Run the SQL migrations in `supabase/migrations/` in numeric order so tables and columns match. See `supabase/README.md`.";
  }

  if (
    code === "23503" ||
    message.includes("violates foreign key constraint")
  ) {
    if (message.includes("expenses_category_id_fkey")) {
      return "This category is used by one or more expenses. Reassign or delete those expenses first.";
    }
    if (message.includes("recurring_expenses_category_id_fkey")) {
      return "This category is used by recurring rules. Update or delete those rules first.";
    }
    if (
      message.includes("category_budgets") &&
      message.includes("category_id")
    ) {
      return "This category is linked to a budget. Remove it from budget limits first.";
    }
    return "This record is in use and cannot be deleted yet.";
  }

  return message;
}
