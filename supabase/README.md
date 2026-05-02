# Supabase (database migrations)

SQL migrations in **`migrations/`** define tables, indexes, and **RLS** for the Expense Manager backend.

## Apply a migration

**Option A — Dashboard (quick)**  
Supabase project → **SQL Editor** → paste the file contents → **Run**.

**Option B — Supabase CLI**  
From the project root (with CLI linked to your project):

```bash
supabase db push
```

## Migrations

| Migration | Contents |
| --------- | -------- |
| `migrations/20260502120000_phase1_expenses_categories.sql` | `categories`, `expenses`, indexes, RLS |
| `migrations/20260502140000_phase2_budgets.sql` | `budgets`, `category_budgets`, indexes, RLS |
| `migrations/20260503120000_phase3_analytics_rpcs.sql` | RPCs `expense_totals_by_category`, `monthly_expense_trends` |
| `migrations/20260504100000_phase4_accounts.sql` | `accounts`, `expenses.account_id` FK, RLS, balance triggers |
| `migrations/20260505100000_phase5_debts.sql` | `debts` (give/take, active/settled), RLS |

After applying, create a few **categories** for your user (via SQL or the app) before inserting **expenses** so `category_id` resolves and RLS `WITH CHECK` passes.

## Troubleshooting

- **`PGRST205` / missing `categories`:** Run Phase 1 migration (see project `README` or run `20260502120000_phase1_expenses_categories.sql`).
- **Analytics / “Could not find the function”:** Run **`20260503120000_phase3_analytics_rpcs.sql`** so the RPCs exist and `authenticated` can execute them.
