# Features

This document captures implemented capabilities and the module locations responsible for them.

## 1) Authentication

User-facing behavior:

- Email/password signup and login
- Session-aware protected dashboard routes
- Safe post-login redirect support

Key implementation paths:

- `app/(auth)/login/page.tsx`
- `app/(auth)/signup/page.tsx`
- `components/auth/login-form.tsx`
- `components/auth/signup-form.tsx`
- `components/providers/auth-provider.tsx`
- `lib/auth/redirect.ts`
- `middleware.ts`
- `app/dashboard/layout.tsx`

## 2) Expense Tracking

User-facing behavior:

- Add expense with amount/category/date/note
- View expense list
- Delete expense with explicit confirmation
- Monthly total summary
- Category creation from expense flow
- Filtering by date/category
- Tag and archive support (advanced)

Key implementation paths:

- `components/expenses/expense-manager.tsx`
- `components/expenses/expense-form.tsx`
- `components/expenses/expense-list.tsx`
- `components/expenses/expense-filters.tsx`
- `components/expenses/monthly-total-card.tsx`
- `components/expenses/add-category-form.tsx`
- `features/expenses/use-expense-data.ts`
- `lib/expenses/*`

Data model:

- `categories`
- `expenses`

## 3) Budgets

User-facing behavior:

- Monthly budget cap
- Category-wise budget limits
- Warning states near/exceeding thresholds

Key implementation paths:

- `app/dashboard/budget/page.tsx`
- `components/budget/budget-manager.tsx`
- `components/budget/budget-editor-form.tsx`
- `components/budget/budget-status-panel.tsx`
- `features/budget/use-budget-data.ts`
- `lib/budget/warnings.ts`

Data model:

- `budgets`
- `category_budgets`

## 4) Analytics

User-facing behavior:

- Category breakdown charts
- Monthly spending trend charts

Key implementation paths:

- `app/dashboard/analytics/page.tsx`
- `components/analytics/analytics-dashboard.tsx`
- `components/analytics/category-pie-chart.tsx`
- `components/analytics/monthly-bar-chart.tsx`
- `features/analytics/use-analytics-data.ts`

Database functions:

- `expense_totals_by_category`
- `monthly_expense_trends`

## 5) Accounts

User-facing behavior:

- Create and manage money accounts
- Link expenses to accounts
- Account balance tracking and manual adjustments
- Recurring monthly account adjustments

Key implementation paths:

- `app/dashboard/accounts/page.tsx`
- `components/accounts/account-manager.tsx`
- `features/accounts/use-account-data.ts`

Data model:

- `accounts`
- `account_adjustments`
- `recurring_account_adjustments`

## 6) Debts and Debt Khata

User-facing behavior:

- Legacy give/take debt records
- Rich debt account ledger model with per-entry history and due dates

Key implementation paths:

- `app/dashboard/debts/page.tsx`
- `components/debts/debt-manager.tsx`
- `components/debts/debt-khata-manager.tsx`
- `features/debts/use-debt-data.ts`

Data model:

- `debts` (legacy model)
- `debt_accounts`
- `debt_account_entries`

## 7) EMI Tracking

User-facing behavior:

- Manage EMI obligations (total/monthly/remaining/due date)

Key implementation paths:

- `app/dashboard/emis/page.tsx`
- `components/emis/emi-manager.tsx`
- `features/emis/use-emi-data.ts`

Data model:

- `emis`

## 8) Investments

User-facing behavior:

- Record and track investments by type and value

Key implementation paths:

- `app/dashboard/investments/page.tsx`
- `components/investments/investment-manager.tsx`
- `features/investments/use-investment-data.ts`

Data model:

- `investments`

## 9) Recurring Expenses

User-facing behavior:

- Define recurring rules with frequency and next due date
- Process due recurring entries into expenses

Key implementation paths:

- `app/dashboard/recurring/page.tsx`
- `components/recurring/recurring-manager.tsx`
- `components/recurring/recurring-due-processor.tsx`
- `features/recurring/use-recurring-data.ts`

Data model:

- `recurring_expenses`

## 10) Trips and Trip Budgets

User-facing behavior:

- Create and manage trips
- Link expenses to trips
- Track trip budget via adjustment history ledger

Key implementation paths:

- `app/dashboard/trips/page.tsx`
- `components/trips/trip-manager.tsx`
- `features/trips/use-trip-data.ts`

Data model:

- `trips`
- `trip_budget_adjustments`

## 11) Shared UX/Infrastructure

Behavior:

- React Query provider setup
- Theme and app-level providers
- Toast notifications and confirm dialog workflows

Key implementation paths:

- `components/providers/query-provider.tsx`
- `components/providers/theme-provider.tsx`
- `components/providers/app-toaster.tsx`
- `components/providers/confirm-provider.tsx`

## Product Consistency Rules (Implementation Intent)

Project conventions to preserve:

- Always use in-app confirmations (not browser native confirm/prompt/alert flows)
- Show explicit mutation outcome feedback (success/error/info toast)
- Keep primary actions prominent on each screen
- Use pointer cursor for clickable UI entities
- Ensure money formatting remains INR + `en-IN`
- Enforce case-insensitive uniqueness for user-defined names
