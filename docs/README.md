# Documentation Index

Use this folder as the source of truth for how this project works.

## Recommended Reading Paths

### New Contributor (first day)

1. [`../README.md`](../README.md)
2. [`getting-started.md`](./getting-started.md)
3. [`architecture.md`](./architecture.md)
4. [`features.md`](./features.md)
5. [`database-and-migrations.md`](./database-and-migrations.md)

### Feature Development

1. [`features.md`](./features.md)
2. [`database-and-migrations.md`](./database-and-migrations.md)
3. [`development-workflow.md`](./development-workflow.md)
4. [`templates/feature-doc-template.md`](./templates/feature-doc-template.md)

### Production Debugging

1. [`troubleshooting.md`](./troubleshooting.md)
2. [`architecture.md`](./architecture.md)
3. [`database-and-migrations.md`](./database-and-migrations.md)

## Document List

- [`getting-started.md`](./getting-started.md): installation, env vars, local run, deploy prep.
- [`architecture.md`](./architecture.md): routing, auth boundaries, state/data flow, module map.
- [`database-and-migrations.md`](./database-and-migrations.md): table-level and phase-level SQL changes, RLS, triggers.
- [`features.md`](./features.md): user-facing feature behavior and implementation notes.
- [`development-workflow.md`](./development-workflow.md): engineering workflow, quality checks, review checklist.
- [`troubleshooting.md`](./troubleshooting.md): actionable failure diagnosis.
- [`templates/feature-doc-template.md`](./templates/feature-doc-template.md): standardized feature documentation template.

## Documentation Rules

- Keep product behavior docs synchronized with schema and UI behavior.
- Prefer linking to relevant file paths instead of copying code.
- When a migration changes behavior, update both:
  - `database-and-migrations.md`
  - `features.md` sections impacted by the change
- For any substantial feature, add a doc section using the template in `templates/feature-doc-template.md`.
