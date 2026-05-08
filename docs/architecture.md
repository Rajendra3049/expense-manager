# Architecture

## High-Level Overview

This app uses a serverless full-stack pattern:

- UI and route handling in Next.js App Router (`app/`)
- Data/auth/storage in Supabase (PostgreSQL + Auth + RLS)
- No separate custom backend service

Request flow:

1. Browser renders Next.js route
2. Middleware refreshes and validates session
3. Route-level server guard validates claims for protected pages
4. Client components use Supabase client and React Query hooks
5. Supabase enforces data access via RLS

## Directory Ownership

- `app/`: route segments, layouts, page-level composition
- `components/`: reusable UI and domain managers
- `features/`: feature-specific hooks/types/query keys
- `lib/`: shared utilities, schema validation, Supabase helpers
- `supabase/migrations/`: SQL schema, RLS policies, functions, triggers

## Route Structure

Public:

- `/` landing
- `/login`
- `/signup`

Protected:

- `/dashboard`
- `/dashboard/accounts`
- `/dashboard/analytics`
- `/dashboard/budget`
- `/dashboard/debts`
- `/dashboard/emis`
- `/dashboard/investments`
- `/dashboard/recurring`
- `/dashboard/trips`

## Authentication and Access Control

### Middleware Guard

- `middleware.ts` delegates to `lib/supabase/middleware.ts`
- Global matcher excludes static/image assets
- Middleware refreshes auth session and applies redirect logic

### Server Guard

- `app/dashboard/layout.tsx` calls `supabase.auth.getClaims()`
- If no authenticated subject claim, redirects to `/login?next=/dashboard`

### Client Auth State

- `components/providers/auth-provider.tsx` holds session/user context
- Subscribes to auth changes and exposes `useAuth()`

### Redirect Safety

- `lib/auth/redirect.ts` (`safeNextPath`) only permits same-origin relative paths

## Data Layer Pattern

- Feature hooks in `features/*/use-*-data.ts` encapsulate queries/mutations
- Query keys centralized per feature in `features/*/query-keys.ts`
- Validation schemas live in `lib/*/schemas.ts`
- Supabase clients:
  - Browser: `lib/supabase/client.ts`
  - Server: `lib/supabase/server.ts`

## State and UX Patterns

- TanStack React Query handles remote state/caching
- Forms use React Hook Form + Zod validators
- Toast notifications via Sonner (`components/providers/app-toaster.tsx`)
- Confirmation dialogs use custom provider (`components/providers/confirm-provider.tsx`) instead of native browser prompts

## Database Security Architecture

- Tables are user-scoped with `user_id`
- RLS enabled table-by-table in migrations
- Policies enforce `auth.uid() = user_id` and ownership checks for linked entities
- Analytics RPCs run with `security invoker` and filter by `auth.uid()`

## Money and Localization

Product convention uses Indian locale and INR formatting (`en-IN`, currency `INR`) for financial display consistency.

## Evolution Strategy

- Schema grows through phase-based SQL migrations
- New capabilities are added incrementally (Phase 1 to Phase 11)
- Existing behavior is preserved with additive migrations and guarded constraints
