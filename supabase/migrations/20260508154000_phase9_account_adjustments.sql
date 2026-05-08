-- Phase 9 — Account credit/debit adjustments + monthly recurring rules

-- ---------------------------------------------------------------------------
-- 40. Accounts uniqueness (case-insensitive by user)
-- ---------------------------------------------------------------------------

update public.accounts
set name = trim(name)
where name <> trim(name);

with ranked as (
  select
    id,
    row_number() over (
      partition by user_id, lower(trim(name))
      order by created_at asc, id asc
    ) as rn
  from public.accounts
)
update public.accounts a
set name = left(trim(a.name), 100) || ' #' || left(a.id::text, 8)
from ranked r
where a.id = r.id
  and r.rn > 1;

create unique index if not exists accounts_user_name_ci_uniq
  on public.accounts (user_id, lower(trim(name)));

-- ---------------------------------------------------------------------------
-- 41. Account adjustments ledger (credit/debit)
-- ---------------------------------------------------------------------------

create table if not exists public.account_adjustments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  account_id uuid references public.accounts (id) on delete set null,
  account_name_snapshot text not null,
  direction text not null,
  amount numeric(14, 2) not null,
  note text,
  effective_date date not null default current_date,
  created_at timestamptz not null default now(),
  constraint account_adjustments_direction_check check (direction in ('credit', 'debit')),
  constraint account_adjustments_amount_positive_check check (amount > 0),
  constraint account_adjustments_name_nonempty check (char_length(trim(account_name_snapshot)) > 0)
);

comment on table public.account_adjustments is 'Manual or automated account balance adjustments.';

create index if not exists account_adjustments_user_date_idx
  on public.account_adjustments (user_id, effective_date desc);

create index if not exists account_adjustments_account_idx
  on public.account_adjustments (account_id);

alter table public.account_adjustments enable row level security;

drop policy if exists "account_adjustments_select_own" on public.account_adjustments;
create policy "account_adjustments_select_own"
  on public.account_adjustments
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "account_adjustments_insert_own" on public.account_adjustments;
create policy "account_adjustments_insert_own"
  on public.account_adjustments
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and (
      account_id is null
      or exists (
        select 1
        from public.accounts a
        where a.id = account_id
          and a.user_id = auth.uid()
      )
    )
  );

grant select, insert on public.account_adjustments to authenticated;

-- ---------------------------------------------------------------------------
-- 42. Apply account adjustment to account balance
-- ---------------------------------------------------------------------------

create or replace function public.apply_account_adjustment_to_balance()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.account_id is not null then
    update public.accounts
    set balance = case
      when new.direction = 'credit' then balance + new.amount
      when new.direction = 'debit' then balance - new.amount
      else balance
    end
    where id = new.account_id
      and user_id = new.user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists account_adjustments_apply_balance on public.account_adjustments;
create trigger account_adjustments_apply_balance
  after insert on public.account_adjustments
  for each row
  execute function public.apply_account_adjustment_to_balance();

-- ---------------------------------------------------------------------------
-- 43. Recurring monthly account adjustments
-- ---------------------------------------------------------------------------

create table if not exists public.recurring_account_adjustments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  account_id uuid not null references public.accounts (id) on delete cascade,
  direction text not null,
  amount numeric(14, 2) not null,
  day_of_month int not null,
  note text,
  is_active boolean not null default true,
  last_applied_on date,
  created_at timestamptz not null default now(),
  constraint recurring_account_adjustments_direction_check check (direction in ('credit', 'debit')),
  constraint recurring_account_adjustments_amount_positive_check check (amount > 0),
  constraint recurring_account_adjustments_day_check check (day_of_month between 1 and 28)
);

comment on table public.recurring_account_adjustments is 'Monthly recurring credits/debits applied to accounts.';

create index if not exists recurring_account_adjustments_user_active_idx
  on public.recurring_account_adjustments (user_id, is_active);

alter table public.recurring_account_adjustments enable row level security;

drop policy if exists "recurring_account_adjustments_select_own" on public.recurring_account_adjustments;
create policy "recurring_account_adjustments_select_own"
  on public.recurring_account_adjustments
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "recurring_account_adjustments_insert_own" on public.recurring_account_adjustments;
create policy "recurring_account_adjustments_insert_own"
  on public.recurring_account_adjustments
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.accounts a
      where a.id = account_id
        and a.user_id = auth.uid()
    )
  );

drop policy if exists "recurring_account_adjustments_update_own" on public.recurring_account_adjustments;
create policy "recurring_account_adjustments_update_own"
  on public.recurring_account_adjustments
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.accounts a
      where a.id = account_id
        and a.user_id = auth.uid()
    )
  );

drop policy if exists "recurring_account_adjustments_delete_own" on public.recurring_account_adjustments;
create policy "recurring_account_adjustments_delete_own"
  on public.recurring_account_adjustments
  for delete
  to authenticated
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.recurring_account_adjustments to authenticated;

-- ---------------------------------------------------------------------------
-- 44. Process due recurring account adjustments
-- ---------------------------------------------------------------------------

create or replace function public.process_due_recurring_account_adjustments()
returns table (processed_count int)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_today date := current_date;
  v_processed int := 0;
  r record;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  for r in
    select
      ra.id,
      ra.account_id,
      ra.direction,
      ra.amount,
      ra.note,
      ra.day_of_month,
      a.name as account_name
    from public.recurring_account_adjustments ra
    join public.accounts a
      on a.id = ra.account_id
      and a.user_id = v_user_id
    where ra.user_id = v_user_id
      and ra.is_active = true
      and extract(day from v_today)::int >= ra.day_of_month
      and (
        ra.last_applied_on is null
        or date_trunc('month', ra.last_applied_on)::date <> date_trunc('month', v_today)::date
      )
  loop
    insert into public.account_adjustments (
      user_id,
      account_id,
      account_name_snapshot,
      direction,
      amount,
      note,
      effective_date
    )
    values (
      v_user_id,
      r.account_id,
      r.account_name,
      r.direction,
      r.amount,
      coalesce(r.note, 'Recurring monthly adjustment'),
      v_today
    );

    update public.recurring_account_adjustments
    set last_applied_on = v_today
    where id = r.id
      and user_id = v_user_id;

    v_processed := v_processed + 1;
  end loop;

  return query select v_processed;
end;
$$;
