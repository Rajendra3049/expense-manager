# `lib/supabase/` — Supabase clients

Integrates **`@supabase/ssr`** with Next.js so sessions live in **HTTP-only cookies** (refreshed by middleware) instead of only `localStorage`.

| File | Runtime | Role |
| ---- | ------- | ---- |
| `env.ts` | Node / Edge / browser (inlined) | `getSupabaseUrl()`, `getSupabaseAnonKey()` — throws if misconfigured when called |
| `client.ts` | Browser | `createBrowserSupabaseClient()` for Client Components and forms |
| `server.ts` | Server (RSC, actions, route handlers) | `createServerSupabaseClient()` using `next/headers` `cookies()` |
| `middleware.ts` | Edge (via root `middleware.ts`) | `updateSession()` — `createServerClient` + `getClaims()`, cookie `setAll` with cache headers, dashboard redirects |

**Environment:** Prefer `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `.env.local`. `next.config.ts` exposes them to the client bundle where required.

**Important:** Do not use `getSession()` from cookies for authorization decisions on the server; this project uses **`getClaims()`** in middleware and **`getClaims()`** / **`getUser()`** in server layouts as appropriate.
