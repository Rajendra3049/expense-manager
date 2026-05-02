# `features/analytics/`

TanStack Query hooks calling **Supabase RPCs** (defined in `supabase/migrations/20260503120000_phase3_analytics_rpcs.sql`).

| RPC | Hook | Purpose |
| --- | ---- | ------- |
| `expense_totals_by_category(p_from, p_to)` | `useCategoryTotalsQuery` | Group expenses by category, sum `amount` |
| `monthly_expense_trends(p_months)` | `useMonthlyTrendsQuery` | One row per calendar month with total spend (last *N* months, max 60) |

Expense insert/delete invalidates `analyticsKeys` so charts refresh.
