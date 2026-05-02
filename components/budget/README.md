# `components/budget/`

Phase 2 **budget** UI on `/dashboard/budget`.

| File | Role |
| ---- | ---- |
| `budget-manager.tsx` | Year/month picker, wires overview query + editor |
| `budget-status-panel.tsx` | Read-only monthly total + category progress, warning badges |
| `budget-editor-form.tsx` | Monthly total input, per-category caps, save (upsert + replace caps) |

Warning thresholds live in `@/lib/budget/warnings` (`budgetWarningLevel`).
