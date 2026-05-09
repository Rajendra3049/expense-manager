-- 1) Optional cash account on debt ledger rows (movement through your wallet/bank).
--    Skips balance change when source_expense_id is set (expense trigger already moved cash).
-- 2) EMI: advance next due date when principal still owed after a linked expense payment.
-- 3) Expenses: require account_id when public.accounts exists (single source of truth for cash).

-- ---------------------------------------------------------------------------
-- 1. debt_account_entries.account_id
-- ---------------------------------------------------------------------------

alter table public.debt_account_entries
  add column account_id uuid references public.accounts (id) on delete set null;

comment on column public.debt_account_entries.account_id is
  'Cash/bank/wallet account affected by this ledger row; null for legacy rows or rows created from an expense.';

create index debt_account_entries_account_id_idx
  on public.debt_account_entries (account_id);

-- ---------------------------------------------------------------------------
-- 2. Cash balance: apply / revert debt entry (not for expense-sourced rows)
-- ---------------------------------------------------------------------------

create or replace function public.apply_debt_entry_to_cash_account()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_debt_type text;
  v_delta numeric(14, 2);
begin
  if new.account_id is null or new.source_expense_id is not null then
    return new;
  end if;

  select da.type
  into v_debt_type
  from public.debt_accounts da
  where da.id = new.debt_account_id;

  if v_debt_type is null then
    raise exception 'Debt account not found for entry';
  end if;

  if v_debt_type = 'taken' then
    if new.entry_type = 'borrow' then
      v_delta := new.amount;
    else
      v_delta := -new.amount;
    end if;
  else
    if new.entry_type = 'borrow' then
      v_delta := -new.amount;
    else
      v_delta := new.amount;
    end if;
  end if;

  update public.accounts
  set balance = balance + v_delta
  where id = new.account_id
    and user_id = new.user_id;

  return new;
end;
$$;

create or replace function public.revert_debt_entry_from_cash_account()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_debt_type text;
  v_delta numeric(14, 2);
begin
  if old.account_id is null or old.source_expense_id is not null then
    return old;
  end if;

  select da.type
  into v_debt_type
  from public.debt_accounts da
  where da.id = old.debt_account_id;

  if v_debt_type is null then
    return old;
  end if;

  if v_debt_type = 'taken' then
    if old.entry_type = 'borrow' then
      v_delta := old.amount;
    else
      v_delta := -old.amount;
    end if;
  else
    if old.entry_type = 'borrow' then
      v_delta := -old.amount;
    else
      v_delta := old.amount;
    end if;
  end if;

  update public.accounts
  set balance = balance - v_delta
  where id = old.account_id
    and user_id = old.user_id;

  return old;
end;
$$;

drop trigger if exists debt_entries_apply_cash_account on public.debt_account_entries;
create trigger debt_entries_apply_cash_account
  after insert on public.debt_account_entries
  for each row
  execute function public.apply_debt_entry_to_cash_account();

drop trigger if exists debt_entries_revert_cash_account on public.debt_account_entries;
create trigger debt_entries_revert_cash_account
  after delete on public.debt_account_entries
  for each row
  execute function public.revert_debt_entry_from_cash_account();

-- ---------------------------------------------------------------------------
-- 3. Expense entity links: EMI due date advances when principal remains
-- ---------------------------------------------------------------------------

create or replace function public.apply_expense_entity_links_after_insert()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_rem numeric(14, 2);
  v_due date;
  v_applied numeric(14, 2);
begin
  if new.emi_id is not null then
    select e.remaining_amount, e.due_date
    into v_rem, v_due
    from public.emis e
    where e.id = new.emi_id
    for update;

    if v_rem is null then
      raise exception 'EMI not found for expense link';
    end if;

    v_applied := least(new.amount, greatest(v_rem, 0));
    update public.emis
    set
      remaining_amount = remaining_amount - v_applied,
      due_date = case
        when (v_rem - v_applied) > 0 then (v_due + interval '1 month')::date
        else v_due
      end
    where id = new.emi_id;

    update public.expenses
    set emi_reduction_applied = v_applied
    where id = new.id;
  end if;

  if new.investment_id is not null then
    update public.investments
    set current_value = current_value + new.amount
    where id = new.investment_id;
  end if;

  if new.debt_account_id is not null then
    insert into public.debt_account_entries (
      user_id,
      debt_account_id,
      entry_type,
      amount,
      note,
      happened_on,
      source_expense_id
    )
    values (
      new.user_id,
      new.debt_account_id,
      'payment',
      new.amount,
      case
        when trim(coalesce(new.note, '')) = '' then 'Payment recorded from expense'
        else trim(new.note)
      end,
      new.date,
      new.id
    );
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. RLS: debt entries — optional account must belong to user
-- ---------------------------------------------------------------------------

drop policy if exists "debt_entries_insert_own" on public.debt_account_entries;
drop policy if exists "debt_entries_update_own" on public.debt_account_entries;

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
    and (
      account_id is null
      or exists (
        select 1
        from public.accounts ac
        where ac.id = account_id
          and ac.user_id = auth.uid()
      )
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
    and (
      account_id is null
      or exists (
        select 1
        from public.accounts ac
        where ac.id = account_id
          and ac.user_id = auth.uid()
      )
    )
  );

-- ---------------------------------------------------------------------------
-- 5. Expenses: require account_id when accounts table exists
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
        and account_id is not null
        and exists (
          select 1
          from public.accounts a
          where a.id = account_id
            and a.user_id = auth.uid()
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
        and (
          emi_id is null
          or exists (
            select 1
            from public.emis e
            where e.id = emi_id
              and e.user_id = auth.uid()
          )
        )
        and (
          investment_id is null
          or exists (
            select 1
            from public.investments i
            where i.id = investment_id
              and i.user_id = auth.uid()
          )
        )
        and (
          debt_account_id is null
          or exists (
            select 1
            from public.debt_accounts d
            where d.id = debt_account_id
              and d.user_id = auth.uid()
          )
        )
        and (
          (
            case when trip_id is not null then 1 else 0 end
            + case when emi_id is not null then 1 else 0 end
            + case when investment_id is not null then 1 else 0 end
            + case when debt_account_id is not null then 1 else 0 end
          ) <= 1
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
        and account_id is not null
        and exists (
          select 1
          from public.accounts a
          where a.id = account_id
            and a.user_id = auth.uid()
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
        and (
          emi_id is null
          or exists (
            select 1
            from public.emis e
            where e.id = emi_id
              and e.user_id = auth.uid()
          )
        )
        and (
          investment_id is null
          or exists (
            select 1
            from public.investments i
            where i.id = investment_id
              and i.user_id = auth.uid()
          )
        )
        and (
          debt_account_id is null
          or exists (
            select 1
            from public.debt_accounts d
            where d.id = debt_account_id
              and d.user_id = auth.uid()
          )
        )
        and (
          (
            case when trip_id is not null then 1 else 0 end
            + case when emi_id is not null then 1 else 0 end
            + case when investment_id is not null then 1 else 0 end
            + case when debt_account_id is not null then 1 else 0 end
          ) <= 1
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
        and (
          emi_id is null
          or exists (
            select 1
            from public.emis e
            where e.id = emi_id
              and e.user_id = auth.uid()
          )
        )
        and (
          investment_id is null
          or exists (
            select 1
            from public.investments i
            where i.id = investment_id
              and i.user_id = auth.uid()
          )
        )
        and (
          debt_account_id is null
          or exists (
            select 1
            from public.debt_accounts d
            where d.id = debt_account_id
              and d.user_id = auth.uid()
          )
        )
        and (
          (
            case when trip_id is not null then 1 else 0 end
            + case when emi_id is not null then 1 else 0 end
            + case when investment_id is not null then 1 else 0 end
            + case when debt_account_id is not null then 1 else 0 end
          ) <= 1
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
        and (
          emi_id is null
          or exists (
            select 1
            from public.emis e
            where e.id = emi_id
              and e.user_id = auth.uid()
          )
        )
        and (
          investment_id is null
          or exists (
            select 1
            from public.investments i
            where i.id = investment_id
              and i.user_id = auth.uid()
          )
        )
        and (
          debt_account_id is null
          or exists (
            select 1
            from public.debt_accounts d
            where d.id = debt_account_id
              and d.user_id = auth.uid()
          )
        )
        and (
          (
            case when trip_id is not null then 1 else 0 end
            + case when emi_id is not null then 1 else 0 end
            + case when investment_id is not null then 1 else 0 end
            + case when debt_account_id is not null then 1 else 0 end
          ) <= 1
        )
      );
    $upd$;
  end if;
end $$;
