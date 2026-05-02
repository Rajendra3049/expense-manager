# `components/` — React UI

Reusable **presentational** and **client** pieces used across routes. Prefer colocating one-off route UI under `app/` when it is not reused.

## Structure

| Folder | Role |
| ------ | ---- |
| [`auth/`](./auth/) | Login and signup forms (client components, React Hook Form + Zod) |
| [`analytics/`](./analytics/) | Phase 3 charts on `/dashboard/analytics` (Recharts) |
| [`budget/`](./budget/) | Phase 2 monthly budget + category caps (`/dashboard/budget`) |
| [`expenses/`](./expenses/) | Phase 1 expense tracker UI on the dashboard |
| [`layout/`](./layout/) | Shell UI such as the dashboard top bar |
| [`providers/`](./providers/) | App-wide context: TanStack Query and Supabase-driven auth state |

## Providers

- **`query-provider.tsx`** — Instantiates a per-tree `QueryClient` and wraps children with `QueryClientProvider`. Use for server-state and mutations in Phase 1+.
- **`auth-provider.tsx`** — Subscribes to Supabase `onAuthStateChange`, hydrates session on mount, and exposes `useAuth()` (`user`, `session`, `isLoading`, `signOut`). The Supabase browser client is created **only in `useEffect`** so static prerender does not require env vars.

## Auth forms

Forms call `createBrowserSupabaseClient()` from `@/lib/supabase/client` on submit (not during SSR). Field validation schemas live under `lib/auth/schemas.ts`; API error copy is centralized in `lib/auth/errors.ts`.
