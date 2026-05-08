# Troubleshooting

## 1) Missing Table or Function Errors

Symptoms:

- `PGRST205` relation not found
- RPC function not found (analytics)
- Column missing (`tags`, `archived_at`, etc.)

Checks:

- Confirm all migrations up to latest phase are applied in order.
- Verify environment points to expected Supabase project.

Likely fixes:

- Apply missing migration files from `supabase/migrations/`.
- Re-run analytics migration if function definitions drift.

## 2) Login Works but Dashboard Redirects Back to Login

Checks:

- `SUPABASE_URL` and `SUPABASE_ANON_KEY` are correct.
- Cookies/session are not blocked by browser extensions or domain mismatch.
- Supabase Auth URL settings include current host.

Relevant files:

- `middleware.ts`
- `lib/supabase/middleware.ts`
- `app/dashboard/layout.tsx`

## 3) Data Not Visible After Insert

Common cause:

- RLS insert allowed but select filtered due to ownership mismatch.

Checks:

- Ensure mutation payload does not spoof `user_id`.
- Validate linked foreign entities belong to same user.
- Confirm policy `WITH CHECK` conditions pass.

## 4) Balance Drift in Accounts, Debt Khata, or Trip Budgets

Checks:

- Confirm trigger functions are present in DB.
- Validate entries did not create negative recalculated totals (which can fail constraints).
- Inspect history tables:
  - `account_adjustments`
  - `debt_account_entries`
  - `trip_budget_adjustments`

Fix strategy:

- Correct invalid entries and allow recalculation trigger to recompute totals.

## 5) Analytics Numbers Look Incorrect

Checks:

- Confirm date range parameters used by UI.
- Verify archived expenses are intentionally excluded.
- Ensure categories are correctly linked to expenses.

Relevant SQL:

- `expense_totals_by_category`
- `monthly_expense_trends`

## 6) Recurring Items Not Processing

Checks:

- `next_date` is due or overdue.
- Rule is active (`is_active = true`).
- Category/account references remain valid and owned by current user.

Relevant files:

- `components/recurring/recurring-due-processor.tsx`
- `features/recurring/use-recurring-data.ts`

## 7) Build/Lint Fails Locally but App Runs in Dev

Checks:

- Run `npm run lint` and inspect reported files.
- Run `npm run build` to catch stricter compile-time issues.
- Ensure local Node version meets requirement.

## Quick Recovery Procedure

1. Verify env vars.
2. Verify DB migration level.
3. Verify auth session behavior on protected route.
4. Verify RLS ownership conditions.
5. Verify trigger existence for ledger-based totals.
