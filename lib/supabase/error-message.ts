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

  return message;
}
