-- Phase 4 — Accounts (balance + type), link expenses to accounts, dynamic balance via triggers

-- ---------------------------------------------------------------------------
-- 21. Schema: accounts
-- ---------------------------------------------------------------------------

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  type text not null,
  balance numeric(14, 2) not null default 0,
  created_at timestamptz not null default now(),
  constraint accounts_type_check check (type in ('cash', 'bank', 'wallet')),
  constraint accounts_name_nonempty check (char_length(trim(name)) > 0)
);

comment on table public.accounts is 'Cash / bank / wallet balances; updated when expenses link to an account.';

create index accounts_user_id_idx on public.accounts (user_id);

alter table public.expenses
  add constraint expenses_account_id_fkey
  foreign key (account_id) references public.accounts (id)
  on delete set null;

create index expenses_account_id_idx on public.expenses (account_id);

-- ---------------------------------------------------------------------------
-- RLS: accounts
-- ---------------------------------------------------------------------------

alter table public.accounts enable row level security;

create policy "accounts_select_own"
  on public.accounts
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "accounts_insert_own"
  on public.accounts
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "accounts_update_own"
  on public.accounts
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "accounts_delete_own"
  on public.accounts
  for delete
  to authenticated
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.accounts to authenticated;

-- ---------------------------------------------------------------------------
-- Expense policies: optional account must belong to the same user
-- ---------------------------------------------------------------------------

drop policy if exists "expenses_insert_own" on public.expenses;
drop policy if exists "expenses_update_own" on public.expenses;

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

-- ---------------------------------------------------------------------------
-- 24. Balance: subtract on expense insert, add back on delete
-- ---------------------------------------------------------------------------

create or replace function public.apply_expense_to_account_balance()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.account_id is not null then
    update public.accounts
    set balance = balance - new.amount
    where id = new.account_id
      and user_id = new.user_id;
  end if;
  return new;
end;
$$;

create or replace function public.revert_expense_from_account_balance()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if old.account_id is not null then
    update public.accounts
    set balance = balance + old.amount
    where id = old.account_id
      and user_id = old.user_id;
  end if;
  return old;
end;
$$;

drop trigger if exists expenses_apply_account_balance on public.expenses;
create trigger expenses_apply_account_balance
  after insert on public.expenses
  for each row
  execute function public.apply_expense_to_account_balance();

drop trigger if exists expenses_revert_account_balance on public.expenses;
create trigger expenses_revert_account_balance
  after delete on public.expenses
  for each row
  execute function public.revert_expense_from_account_balance();
