# `/dashboard` routes

Everything under this folder is served under the **`/dashboard`** URL prefix.

## `layout.tsx` (server)

- Creates a **server** Supabase client and checks **`getClaims()`**.
- If there is no valid authenticated user, **`redirect('/login?next=/dashboard')`** runs.
- Renders **`DashboardHeader`** (client) and a `<main>` wrapper for children.

This duplicates the intent of root **`middleware.ts`** (defense in depth): middleware runs on the Edge first; the layout enforces the same rule during RSC rendering.

## `page.tsx`

Renders **`ExpenseManager`** (client): add category, add expense (validated form), expense list with delete + confirm, and this month’s total. Data loads via TanStack Query + Supabase (`@/features/expenses/use-expense-data`).
