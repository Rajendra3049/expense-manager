-- Link expenses to at most one of: trip, EMI, investment, or debt account.
-- Side effects (after insert): reduce EMI remaining, increase investment current_value,
-- insert debt_account_entries payment. Revert EMI/investment on delete; debt entry cascades.

-- ---------------------------------------------------------------------------
-- 1. debt_account_entries: tie auto-created payments to source expense
-- ---------------------------------------------------------------------------

alter table public.debt_account_entries
  add column source_expense_id uuid references public.expenses (id) on delete cascade;

comment on column public.debt_account_entries.source_expense_id is
  'When set, this entry was created from an expense; deleting the expense removes this row.';

create unique index debt_account_entries_source_expense_id_key
  on public.debt_account_entries (source_expense_id)
  where source_expense_id is not null;

-- ---------------------------------------------------------------------------
-- 2. expenses: optional FKs + stored EMI principal applied (for delete revert)
-- ---------------------------------------------------------------------------

alter table public.expenses
  add column emi_id uuid references public.emis (id) on delete set null;

alter table public.expenses
  add column investment_id uuid references public.investments (id) on delete set null;

alter table public.expenses
  add column debt_account_id uuid references public.debt_accounts (id) on delete set null;

alter table public.expenses
  add column emi_reduction_applied numeric(14, 2);

comment on column public.expenses.emi_reduction_applied is
  'Principal applied to EMI for this row; set by trigger after insert. Used to restore remaining on delete.';

create index expenses_emi_id_idx on public.expenses (emi_id);
create index expenses_investment_id_idx on public.expenses (investment_id);
create index expenses_debt_account_id_idx on public.expenses (debt_account_id);

alter table public.expenses
  add constraint expenses_at_most_one_entity_link check (
    (
      case when trip_id is not null then 1 else 0 end
      + case when emi_id is not null then 1 else 0 end
      + case when investment_id is not null then 1 else 0 end
      + case when debt_account_id is not null then 1 else 0 end
    ) <= 1
  );

alter table public.expenses
  add constraint expenses_emi_reduction_nonneg check (
    emi_reduction_applied is null
    or emi_reduction_applied >= 0
  );

-- ---------------------------------------------------------------------------
-- 3. Triggers: apply / revert linked-entity effects
-- ---------------------------------------------------------------------------

create or replace function public.apply_expense_entity_links_after_insert()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_rem numeric(14, 2);
  v_applied numeric(14, 2);
begin
  if new.emi_id is not null then
    select e.remaining_amount
    into v_rem
    from public.emis e
    where e.id = new.emi_id
    for update;

    if v_rem is null then
      raise exception 'EMI not found for expense link';
    end if;

    v_applied := least(new.amount, greatest(v_rem, 0));
    update public.emis
    set remaining_amount = remaining_amount - v_applied
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

create or replace function public.revert_expense_entity_links_after_delete()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_addback numeric(14, 2);
  v_cv numeric(14, 2);
begin
  if old.emi_id is not null then
    v_addback := coalesce(old.emi_reduction_applied, old.amount);
    update public.emis e
    set remaining_amount = least(
      e.total_amount,
      e.remaining_amount + v_addback
    )
    where e.id = old.emi_id;
  end if;

  if old.investment_id is not null then
    select i.current_value
    into v_cv
    from public.investments i
    where i.id = old.investment_id;

    if v_cv is not null then
      update public.investments
      set current_value = greatest(0::numeric(14, 2), v_cv - old.amount)
      where id = old.investment_id;
    end if;
  end if;

  -- Debt: source_expense_id FK cascades — entries removed automatically.
  return old;
end;
$$;

drop trigger if exists expenses_apply_entity_links on public.expenses;
create trigger expenses_apply_entity_links
  after insert on public.expenses
  for each row
  execute function public.apply_expense_entity_links_after_insert();

drop trigger if exists expenses_revert_entity_links on public.expenses;
create trigger expenses_revert_entity_links
  after delete on public.expenses
  for each row
  execute function public.revert_expense_entity_links_after_delete();

-- ---------------------------------------------------------------------------
-- 4. RLS: optional emi / investment / debt + at-most-one enforced in with check
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
