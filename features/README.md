# `features/` — Feature slices (reserved)

Use this folder for **vertical slices** that bundle UI, hooks, and types for a single domain (e.g. `features/expenses`, `features/budgets`) as the app grows beyond Phase 0.

**Guidelines**

- Prefer **`features/<name>/`** for domain logic that spans multiple routes, keeping `components/` for truly shared primitives and `app/` for routing and thin page shells.
- Co-locate feature-specific components, hooks, and constants here; keep Supabase table types and queries next to the feature when it clarifies ownership.
- Re-export or import from `@/features/...` only when it improves clarity; otherwise import the concrete file path.

Phase 1 (expense CRUD) is a natural first candidate to migrate into `features/expenses/`.

Detailed feature behavior and module ownership now live in [`docs/features.md`](../docs/features.md).
