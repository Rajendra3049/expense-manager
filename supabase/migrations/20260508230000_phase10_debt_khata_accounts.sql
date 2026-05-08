-- Phase 10 — Debt khata accounts with per-entry history and due dates

-- ---------------------------------------------------------------------------
-- 1. Schema: debt_accounts + debt_account_entries
-- ---------------------------------------------------------------------------

create table public.debt_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  type text not null,
  due_date date,
  note text not null default '',
  balance numeric(14, 2) not null default 0,
  is_settled boolean not null default false,
  settled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint debt_accounts_type_check check (type in ('given', 'taken')),
  constraint debt_accounts_name_nonempty check (char_length(trim(name)) > 0),
  constraint debt_accounts_balance_nonnegative check (balance >= 0),
  constraint debt_accounts_settled_has_timestamp check (
    not is_settled or settled_at is not null
  )
);

create unique index debt_accounts_user_name_ci_unique
  on public.debt_accounts (user_id, lower(trim(name)));

create index debt_accounts_user_settled_idx
  on public.debt_accounts (user_id, is_settled);

create index debt_accounts_user_due_date_idx
  on public.debt_accounts (user_id, due_date);

create table public.debt_account_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  debt_account_id uuid not null references public.debt_accounts (id) on delete cascade,
  entry_type text not null,
  amount numeric(14, 2) not null,
  note text not null default '',
  happened_on date not null default current_date,
  created_at timestamptz not null default now(),
  constraint debt_account_entries_type_check check (entry_type in ('borrow', 'payment')),
  constraint debt_account_entries_amount_positive check (amount > 0),
  constraint debt_account_entries_note_length check (char_length(note) <= 2000)
);

create index debt_account_entries_user_id_idx
  on public.debt_account_entries (user_id);

create index debt_account_entries_account_date_idx
  on public.debt_account_entries (debt_account_id, happened_on desc, created_at desc);

-- ---------------------------------------------------------------------------
-- 2. Triggers: updated_at + balance maintenance
-- ---------------------------------------------------------------------------

create or replace function public.set_debt_accounts_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger debt_accounts_set_updated_at
before update on public.debt_accounts
for each row
execute function public.set_debt_accounts_updated_at();

create or replace function public.recalculate_debt_account_balance(p_account_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance numeric(14, 2);
begin
  select coalesce(
    sum(
      case
        when entry_type = 'borrow' then amount
        else -amount
      end
    ),
    0
  )
  into v_balance
  from public.debt_account_entries
  where debt_account_id = p_account_id;

  if v_balance < 0 then
    raise exception 'Debt account balance cannot be negative.';
  end if;

  update public.debt_accounts
  set
    balance = v_balance,
    is_settled = case when v_balance = 0 then is_settled else false end,
    settled_at = case
      when v_balance = 0 then settled_at
      else null
    end
  where id = p_account_id;
end;
$$;

create or replace function public.handle_debt_entry_balance_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_account_id uuid;
  v_old_account_id uuid;
begin
  v_new_account_id := case when tg_op <> 'DELETE' then new.debt_account_id else null end;
  v_old_account_id := case when tg_op <> 'INSERT' then old.debt_account_id else null end;

  if v_new_account_id is not null then
    perform public.recalculate_debt_account_balance(v_new_account_id);
  end if;
  if v_old_account_id is not null and v_old_account_id <> v_new_account_id then
    perform public.recalculate_debt_account_balance(v_old_account_id);
  end if;

  return coalesce(new, old);
end;
$$;

create trigger debt_entries_balance_after_insert
after insert on public.debt_account_entries
for each row
execute function public.handle_debt_entry_balance_update();

create trigger debt_entries_balance_after_update
after update on public.debt_account_entries
for each row
execute function public.handle_debt_entry_balance_update();

create trigger debt_entries_balance_after_delete
after delete on public.debt_account_entries
for each row
execute function public.handle_debt_entry_balance_update();

-- ---------------------------------------------------------------------------
-- 3. RLS
-- ---------------------------------------------------------------------------

alter table public.debt_accounts enable row level security;
alter table public.debt_account_entries enable row level security;

create policy "debt_accounts_select_own"
  on public.debt_accounts
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "debt_accounts_insert_own"
  on public.debt_accounts
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "debt_accounts_update_own"
  on public.debt_accounts
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "debt_accounts_delete_own"
  on public.debt_accounts
  for delete
  to authenticated
  using (auth.uid() = user_id);

create policy "debt_entries_select_own"
  on public.debt_account_entries
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "debt_entries_insert_own"
  on public.debt_account_entries
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.debt_accounts a
      where a.id = debt_account_id
        and a.user_id = auth.uid()
    )
  );

create policy "debt_entries_update_own"
  on public.debt_account_entries
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.debt_accounts a
      where a.id = debt_account_id
        and a.user_id = auth.uid()
    )
  );

create policy "debt_entries_delete_own"
  on public.debt_account_entries
  for delete
  to authenticated
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.debt_accounts to authenticated;
grant select, insert, update, delete on public.debt_account_entries to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Backfill from legacy debts table
-- ---------------------------------------------------------------------------

insert into public.debt_accounts (
  user_id,
  name,
  type,
  due_date,
  note,
  balance,
  is_settled,
  settled_at,
  created_at,
  updated_at
)
select
  d.user_id,
  concat(
    trim(d.counterparty),
    case when d.type = 'give' then ' (Given)' else ' (Taken)' end
  ) as name,
  case when d.type = 'give' then 'given' else 'taken' end as type,
  null::date,
  coalesce(
    nullif(
      string_agg(
        nullif(trim(d.note), ''),
        ' | ' order by d.created_at
      ),
      ''
    ),
    ''
  ) as note,
  sum(case when d.status = 'settled' then 0 else d.amount end) as balance,
  sum(case when d.status = 'active' then 1 else 0 end) = 0 as is_settled,
  max(d.settled_at) as settled_at,
  min(d.created_at) as created_at,
  now()
from public.debts d
where not exists (
  select 1
  from public.debt_accounts da
  where da.user_id = d.user_id
    and lower(trim(da.name)) = lower(
      concat(
        trim(d.counterparty),
        case when d.type = 'give' then ' (Given)' else ' (Taken)' end
      )
    )
)
group by
  d.user_id,
  d.counterparty,
  d.type;

insert into public.debt_account_entries (
  user_id,
  debt_account_id,
  entry_type,
  amount,
  note,
  happened_on,
  created_at
)
select
  d.user_id,
  da.id as debt_account_id,
  'borrow'::text,
  d.amount,
  case
    when d.note = '' then 'Migrated opening debt'
    else d.note
  end,
  (d.created_at at time zone 'utc')::date,
  d.created_at
from public.debts d
join public.debt_accounts da
  on da.user_id = d.user_id
 and lower(trim(da.name)) = lower(
   concat(
     trim(d.counterparty),
     case when d.type = 'give' then ' (Given)' else ' (Taken)' end
   )
 )
where d.amount > 0;
