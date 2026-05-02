# `lib/auth/` — Auth helpers (non-UI)

Small modules shared by **auth forms** and **middleware** without importing React.

| File | Responsibility |
| ---- | ---------------- |
| `schemas.ts` | Zod `loginSchema` / `signupSchema` and exported TypeScript types |
| `errors.ts` | `formatAuthError()` — maps `AuthError` and generic `Error` messages to user-facing strings |
| `redirect.ts` | `safeNextPath()` — allows only same-origin relative paths for `?next=` after login (prevents open redirects) |

Supabase **sign-in / sign-up** calls live in `components/auth/*`; session **enforcement** lives in `middleware.ts` and `app/dashboard/layout.tsx`.
