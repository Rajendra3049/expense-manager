# `components/auth/`

Client-only **authentication forms** for the Expense Manager.

| File | Responsibility |
| ---- | ---------------- |
| `login-form.tsx` | Email + password sign-in; reads optional `?next=` (validated via `safeNextPath`); shows Supabase errors inline |
| `signup-form.tsx` | Registration with confirm password; handles immediate session vs email-confirmation flows |

Both use **react-hook-form** with **Zod** resolvers (`@/lib/auth/schemas`). Navigation after success uses `next/navigation` (`router.refresh()` then `router.push`).
