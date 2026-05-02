-- Phase 3 — Analytics (server-side aggregation)
-- RPCs run as SECURITY INVOKER with auth.uid() filters (RLS on expenses also applies).

-- ---------------------------------------------------------------------------
-- 18. Category aggregation: group expenses by category, sum amounts
-- ---------------------------------------------------------------------------

create or replace function public.expense_totals_by_category(
  p_from date default null,
  p_to date default null
)
returns table (
  category_id uuid,
  category_name text,
  total_amount numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    e.category_id,
    c.name as category_name,
    sum(e.amount)::numeric as total_amount
  from public.expenses e
  inner join public.categories c
    on c.id = e.category_id
    and c.user_id = auth.uid()
  where e.user_id = auth.uid()
    and (p_from is null or e.date >= p_from)
    and (p_to is null or e.date <= p_to)
  group by e.category_id, c.name
  order by total_amount desc nulls last;
$$;

comment on function public.expense_totals_by_category(date, date) is
  'Returns summed expense amounts per category for the authenticated user.';

-- ---------------------------------------------------------------------------
-- 19. Monthly expense trends (calendar months)
-- ---------------------------------------------------------------------------

create or replace function public.monthly_expense_trends(p_months int default 12)
returns table (
  year int,
  month int,
  total_amount numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  with params as (
    select greatest(1, least(coalesce(p_months, 12), 60))::int as n
  ),
  bounds as (
    select
      (
        date_trunc('month', (current_date)::timestamp)
        - ((select n from params) - 1) * interval '1 month'
      )::date as start_m,
      date_trunc('month', (current_date)::timestamp)::date as end_m
    from params
  ),
  months as (
    select generate_series(b.start_m, b.end_m, interval '1 month')::date as period_start
    from bounds b
  )
  select
    extract(year from m.period_start)::int as year,
    extract(month from m.period_start)::int as month,
    coalesce(
      (
        select sum(e.amount)::numeric
        from public.expenses e
        where e.user_id = auth.uid()
          and date_trunc('month', e.date::timestamp)
            = date_trunc('month', m.period_start)
      ),
      0
    ) as total_amount
  from months m
  order by m.period_start;
$$;

comment on function public.monthly_expense_trends(integer) is
  'Returns total expenses per calendar month for the authenticated user (last N months, max 60).';

grant execute on function public.expense_totals_by_category(date, date) to authenticated;
grant execute on function public.monthly_expense_trends(integer) to authenticated;
