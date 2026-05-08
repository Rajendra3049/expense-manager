# Feature Documentation Template

Use this template for every major feature or module-level enhancement.

---

## Feature Name

Short one-line description of user value.

## Status

- Stage: Planned | In Progress | Released
- Version/Phase: `<phase or release tag>`
- Owners: `<team or person>`

## User Story

As a `<user type>`, I want to `<goal>`, so that `<outcome>`.

## Scope

In scope:

- ...

Out of scope:

- ...

## UX Behavior

- Primary actions:
- Empty state:
- Loading state:
- Success feedback:
- Error feedback:
- Confirmation flow:

## Data Model

Tables/entities used:

- `<table_1>`
- `<table_2>`

Important fields and constraints:

- ...

## API / Query Surface

- Reads:
- Mutations:
- RPCs:
- Query keys:

## Access Control and Security

- RLS expectations:
- Ownership rules:
- Validation and sanitization:

## Business Rules

- Rule 1:
- Rule 2:

## Edge Cases

- ...

## Observability and Debugging

- Expected logs/toasts:
- Failure signatures:
- Quick checks:

## Test Plan

Manual:

- [ ] Create flow
- [ ] Update flow
- [ ] Delete/archive flow
- [ ] Unauthorized access check

Automated (if present):

- [ ] Unit
- [ ] Integration
- [ ] E2E

## Rollout Notes

- Migration required: yes/no
- Backfill required: yes/no
- Breaking change risk: low/medium/high

## File Map

- Routes:
- Components:
- Feature hooks:
- Lib utilities:
- Migrations:

## Follow-ups

- ...

---

Tip: Keep this file concise and link to deeper docs when needed.
