# `components/expenses/`

Phase 1 **expense tracker** UI: categories, add expense, list (responsive table / cards), monthly total, and delete with confirmation.

| File | Role |
| ---- | ---- |
| `expense-manager.tsx` | Composes sections on `/dashboard` |
| `add-category-form.tsx` | Creates a category (required before expenses) |
| `expense-form.tsx` | Amount, category, date, note — validated with Zod (`@/lib/expenses/schemas`) |
| `expense-list.tsx` | Fetches via React Query; `window.confirm` before delete |
| `monthly-total-card.tsx` | Current calendar month sum (local device dates) |

Data hooks live under `@/features/expenses/use-expense-data`.
