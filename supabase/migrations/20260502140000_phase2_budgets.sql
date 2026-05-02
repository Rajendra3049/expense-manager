-- Phase 2 — Budgets + category limits
-- Tables: budgets, category_budgets (RLS via budgets.user_id)

-- ---------------------------------------------------------------------------
-- 14. Schema
-- ---------------------------------------------------------------------------

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  year int not null,
  month int not null,
  total_limit numeric(14, 2) not null default 0,
  created_at timestamptz not null default now(),
  constraint budgets_year_check check (year >= 2000 and year <= 2100),
  constraint budgets_month_check check (month >= 1 and month <= 12),
  constraint budgets_total_non_negative check (total_limit >= 0),
  constraint budgets_user_month_unique unique (user_id, year, month)
);

comment on table public.budgets is 'Per-user monthly total budget cap.';

create table public.category_budgets (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid not null references public.budgets (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  limit_amount numeric(14, 2) not null,
  created_at timestamptz not null default now(),
  constraint category_budgets_limit_non_negative check (limit_amount >= 0),
  constraint category_budgets_budget_category_unique unique (budget_id, category_id)
);

comment on table public.category_budgets is 'Optional per-category caps within a monthly budget row.';
comment on column public.category_budgets.limit_amount is 'Max spend for this category in the budget month.';

create index budgets_user_id_idx on public.budgets (user_id);
create index category_budgets_budget_id_idx on public.category_budgets (budget_id);
create index category_budgets_category_id_idx on public.category_budgets (category_id);

-- ---------------------------------------------------------------------------
-- 15–16. RLS (users only see their budgets; category rows tied to owned budget + category)
-- ---------------------------------------------------------------------------

alter table public.budgets enable row level security;
alter table public.category_budgets enable row level security;

create policy "budgets_select_own"
  on public.budgets
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "budgets_insert_own"
  on public.budgets
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "budgets_update_own"
  on public.budgets
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "budgets_delete_own"
  on public.budgets
  for delete
  to authenticated
  using (auth.uid() = user_id);

create policy "category_budgets_select_own"
  on public.category_budgets
  for select
  to authenticated
  using (
    exists (
      select 1 from public.budgets b
      where b.id = budget_id and b.user_id = auth.uid()
    )
  );

create policy "category_budgets_insert_own"
  on public.category_budgets
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.budgets b
      where b.id = budget_id and b.user_id = auth.uid()
    )
    and exists (
      select 1 from public.categories c
      where c.id = category_id and c.user_id = auth.uid()
    )
  );

create policy "category_budgets_update_own"
  on public.category_budgets
  for update
  to authenticated
  using (
    exists (
      select 1 from public.budgets b
      where b.id = budget_id and b.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.budgets b
      where b.id = budget_id and b.user_id = auth.uid()
    )
    and exists (
      select 1 from public.categories c
      where c.id = category_id and c.user_id = auth.uid()
    )
  );

create policy "category_budgets_delete_own"
  on public.category_budgets
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.budgets b
      where b.id = budget_id and b.user_id = auth.uid()
    )
  );

grant select, insert, update, delete on public.budgets to authenticated;
grant select, insert, update, delete on public.category_budgets to authenticated;
