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

After applying, create a few **categories** for your user (via SQL or the app) before inserting **expenses** so `category_id` resolves and RLS `WITH CHECK` passes.
