-- Phase 7 — Recurring expenses (frequency + next_date) + trips linked to expenses
--
-- Works without `public.accounts` (Phase 4): recurring.account_id is a plain UUID;
-- expense RLS uses stricter account checks only when `accounts` exists.

-- ---------------------------------------------------------------------------
-- 34. Schema: trips
-- ---------------------------------------------------------------------------

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  start_date date not null,
  end_date date,
  note text not null default '',
  created_at timestamptz not null default now(),
  constraint trips_name_nonempty check (char_length(trim(name)) > 0),
  constraint trips_end_on_or_after_start check (
    end_date is null or end_date >= start_date
  )
);

comment on table public.trips is 'Trip / event grouping; expenses may reference trip_id.';

create index trips_user_id_idx on public.trips (user_id);
create index trips_user_start_idx on public.trips (user_id, start_date desc);

alter table public.trips enable row level security;

create policy "trips_select_own"
  on public.trips
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "trips_insert_own"
  on public.trips
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "trips_update_own"
  on public.trips
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "trips_delete_own"
  on public.trips
  for delete
  to authenticated
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.trips to authenticated;

-- ---------------------------------------------------------------------------
-- Link expenses → trips
-- ---------------------------------------------------------------------------

alter table public.expenses
  add column trip_id uuid references public.trips (id) on delete set null;

create index expenses_trip_id_idx on public.expenses (trip_id);

-- ---------------------------------------------------------------------------
-- 32. Schema: recurring_expenses
-- ---------------------------------------------------------------------------

create table public.recurring_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  label text not null,
  amount numeric(14, 2) not null,
  category_id uuid not null references public.categories (id) on delete restrict,
  account_id uuid,
  frequency text not null,
  next_date date not null,
  note text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint recurring_expenses_label_nonempty check (char_length(trim(label)) > 0),
  constraint recurring_expenses_amount_positive check (amount > 0),
  constraint recurring_expenses_frequency_check check (
    frequency in ('daily', 'weekly', 'monthly', 'yearly')
  )
);

comment on table public.recurring_expenses is 'Client-side scheduler advances next_date and inserts matching expenses when due.';

create index recurring_expenses_user_id_idx on public.recurring_expenses (user_id);
create index recurring_expenses_user_next_idx on public.recurring_expenses (user_id, next_date);

alter table public.recurring_expenses enable row level security;

create policy "recurring_expenses_select_own"
  on public.recurring_expenses
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "recurring_expenses_insert_own"
  on public.recurring_expenses
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

create policy "recurring_expenses_update_own"
  on public.recurring_expenses
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

create policy "recurring_expenses_delete_own"
  on public.recurring_expenses
  for delete
  to authenticated
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.recurring_expenses to authenticated;

-- Optional FK to accounts when Phase 4 has been applied
do $$
begin
  if to_regclass('public.accounts') is not null then
    alter table public.recurring_expenses
      add constraint recurring_expenses_account_id_fkey
      foreign key (account_id) references public.accounts (id) on delete set null;
  end if;
exception
  when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Expenses RLS: optional trip (+ optional account when accounts table exists)
-- ---------------------------------------------------------------------------

drop policy if exists "expenses_insert_own" on public.expenses;
drop policy if exists "expenses_update_own" on public.expenses;

do $$
begin
  if to_regclass('public.accounts') is not null then
    execute $ins$
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
        and (
          account_id is null
          or exists (
            select 1
            from public.accounts a
            where a.id = account_id
              and a.user_id = auth.uid()
          )
        )
        and (
          trip_id is null
          or exists (
            select 1
            from public.trips t
            where t.id = trip_id
              and t.user_id = auth.uid()
          )
        )
      );
    $ins$;

    execute $upd$
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
        and (
          account_id is null
          or exists (
            select 1
            from public.accounts a
            where a.id = account_id
              and a.user_id = auth.uid()
          )
        )
        and (
          trip_id is null
          or exists (
            select 1
            from public.trips t
            where t.id = trip_id
              and t.user_id = auth.uid()
          )
        )
      );
    $upd$;
  else
    execute $ins$
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
        and (
          trip_id is null
          or exists (
            select 1
            from public.trips t
            where t.id = trip_id
              and t.user_id = auth.uid()
          )
        )
      );
    $ins$;

    execute $upd$
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
        and (
          trip_id is null
          or exists (
            select 1
            from public.trips t
            where t.id = trip_id
              and t.user_id = auth.uid()
          )
        )
      );
    $upd$;
  end if;
end $$;
