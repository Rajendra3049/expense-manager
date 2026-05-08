# Expense Manager

A full-stack personal finance web app built with Next.js and Supabase. It supports expense tracking, budgets, analytics, accounts, debts, EMI/investments, recurring entries, trips, and ledger-style history through phased database migrations.

## Documentation Map

Project documentation is organized under `docs/`:

- [`docs/README.md`](./docs/README.md) - Documentation index and reading paths
- [`docs/getting-started.md`](./docs/getting-started.md) - Local setup, env, first-run checklist
- [`docs/architecture.md`](./docs/architecture.md) - App architecture, data flow, auth boundaries
- [`docs/database-and-migrations.md`](./docs/database-and-migrations.md) - Schema and migration reference (Phase 1-11)
- [`docs/features.md`](./docs/features.md) - Feature-by-feature product and technical behavior
- [`docs/development-workflow.md`](./docs/development-workflow.md) - Coding standards, quality checks, release checklist
- [`docs/troubleshooting.md`](./docs/troubleshooting.md) - Common runtime/database/auth issues
- [`docs/templates/feature-doc-template.md`](./docs/templates/feature-doc-template.md) - Template for documenting new features

Legacy folder READMEs are kept in place for quick local context:

- [`app/README.md`](./app/README.md)
- [`components/README.md`](./components/README.md)
- [`features/README.md`](./features/README.md)
- [`lib/README.md`](./lib/README.md)
- [`supabase/README.md`](./supabase/README.md)

## Tech Stack

- Framework: Next.js 16 (App Router)
- Language: TypeScript
- Styling: Tailwind CSS v4
- Data layer: Supabase (PostgreSQL + Auth + RLS + SQL RPCs)
- Client cache/state: TanStack React Query v5
- Forms/validation: React Hook Form + Zod
- Charts: Recharts
- Notifications: Sonner

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Configure env:

```bash
cp .env.example .env.local
```

Set:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

(`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are also supported for compatibility.)

3. Apply migrations to Supabase (SQL Editor or CLI).
4. Start dev server:

```bash
npm run dev
```

5. Open `http://localhost:3000`.

For full setup details, see [`docs/getting-started.md`](./docs/getting-started.md).

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## Product Scope (Current)

Implemented phases:

- Phase 1: Categories + expenses with RLS
- Phase 2: Monthly budgets + category budgets
- Phase 3: Analytics RPCs
- Phase 4: Accounts + expense-account relation + balance triggers
- Phase 5: Debts (legacy give/take table)
- Phase 6: EMI and investments
- Phase 7: Trips + recurring expenses
- Phase 8: Tags and archive support
- Phase 9: Account adjustments and recurring account adjustments
- Phase 10: Debt khata accounts + entry history + balance recalculation
- Phase 11: Trip budget history + trip budget recalculation

See [`docs/database-and-migrations.md`](./docs/database-and-migrations.md) and [`docs/features.md`](./docs/features.md) for details.

## Security Model

- Row Level Security is enabled per user-scoped table.
- Auth checks are enforced in middleware plus server-side route guards.
- Redirect sanitization prevents open redirect via `safeNextPath`.
- Browser uses anon key by design; data protection relies on RLS policies.

## Deployment

Deploy on Vercel with the same environment variables as local. Ensure Supabase Auth URL configuration includes production site URL and redirect URLs.

Detailed steps: [`docs/getting-started.md`](./docs/getting-started.md).
