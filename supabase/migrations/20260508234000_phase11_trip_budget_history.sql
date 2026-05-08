-- Phase 11 — Trip budgets and per-trip budget adjustment history

alter table public.trips
  add column if not exists budget numeric(14, 2) not null default 0,
  add column if not exists updated_at timestamptz not null default now(),
  add constraint trips_budget_nonnegative check (budget >= 0);

create table if not exists public.trip_budget_adjustments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  trip_id uuid not null references public.trips (id) on delete cascade,
  trip_name_snapshot text not null,
  direction text not null,
  amount numeric(14, 2) not null,
  note text,
  effective_date date not null default current_date,
  created_at timestamptz not null default now(),
  constraint trip_budget_adjustments_direction_check check (direction in ('credit', 'debit')),
  constraint trip_budget_adjustments_amount_positive check (amount > 0),
  constraint trip_budget_adjustments_note_length check (note is null or char_length(note) <= 2000)
);

create index if not exists trip_budget_adjustments_user_idx
  on public.trip_budget_adjustments (user_id);

create index if not exists trip_budget_adjustments_trip_date_idx
  on public.trip_budget_adjustments (trip_id, effective_date desc, created_at desc);

create or replace function public.set_trips_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trips_set_updated_at on public.trips;
create trigger trips_set_updated_at
before update on public.trips
for each row
execute function public.set_trips_updated_at();

create or replace function public.recalculate_trip_budget(p_trip_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_budget numeric(14, 2);
begin
  select coalesce(
    sum(
      case
        when direction = 'credit' then amount
        else -amount
      end
    ),
    0
  )
  into v_budget
  from public.trip_budget_adjustments
  where trip_id = p_trip_id;

  if v_budget < 0 then
    raise exception 'Trip budget cannot be negative.';
  end if;

  update public.trips
  set budget = v_budget
  where id = p_trip_id;
end;
$$;

create or replace function public.handle_trip_budget_adjustment_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_trip_id uuid;
  v_old_trip_id uuid;
begin
  v_new_trip_id := case when tg_op <> 'DELETE' then new.trip_id else null end;
  v_old_trip_id := case when tg_op <> 'INSERT' then old.trip_id else null end;

  if v_new_trip_id is not null then
    perform public.recalculate_trip_budget(v_new_trip_id);
  end if;
  if v_old_trip_id is not null and v_old_trip_id <> v_new_trip_id then
    perform public.recalculate_trip_budget(v_old_trip_id);
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trip_budget_adjustments_after_insert on public.trip_budget_adjustments;
create trigger trip_budget_adjustments_after_insert
after insert on public.trip_budget_adjustments
for each row
execute function public.handle_trip_budget_adjustment_change();

drop trigger if exists trip_budget_adjustments_after_update on public.trip_budget_adjustments;
create trigger trip_budget_adjustments_after_update
after update on public.trip_budget_adjustments
for each row
execute function public.handle_trip_budget_adjustment_change();

drop trigger if exists trip_budget_adjustments_after_delete on public.trip_budget_adjustments;
create trigger trip_budget_adjustments_after_delete
after delete on public.trip_budget_adjustments
for each row
execute function public.handle_trip_budget_adjustment_change();

alter table public.trip_budget_adjustments enable row level security;

drop policy if exists "trip_budget_adjustments_select_own" on public.trip_budget_adjustments;
create policy "trip_budget_adjustments_select_own"
  on public.trip_budget_adjustments
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "trip_budget_adjustments_insert_own" on public.trip_budget_adjustments;
create policy "trip_budget_adjustments_insert_own"
  on public.trip_budget_adjustments
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.trips t
      where t.id = trip_id
        and t.user_id = auth.uid()
    )
  );

drop policy if exists "trip_budget_adjustments_update_own" on public.trip_budget_adjustments;
create policy "trip_budget_adjustments_update_own"
  on public.trip_budget_adjustments
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.trips t
      where t.id = trip_id
        and t.user_id = auth.uid()
    )
  );

drop policy if exists "trip_budget_adjustments_delete_own" on public.trip_budget_adjustments;
create policy "trip_budget_adjustments_delete_own"
  on public.trip_budget_adjustments
  for delete
  to authenticated
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.trip_budget_adjustments to authenticated;
