# `features/budget/`

TanStack Query hooks for **budgets** and **category_budgets**.

| File | Role |
| ---- | ---- |
| `query-keys.ts` | `budgetKeys` for cache invalidation |
| `types.ts` | `BudgetRow`, `CategoryBudgetRow`, `BudgetMonthOverview` |
| `use-budget-data.ts` | `useBudgetMonthOverviewQuery` (budget + caps + month spend aggregation), `useSaveBudgetMutation` (upsert `budgets`, replace `category_budgets` rows) |

Expense mutations invalidate `budgetKeys` so totals stay fresh after adds/deletes.
