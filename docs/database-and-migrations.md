# Database and Migrations

This document describes schema evolution and operational rules for `supabase/migrations/`.

## Core Principles

- Every user-owned row contains `user_id` and is protected by RLS.
- Migrations are append-only and should be applied in timestamp order.
- Cross-table inserts/updates must satisfy ownership checks (same authenticated user).
- Business constraints are enforced both in app logic and SQL constraints/policies where practical.

## Applying Migrations

From oldest to newest:

1. `20260502120000_phase1_expenses_categories.sql`
2. `20260502140000_phase2_budgets.sql`
3. `20260503120000_phase3_analytics_rpcs.sql`
4. `20260504100000_phase4_accounts.sql`
5. `20260505100000_phase5_debts.sql`
6. `20260506100000_phase6_emi_investments.sql`
7. `20260507100000_phase7_recurring_trips.sql`
8. `20260508100000_phase8_advanced.sql`
9. `20260508154000_phase9_account_adjustments.sql`
10. `20260508230000_phase10_debt_khata_accounts.sql`
11. `20260508234000_phase11_trip_budget_history.sql`

## Phase Reference

### Phase 1: Expenses and Categories

Adds:

- `public.categories`
- `public.expenses`
- indexes for user/category/date access patterns
- RLS policies for full CRUD scoped to owning user

Notable rules:

- `expenses.amount > 0`
- category type constrained to `expense|income`
- initial `expenses.account_id` reserved for future account linkage

### Phase 2: Budgets

Adds:

- `public.budgets` (monthly total caps)
- `public.category_budgets` (per-category limits)
- uniqueness on `(user_id, year, month)` for budgets
- RLS on budgets and budget-category linkage

### Phase 3: Analytics RPCs

Adds/replaces SQL functions:

- `public.expense_totals_by_category(p_from, p_to)`
- `public.monthly_expense_trends(p_months)`

Properties:

- `security invoker`
- `auth.uid()` user filtering
- designed for charting and dashboard summaries

### Phase 4: Accounts

Adds:

- `public.accounts` (`cash|bank|wallet`)
- foreign key from `expenses.account_id` to `accounts.id`
- account-scoped RLS
- stricter expense insert/update policy requiring account ownership when account is provided
- balance update trigger logic for linked expense events

### Phase 5: Legacy Debts Table

Adds:

- `public.debts` with `type: give|take` and `status: active|settled`
- full CRUD RLS by owner

### Phase 6: EMI and Investments

Adds:

- `public.emis`
- `public.investments`

Constraints enforce:

- positive monetary amounts
- valid investment type enum
- bounded `remaining_amount` for EMIs

### Phase 7: Trips and Recurring Expenses

Adds:

- `public.trips`
- `expenses.trip_id` optional FK
- `public.recurring_expenses`

Notes:

- recurring rows include frequency and `next_date`
- designed for client-side due processing
- migration remains compatible even if accounts table is absent at application time

### Phase 8: Advanced Expense Fields

Adds:

- `expenses.tags text[]`
- `expenses.archived_at timestamptz`

Also updates analytics RPCs to exclude archived rows.

### Phase 9: Account Adjustments and Recurring Adjustments

Adds:

- case-insensitive account-name uniqueness index per user
- `public.account_adjustments` ledger (credit/debit)
- trigger to apply adjustment amounts into account balances
- `public.recurring_account_adjustments` with monthly rules (`day_of_month` 1-28)

### Phase 10: Debt Khata Accounts

Adds:

- `public.debt_accounts` (entity-level debt accounts)
- `public.debt_account_entries` (entry history: borrow/payment)
- recalculation functions and triggers to keep account balance synchronized
- RLS and case-insensitive unique account names
- due-date support and settled-state semantics

This phase introduces a richer debt model compared with legacy `public.debts`.

### Phase 11: Trip Budget History

Adds:

- `trips.budget` and `trips.updated_at`
- `public.trip_budget_adjustments`
- triggers/functions to recalculate trip budget from adjustment history
- RLS policies for trip budget adjustments

## RLS Design Snapshot

Common policy approach:

- `SELECT`: `auth.uid() = user_id`
- `INSERT/UPDATE`: ownership checks with `WITH CHECK`
- relational integrity checks with `EXISTS` against parent/user-owned rows

Operational implication:

- clients must never send arbitrary `user_id`; use authenticated session context

## Trigger-Managed Ledgers

Tables with trigger-driven balance updates:

- `accounts` via `account_adjustments` (Phase 9)
- `debt_accounts` via `debt_account_entries` (Phase 10)
- `trips.budget` via `trip_budget_adjustments` (Phase 11)

## Migration Authoring Checklist

When adding a new migration:

1. Add schema with constraints first.
2. Enable RLS and define CRUD policies.
3. Add indexes aligned to read patterns.
4. Add trigger/function ownership checks where balance or derived values exist.
5. Add comments for table intent and key columns.
6. Update:
   - `README.md`
   - `docs/features.md`
   - this file (`docs/database-and-migrations.md`)

## Backward Compatibility Notes

- Some earlier docs mention only initial phases; current canonical status is Phase 1-11.
- Legacy `debts` and newer `debt_accounts` models both exist; code paths should remain explicit about which model is active.
