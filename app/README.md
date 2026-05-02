# `app/` — Next.js App Router

This directory holds **routes**, **nested layouts**, and **global styles** for the Expense Manager UI.

## Conventions

- **`layout.tsx`** — Shared chrome, fonts, and providers are wired in the root [`layout.tsx`](./layout.tsx) (React Query + auth provider wrapper).
- **`page.tsx`** — Default export is the route segment’s UI.
- **Route groups** — Parentheses in folder names **do not** appear in the URL. `(auth)` groups login and signup under a shared auth shell without changing paths (`/login`, `/signup` remain correct).

## Route map

| File / folder | URL | Notes |
| ------------- | --- | ----- |
| `page.tsx` | `/` | Marketing-style landing with links to auth and dashboard |
| `(auth)/layout.tsx` | — | Centers auth pages on the viewport |
| `(auth)/login/page.tsx` | `/login` | Wrapped in `Suspense` for `useSearchParams` |
| `(auth)/signup/page.tsx` | `/signup` | Email/password registration |
| `dashboard/layout.tsx` | `/dashboard/*` | Server-side auth guard + dashboard header |
| `dashboard/page.tsx` | `/dashboard` | Expense tracker (forms, filters, list, monthly total) |
| `dashboard/budget/page.tsx` | `/dashboard/budget` | Monthly budget + category limits + warnings |
| `dashboard/analytics/page.tsx` | `/dashboard/analytics` | Charts: category pie + monthly bar (Supabase RPCs) |
| `globals.css` | — | Tailwind v4 import and design tokens |

## Adding routes

- **Public pages:** add a folder + `page.tsx` under `app/`.
- **Authenticated app:** prefer nested routes under `app/dashboard/…` so existing middleware (`/dashboard` prefix) and layout guard keep working without changes.
