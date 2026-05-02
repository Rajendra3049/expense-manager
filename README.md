# Expense Manager

A responsive personal finance web app built with **Next.js (App Router)**, **Supabase** (PostgreSQL, Auth, Row Level Security), **Tailwind CSS**, and **TanStack Query**. The roadmap and phased delivery are described in [Implementation_plan.md](./Implementation_plan.md).

## Current status (Phase 0–1 MVP)

Completed so far:

- Next.js 16 + TypeScript + Tailwind v4 + ESLint
- Supabase browser and server clients (`@supabase/ssr`), env via `SUPABASE_URL` / `SUPABASE_ANON_KEY` (see [`.env.example`](./.env.example))
- Middleware session refresh with `getClaims()`, protected `/dashboard` routes, and server layout guard
- Email/password **login** and **signup** with Zod + React Hook Form, client auth context (`useAuth`), and sign-out
- **Phase 1:** SQL migrations for `categories` / `expenses` + RLS ([`supabase/migrations/`](./supabase/migrations/)); dashboard **expense form**, **list** (newest first), **delete** (with confirm), **monthly total**, and minimal **category** creation (see [`components/expenses/`](./components/expenses/README.md))

**Next:** Phase 1 polish (filters, empty UX) or Phase 2 budgets per [Implementation_plan.md](./Implementation_plan.md).

## Tech stack

| Area        | Choice                                      |
| ----------- | ------------------------------------------- |
| Framework   | Next.js 16 (App Router, Turbopack dev)      |
| Backend     | Supabase (no custom API server)             |
| Auth        | Supabase Auth (email/password)              |
| Styling     | Tailwind CSS v4                           |
| Data/cache  | TanStack React Query v5                     |
| Forms       | React Hook Form + Zod                      |
| HTTP helper | Axios (`lib/http.ts`) for non-Supabase calls |

## Requirements

- **Node.js** 20+ (LTS recommended)
- A **Supabase** project with **Email** provider enabled (Authentication → Providers → Email)

## Environment variables

Copy `.env.example` to `.env.local` and set:

- `SUPABASE_URL` — Project URL (Settings → API)
- `SUPABASE_ANON_KEY` — anon / public key (Settings → API)

`next.config.ts` maps these into the client bundle where needed. Never commit `.env.local`.

## Scripts

```bash
npm install    # dependencies
npm run dev    # http://localhost:3000
npm run build  # production build
npm run start  # run production server
npm run lint   # ESLint
```

## Repository layout

| Path | Purpose |
| ---- | ------- |
| [`app/`](./app/README.md) | Routes, layouts, global styles |
| [`components/`](./components/README.md) | UI: auth forms, layout chrome, React providers |
| [`lib/`](./lib/README.md) | Supabase clients, auth helpers, shared HTTP client |
| [`features/`](./features/README.md) | Reserved for feature-sliced modules (e.g. expenses) |
| [`public/`](./public/README.md) | Static assets served from `/` |
| `middleware.ts` | Auth cookie refresh + redirect rules for `/dashboard` |

## Routes (high level)

| Path | Access |
| ---- | ------ |
| `/` | Public landing |
| `/login`, `/signup` | Public; signed-in users are redirected to the dashboard (or safe `?next=` target) |
| `/dashboard` | Authenticated only (middleware + server layout) |

## Security notes

- **Anon key** in the browser is expected; protect data with **RLS** on every table (Phase 1+).
- Middleware and server checks use **`getClaims()`** / **`getUser()`** rather than trusting unverified session payloads from cookies alone for sensitive logic.
- **`safeNextPath()`** (`lib/auth/redirect.ts`) restricts post-login redirects to same-origin relative paths.

## Deployment (outline)

1. Push to GitHub (or your Git host).
2. Connect the repo to **Vercel** and set the same env vars as in `.env.local`.
3. In Supabase, set **Authentication → URL configuration** (Site URL and redirect URLs) to match your production domain.

## Learn more

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Auth + Next.js SSR](https://supabase.com/docs/guides/auth/server-side/nextjs)
