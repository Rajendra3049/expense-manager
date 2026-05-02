-- Phase 5 — Borrow / Lend: debts with type (give/take) and status (active/settled)

-- ---------------------------------------------------------------------------
-- 25. Schema: debts
-- ---------------------------------------------------------------------------

create table public.debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  counterparty text not null,
  type text not null,
  status text not null default 'active',
  amount numeric(14, 2) not null,
  note text not null default '',
  settled_at timestamptz,
  created_at timestamptz not null default now(),
  constraint debts_type_check check (type in ('give', 'take')),
  constraint debts_status_check check (status in ('active', 'settled')),
  constraint debts_counterparty_nonempty check (char_length(trim(counterparty)) > 0),
  constraint debts_amount_positive check (amount > 0),
  constraint debts_settled_has_timestamp check (
    status <> 'settled' or settled_at is not null
  )
);

comment on table public.debts is 'Borrow/lend: give = you lent money; take = you borrowed. settled_at set when status becomes settled.';

create index debts_user_id_idx on public.debts (user_id);
create index debts_user_status_idx on public.debts (user_id, status);

-- ---------------------------------------------------------------------------
-- RLS: debts
-- ---------------------------------------------------------------------------

alter table public.debts enable row level security;

create policy "debts_select_own"
  on public.debts
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "debts_insert_own"
  on public.debts
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "debts_update_own"
  on public.debts
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "debts_delete_own"
  on public.debts
  for delete
  to authenticated
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.debts to authenticated;
