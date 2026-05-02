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
| `migrations/20260506100000_phase6_emi_investments.sql` | `emis`, `investments`, RLS |
| `migrations/20260507100000_phase7_recurring_trips.sql` | `trips`, `expenses.trip_id`, `recurring_expenses`, RLS |
| `migrations/20260508100000_phase8_advanced.sql` | `expenses.tags`, `expenses.archived_at`; analytics RPCs exclude archived |

After applying, create a few **categories** for your user (via SQL or the app) before inserting **expenses** so `category_id` resolves and RLS `WITH CHECK` passes.

**Phase 7** adds an optional FK from `recurring_expenses.account_id` to **`accounts`** only if that table already exists (e.g. after Phase 4). Expense RLS includes the account ownership check only when `accounts` exists; otherwise apply Phase 4 later if you want that enforcement at the database.

## Troubleshooting

- **`PGRST205` / missing `categories`:** Run Phase 1 migration (see project `README` or run `20260502120000_phase1_expenses_categories.sql`).
- **Analytics / “Could not find the function”:** Run **`20260503120000_phase3_analytics_rpcs.sql`** so the RPCs exist and `authenticated` can execute them.
