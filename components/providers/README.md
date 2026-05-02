# `components/providers/`

Top-level **React context providers** composed in `app/layout.tsx`.

| File | Purpose |
| ---- | ------- |
| `query-provider.tsx` | TanStack Query `QueryClientProvider` with a stable client instance per mount |
| `auth-provider.tsx` | Supabase session state + `signOut`; must wrap any component that calls `useAuth()` |

**Order in root layout:** `QueryProvider` → `AuthProvider` → page tree (inside a flex column wrapper for full-height layouts).
