/**
 * Supabase URL and anon key for browser + server clients.
 *
 * Prefer `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `.env.local`.
 * `NEXT_PUBLIC_*` names are still supported (see `next.config.ts`).
 */
export function getSupabaseUrl(): string {
  const url =
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (url) return url;
  throw new Error(
    "Missing SUPABASE_URL. Add SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL to your environment (see .env.example).",
  );
}

export function getSupabaseAnonKey(): string {
  const key =
    process.env.SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (key) return key;
  throw new Error(
    "Missing SUPABASE_ANON_KEY. Add SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY to your environment (see .env.example).",
  );
}
