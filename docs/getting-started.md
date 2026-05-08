# Getting Started

## Prerequisites

- Node.js 20+ (LTS recommended)
- npm (bundled with Node)
- Supabase project with Email auth provider enabled

## Installation

From project root:

```bash
npm install
```

## Environment Configuration

Copy:

```bash
cp .env.example .env.local
```

Set at minimum:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

Compatibility aliases are also accepted:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Environment parsing is centralized in `lib/supabase/env.ts`.

## Database Setup

Apply all SQL migrations in `supabase/migrations/` in chronological order.

Options:

1. Supabase SQL Editor (manual paste + run), or
2. Supabase CLI (`supabase db push`) if project link is configured

After applying migrations:

- Create an account through `/signup`
- Seed initial categories from UI (`Add Category`) before inserting expenses

## Run Locally

```bash
npm run dev
```

Open `http://localhost:3000`.

## Build and Lint

```bash
npm run lint
npm run build
npm run start
```

## First-Day Verification Checklist

- Can access `/login` and `/signup`
- Successful signup/login creates authenticated session
- Visiting `/dashboard` while signed out redirects to `/login`
- Can add and list expenses
- Can open budget and analytics pages without RPC/schema errors
- No migration-related missing-column errors in browser/console

## Deployment Notes (Vercel + Supabase)

1. Deploy repo to Vercel
2. Set env vars in Vercel project settings (`SUPABASE_URL`, `SUPABASE_ANON_KEY`)
3. Configure Supabase Auth URL settings:
   - Site URL = production domain
   - Redirect URLs include login/signup callbacks if used
4. Ensure production database includes all migrations up to latest phase

## Where To Go Next

- Architecture: [`architecture.md`](./architecture.md)
- Schema and migrations: [`database-and-migrations.md`](./database-and-migrations.md)
- Feature behavior: [`features.md`](./features.md)
