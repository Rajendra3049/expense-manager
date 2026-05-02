-- Phase 1 — Expense Tracker (MVP)
-- Tables: categories, expenses (with optional account_id for a future accounts table)
-- Run via Supabase SQL Editor or: supabase db push (CLI)

-- ---------------------------------------------------------------------------
-- 7. Schema: categories & expenses
-- ---------------------------------------------------------------------------

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  type text not null,
  created_at timestamptz not null default now(),
  constraint categories_type_check check (type in ('expense', 'income')),
  constraint categories_name_nonempty check (char_length(trim(name)) > 0)
);

comment on table public.categories is 'User-defined expense/income categories; scoped by user_id.';

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  amount numeric(14, 2) not null,
  category_id uuid not null references public.categories (id) on delete restrict,
  account_id uuid,
  date date not null default ((now() at time zone 'utc'))::date,
  note text not null default '',
  created_at timestamptz not null default now(),
  constraint expenses_amount_positive check (amount > 0)
);

comment on table public.expenses is 'User expenses; account_id reserved for Phase 4 (no FK yet).';
comment on column public.expenses.account_id is 'Optional link to accounts table when implemented.';

create index expenses_user_id_idx on public.expenses (user_id);
create index expenses_category_id_idx on public.expenses (category_id);
create index expenses_user_date_idx on public.expenses (user_id, date desc);
create index categories_user_id_idx on public.categories (user_id);

-- ---------------------------------------------------------------------------
-- 8. Row Level Security (auth.uid() = user_id)
-- ---------------------------------------------------------------------------

alter table public.categories enable row level security;
alter table public.expenses enable row level security;

-- Categories: full CRUD only for own rows
create policy "categories_select_own"
  on public.categories
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "categories_insert_own"
  on public.categories
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "categories_update_own"
  on public.categories
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "categories_delete_own"
  on public.categories
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- Expenses: own rows only; category must belong to the same user
create policy "expenses_select_own"
  on public.expenses
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "expenses_insert_own"
  on public.expenses
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.categories c
      where c.id = category_id
        and c.user_id = auth.uid()
    )
  );

create policy "expenses_update_own"
  on public.expenses
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.categories c
      where c.id = category_id
        and c.user_id = auth.uid()
    )
  );

create policy "expenses_delete_own"
  on public.expenses
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- Allow the Supabase authenticated PostgREST role to use these tables (RLS still applies)
grant select, insert, update, delete on public.categories to authenticated;
grant select, insert, update, delete on public.expenses to authenticated;
