# `features/expenses/`

Client-side **data layer** for Phase 1 expenses: TanStack Query keys, hooks that call Supabase with the **logged-in user** (`getUser()` + `user_id` on insert; RLS enforces ownership).

| File | Role |
| ---- | ---- |
| `query-keys.ts` | Stable `queryKey` values for invalidation |
| `use-expense-data.ts` | `useCategoriesQuery`, `useExpensesListQuery`, `useCurrentMonthExpenseTotalQuery`, insert/delete mutations |

Inserts use `supabase.from('expenses').insert({ user_id, amount, category_id, date, note })` so rows link to the authenticated user; policies require `auth.uid() = user_id` and a matching category.
