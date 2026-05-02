import { getSupabaseRequestErrorMessage } from "@/lib/supabase/error-message";

/** User-facing error copy for UI, toasts, and error boundaries. */
export function getFriendlyErrorMessage(error: unknown): string {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return "You appear to be offline. Check your connection and try again.";
  }
  return getSupabaseRequestErrorMessage(error);
}
