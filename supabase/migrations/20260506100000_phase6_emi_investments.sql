-- Phase 6 — EMI tracking + investments

-- ---------------------------------------------------------------------------
-- 28. Schema: emis
-- ---------------------------------------------------------------------------

create table public.emis (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  total_amount numeric(14, 2) not null,
  monthly_amount numeric(14, 2) not null,
  remaining_amount numeric(14, 2) not null,
  due_date date not null,
  note text not null default '',
  created_at timestamptz not null default now(),
  constraint emis_name_nonempty check (char_length(trim(name)) > 0),
  constraint emis_total_positive check (total_amount > 0),
  constraint emis_monthly_positive check (monthly_amount > 0),
  constraint emis_remaining_bounds check (
    remaining_amount >= 0
    and remaining_amount <= total_amount
  )
);

comment on table public.emis is 'Loan/installment: total, monthly EMI, outstanding remaining, next due date.';

create index emis_user_id_idx on public.emis (user_id);
create index emis_user_due_idx on public.emis (user_id, due_date);

alter table public.emis enable row level security;

create policy "emis_select_own"
  on public.emis
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "emis_insert_own"
  on public.emis
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "emis_update_own"
  on public.emis
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "emis_delete_own"
  on public.emis
  for delete
  to authenticated
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.emis to authenticated;

-- ---------------------------------------------------------------------------
-- 30. Schema: investments
-- ---------------------------------------------------------------------------

create table public.investments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  type text not null,
  current_value numeric(14, 2) not null default 0,
  note text not null default '',
  created_at timestamptz not null default now(),
  constraint investments_name_nonempty check (char_length(trim(name)) > 0),
  constraint investments_type_check check (
    type in ('stock', 'mutual_fund', 'fd', 'crypto', 'other')
  ),
  constraint investments_value_nonnegative check (current_value >= 0)
);

comment on table public.investments is 'Holdings: type + tracked current value.';

create index investments_user_id_idx on public.investments (user_id);

alter table public.investments enable row level security;

create policy "investments_select_own"
  on public.investments
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "investments_insert_own"
  on public.investments
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "investments_update_own"
  on public.investments
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "investments_delete_own"
  on public.investments
  for delete
  to authenticated
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.investments to authenticated;
