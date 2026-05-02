# `/dashboard` routes

Everything under this folder is served under the **`/dashboard`** URL prefix.

## `layout.tsx` (server)

- Creates a **server** Supabase client and checks **`getClaims()`**.
- If there is no valid authenticated user, **`redirect('/login?next=/dashboard')`** runs.
- Renders **`DashboardHeader`** (client) and a `<main>` wrapper for children.

This duplicates the intent of root **`middleware.ts`** (defense in depth): middleware runs on the Edge first; the layout enforces the same rule during RSC rendering.

## `page.tsx` (server)

Placeholder dashboard home. Phase 1 will add expense list and forms here or in nested segments (e.g. `app/dashboard/expenses/page.tsx`).
