# Development Workflow

## Branch and Change Strategy

- Keep changes scoped to one feature/fix at a time.
- Prefer additive migrations; avoid destructive DB changes without explicit data migration plan.
- Update docs in same PR whenever behavior/schema changes.

## Coding Conventions

- Use TypeScript types from feature modules (`features/*/types.ts`) where available.
- Keep API/query logic in feature hooks, not page components.
- Keep route files thin; delegate logic to `components/*` and `features/*`.
- Keep reusable utilities in `lib/*`.

## UX and Product Guardrails

- Use in-app confirm modals for destructive actions.
- Surface success/error toast outcomes for user-triggered mutations.
- Preserve layout stability in form validation states.
- Keep naming uniqueness checks case-insensitive for user-entered entities.
- Use INR (`en-IN`) formatting for money display.

## Database Change Workflow

When introducing schema changes:

1. Create timestamped migration in `supabase/migrations/`.
2. Add SQL constraints and indexes.
3. Enable and verify RLS policies.
4. Add/adjust trigger functions if derived balances or denormalized totals are affected.
5. Test as authenticated non-owner to validate policy isolation.
6. Update docs:
   - `docs/database-and-migrations.md`
   - `docs/features.md`
   - root `README.md` if user-facing scope changed

## Testing and Validation Checklist

Before marking work complete:

- `npm run lint` passes
- `npm run build` passes for release-bound changes
- Auth flows:
  - protected route redirect while signed out
  - normal access while signed in
- Mutation feedback:
  - success toast appears on success
  - error toast appears on failure
- Data isolation:
  - RLS prevents cross-user read/write

## Pull Request Checklist

- Clear title and summary (what changed and why)
- Screenshots/video for UI changes
- Migration file listed explicitly if DB changes exist
- Backward compatibility note (if needed)
- Docs updated

## Incident Triage Checklist

If production behavior is wrong:

1. Verify migration level in target environment.
2. Confirm environment variables and Supabase project linkage.
3. Check RLS policy behavior with authenticated role.
4. Inspect trigger side effects for balance/history tables.
5. Validate frontend query key invalidation after mutations.
